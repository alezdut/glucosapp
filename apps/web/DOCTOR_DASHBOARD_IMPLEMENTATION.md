# Implementación del Dashboard Médico - Documentación Completa

## Fecha de Implementación

Noviembre 2024

## Resumen Ejecutivo

Esta documentación describe la implementación completa del dashboard médico para la aplicación web de GlucosApp. Se ha establecido una arquitectura completa que relaciona médicos con pacientes, incluyendo sistema de roles, gestión de citas, alertas y visualización de métricas agregadas.

## 1. Estructura de Base de Datos

### 1.1 Nuevos Enums

Se agregaron los siguientes enums al schema de Prisma:

#### `UserRole`

```prisma
enum UserRole {
  DOCTOR
  PATIENT
}
```

**Propósito**: Define el rol del usuario en el sistema.

- `DOCTOR`: Usuarios registrados desde la aplicación web (médicos)
- `PATIENT`: Usuarios registrados desde la aplicación móvil (pacientes)

#### `AlertSeverity`

```prisma
enum AlertSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

**Propósito**: Niveles de severidad para las alertas médicas.

#### `AlertType`

```prisma
enum AlertType {
  HYPOGLYCEMIA
  SEVERE_HYPOGLYCEMIA
  HYPERGLYCEMIA
  PERSISTENT_HYPERGLYCEMIA
  OTHER
}
```

**Propósito**: Tipos de alertas relacionadas con niveles de glucosa.

#### `AppointmentStatus`

```prisma
enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  COMPLETED
  CANCELLED
}
```

**Propósito**: Estados de las citas médicas.

### 1.2 Modificaciones al Modelo User

Se agregó el campo `role` al modelo `User`:

```prisma
role UserRole @default(PATIENT)
```

**Valor por defecto**: `PATIENT` para mantener compatibilidad con usuarios existentes.

**Relaciones agregadas**:

- `doctorRelations`: Relación muchos-a-muchos como médico
- `patientRelations`: Relación muchos-a-muchos como paciente
- `appointmentsAsDoctor`: Citas donde el usuario es el médico
- `appointmentsAsPatient`: Citas donde el usuario es el paciente
- `alerts`: Alertas generadas para el usuario

### 1.3 Nuevo Modelo: DoctorPatient

**Ubicación**: `apps/backend/prisma/schema.prisma`

```prisma
model DoctorPatient {
  id        String   @id @default(cuid())
  doctorId  String
  patientId String
  createdAt DateTime @default(now())
  doctor    User     @relation("Doctor", fields: [doctorId], references: [id], onDelete: Cascade)
  patient   User     @relation("Patient", fields: [patientId], references: [id], onDelete: Cascade)

  @@unique([doctorId, patientId])
  @@index([doctorId])
  @@index([patientId])
}
```

**Propósito**: Establece relaciones muchos-a-muchos entre médicos y pacientes.

- Un médico puede tener múltiples pacientes
- Un paciente puede tener múltiples médicos (flexibilidad futura)
- Constraint único previene duplicados

**Uso futuro**:

- Permite transferencia de pacientes entre médicos
- Soporta consultas con múltiples especialistas
- Facilita reportes de equipos médicos

### 1.4 Nuevo Modelo: Appointment

```prisma
model Appointment {
  id          String             @id @default(cuid())
  doctorId    String
  patientId   String
  scheduledAt DateTime
  notes       String?
  status      AppointmentStatus  @default(SCHEDULED)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  doctor      User               @relation("Doctor", fields: [doctorId], references: [id], onDelete: Cascade)
  patient     User               @relation("Patient", fields: [patientId], references: [id], onDelete: Cascade)

  @@index([doctorId])
  @@index([patientId])
  @@index([doctorId, scheduledAt])
  @@index([status])
}
```

**Propósito**: Gestiona las citas médicas entre doctores y pacientes.

**Campos importantes**:

- `scheduledAt`: Fecha y hora de la cita
- `notes`: Notas adicionales sobre la cita
- `status`: Estado actual de la cita

**Índices optimizados**:

- Consultas por médico y fecha
- Filtrado por estado
- Búsqueda de citas de un paciente

**Uso futuro**:

- Integración con calendarios
- Recordatorios automáticos
- Historial de visitas
- Reportes de seguimiento

### 1.5 Nuevo Modelo: Alert

```prisma
model Alert {
  id               String        @id @default(cuid())
  userId           String
  type             AlertType
  severity         AlertSeverity
  message          String
  glucoseReadingId String?
  acknowledged     Boolean       @default(false)
  acknowledgedAt   DateTime?
  createdAt        DateTime      @default(now())
  user             User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, acknowledged])
  @@index([severity])
  @@index([createdAt])
}
```

**Propósito**: Almacena alertas médicas generadas automáticamente o manualmente.

**Características**:

- Sistema de reconocimiento (`acknowledged`)
- Relación opcional con lectura de glucosa
- Índices para consultas eficientes

**Uso futuro**:

- Notificaciones push
- Dashboard de alertas en tiempo real
- Reportes de incidentes
- Análisis de patrones de alertas

### 1.6 Migración de Base de Datos

**Archivo**: `apps/backend/prisma/migrations/20251104231910_add_doctor_patient_structure/migration.sql`

**Cambios aplicados**:

1. Creación de todos los enums mencionados
2. Agregado campo `role` a tabla `User` con default `PATIENT`
3. Creación de tablas `DoctorPatient`, `Appointment`, `Alert`
4. Creación de índices y foreign keys

**Compatibilidad**:

- Los usuarios existentes mantienen su rol como `PATIENT`
- No se requieren cambios en datos existentes

## 2. Sistema de Autenticación y Roles

### 2.1 Asignación Automática de Rol

**Archivo modificado**: `apps/backend/src/modules/auth/dto/register.dto.ts`

Se agregó campo opcional `role` al DTO de registro:

```typescript
@ApiProperty({ example: "DOCTOR", enum: UserRole, required: false })
@IsOptional()
@IsEnum(UserRole)
role?: UserRole;
```

**Archivo modificado**: `apps/backend/src/modules/auth/services/auth.service.ts`

El servicio de autenticación ahora asigna el rol recibido o usa `PATIENT` por defecto:

```typescript
role: registerDto.role || "PATIENT", // Default to PATIENT if not specified (web sends DOCTOR)
```

**Archivo modificado**: `apps/web/src/lib/auth-api.ts`

La aplicación web automáticamente envía `role: "DOCTOR"` en el registro:

```typescript
export async function register(data: RegisterData): Promise<{ message: string }> {
  const response = await client.POST<{ message: string }>("/auth/register", {
    ...data,
    role: "DOCTOR", // Web app users are doctors by default
  });
  // ...
}
```

**Comportamiento**:

- **Aplicación Web**: Usuarios registrados automáticamente reciben rol `DOCTOR`
- **Aplicación Móvil**: Usuarios registrados reciben rol `PATIENT` (comportamiento por defecto)
- **Flexibilidad**: El backend acepta rol explícito si se proporciona

## 3. Servicios Compartidos

### 3.1 DoctorUtilsService

**Ubicación**: `apps/backend/src/common/services/doctor-utils.service.ts`

**Propósito**: Servicio global que proporciona utilidades compartidas para validación y consultas relacionadas con médicos.

**Métodos**:

#### `verifyDoctor(userId: string): Promise<void>`

```typescript
async verifyDoctor(userId: string): Promise<void> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== UserRole.DOCTOR) {
    throw new ForbiddenException("Only doctors can access this endpoint");
  }
}
```

**Uso**: Validación reutilizable en todos los endpoints que requieren rol de médico.

- Lanza `ForbiddenException` si el usuario no es médico
- Evita duplicación de código
- Centraliza la lógica de validación

#### `getDoctorPatientIds(doctorId: string): Promise<string[]>`

```typescript
async getDoctorPatientIds(doctorId: string): Promise<string[]> {
  const relations = await this.prisma.doctorPatient.findMany({
    where: { doctorId },
    select: { patientId: true },
  });
  return relations.map((r) => r.patientId);
}
```

**Uso**: Obtiene todos los IDs de pacientes asignados a un médico.

- Utilizado para consultas agregadas
- Optimizado con índice en `doctorId`
- Retorna array vacío si no hay pacientes

**Integración en CommonModule**:
El servicio está marcado como `@Global()` y exportado, por lo que está disponible en todos los módulos sin necesidad de importarlo explícitamente.

## 4. Módulos del Backend

### 4.1 Módulo Dashboard

**Ubicación**: `apps/backend/src/modules/dashboard/`

#### DashboardService

**Endpoints implementados**:

##### `GET /v1/dashboard/summary`

Retorna resumen general del dashboard:

```typescript
{
  activePatients: number; // Pacientes con actividad en últimos 30 días
  criticalAlerts: number; // Alertas críticas no reconocidas
  upcomingAppointments: number; // Citas en próximos 7 días
}
```

**Lógica de "Paciente Activo"**:
Un paciente se considera activo si tiene al menos una de las siguientes actividades en los últimos 30 días:

- Lecturas de glucosa (`glucoseReadings`)
- Dosis de insulina (`insulinDoses`)
- Registros de comidas (`meals`)

**Uso futuro**:

- Métricas de engagement
- Identificación de pacientes inactivos
- Segmentación de pacientes

##### `GET /v1/dashboard/glucose-evolution`

Retorna datos agregados de evolución de glucosa para gráficos:

```typescript
{
  data: [
    {
      date: string;           // Fecha en formato ISO
      averageGlucose: number;  // Promedio del día
      minGlucose: number;      // Mínimo del día
      maxGlucose: number;      // Máximo del día
    }
  ]
}
```

**Agregación**:

- Agrupa todas las lecturas de todos los pacientes del médico
- Calcula estadísticas diarias
- Retorna últimos 30 días por defecto

**Uso futuro**:

- Comparación entre pacientes
- Identificación de patrones
- Análisis de tendencias

##### `GET /v1/dashboard/insulin-stats?days=30`

Estadísticas de dosis de insulina:

```typescript
{
  averageDose: number; // Promedio de unidades/día
  unit: string; // "unidades/día"
  days: number; // Período analizado
  description: string; // Descripción legible
}
```

**Cálculo**:

- Suma todas las dosis de todos los pacientes
- Calcula promedio simple
- Maneja caso de cero dosis con mensaje descriptivo

##### `GET /v1/dashboard/meal-stats?days=30`

Estadísticas de comidas registradas:

```typescript
{
  totalMeals: number; // Total de comidas registradas
  unit: string; // "comidas"
  description: string; // Descripción legible
}
```

##### `GET /v1/dashboard/recent-alerts?limit=10`

Alertas recientes de pacientes del médico (últimas 24 horas).

#### DTOs

Todos los DTOs están documentados con Swagger y validados:

- `DashboardSummaryDto`
- `GlucoseEvolutionDto` con `GlucoseEvolutionPointDto`
- `InsulinStatsDto`
- `MealStatsDto`

### 4.2 Módulo Doctor-Patient

**Ubicación**: `apps/backend/src/modules/doctor-patient/`

#### Endpoints

##### `GET /v1/doctor-patients`

Lista todos los pacientes asignados al médico autenticado.

**Respuesta**:

```typescript
[
  {
    id: string;
    doctorId: string;
    patientId: string;
    createdAt: string;
    patient: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      createdAt: string;
    }
  }
]
```

##### `POST /v1/doctor-patients`

Asigna un paciente a un médico.

**Request**:

```typescript
{
  patientId: string;
}
```

**Validaciones**:

- Verifica que el paciente existe
- Verifica que el paciente tiene rol `PATIENT`
- Previene duplicados (relación ya existente)
- Solo médicos pueden realizar esta acción

**Uso futuro**:

- Invitación de pacientes por código
- Vinculación por QR
- Importación masiva

##### `DELETE /v1/doctor-patients/:patientId`

Remueve la relación médico-paciente.

**Comportamiento**:

- No elimina el usuario paciente
- Solo remueve la relación
- Las citas y alertas históricas se mantienen

### 4.3 Módulo Appointments

**Ubicación**: `apps/backend/src/modules/appointments/`

#### Endpoints

##### `GET /v1/appointments?includePast=false`

Lista todas las citas del médico.

**Query Parameters**:

- `includePast`: boolean (opcional, default: false)

**Respuesta**:

```typescript
[
  {
    id: string;
    doctorId: string;
    patientId: string;
    scheduledAt: string;      // ISO datetime
    notes?: string;
    status: AppointmentStatus;
    createdAt: string;
    updatedAt: string;
    patient: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    }
  }
]
```

##### `POST /v1/appointments`

Crea una nueva cita.

**Request**:

```typescript
{
  patientId: string;
  scheduledAt: string;  // ISO datetime
  notes?: string;
}
```

**Validaciones**:

- El paciente debe estar asignado al médico
- La fecha debe ser válida

**Uso futuro**:

- Integración con calendarios (Google Calendar, Outlook)
- Notificaciones de recordatorio
- Cancelación automática por inactividad

##### `PUT /v1/appointments/:id`

Actualiza una cita existente.

**Request**:

```typescript
{
  scheduledAt?: string;
  notes?: string;
  status?: AppointmentStatus;
}
```

**Validaciones**:

- Solo el médico dueño puede actualizar
- La cita debe existir

##### `DELETE /v1/appointments/:id`

Elimina una cita.

**Validaciones**:

- Solo el médico dueño puede eliminar
- La cita debe existir

### 4.4 Módulo Alerts

**Ubicación**: `apps/backend/src/modules/alerts/`

#### Endpoints

##### `GET /v1/alerts?limit=50`

Lista todas las alertas de pacientes del médico.

##### `GET /v1/alerts/critical`

Lista solo alertas críticas (no reconocidas, severity CRITICAL o HIGH).

##### `GET /v1/alerts/recent?limit=10`

Lista alertas recientes (últimas 24 horas).

##### `POST /v1/alerts/:id/acknowledge`

Marca una alerta como reconocida.

**Validaciones**:

- La alerta debe pertenecer a un paciente del médico
- Solo médicos pueden reconocer alertas

#### AlertsService - Detección Automática

**Método `detectAlert()`**:

```typescript
async detectAlert(userId: string, glucoseMgdl: number, glucoseReadingId?: string): Promise<void>
```

**Lógica de detección**:

1. **Hipoglucemia Severa** (< 70 mg/dL):
   - Tipo: `SEVERE_HYPOGLYCEMIA`
   - Severidad: `CRITICAL`
   - Mensaje: "Hipoglucemia severa: nivel de glucosa en X mg/dL. Requiere atención inmediata."

2. **Hipoglucemia** (70-80 mg/dL):
   - Tipo: `HYPOGLYCEMIA`
   - Severidad: `HIGH`
   - Mensaje: "Hipoglucemia: nivel de glucosa en X mg/dL."

3. **Hiperglucemia** (> 250 mg/dL):
   - Verifica persistencia (últimas 4 horas)
   - Si hay 2+ lecturas altas:
     - Tipo: `PERSISTENT_HYPERGLYCEMIA`
     - Severidad: `HIGH`
     - Mensaje: "Hiperglucemia persistente: nivel de glucosa > 250 mg/dL por más de 4 horas. Revisar medicación."
   - Si es una sola lectura:
     - Tipo: `HYPERGLYCEMIA`
     - Severidad: `MEDIUM`

**Integración futura**:
Este método debe ser llamado automáticamente cuando se crean lecturas de glucosa. Requiere:

- Hook en `GlucoseEntriesService` o `SensorReadingsService`
- O integración mediante eventos/observers de NestJS

## 5. API Client

### 5.1 Nuevos Métodos HTTP

**Archivo**: `packages/api-client/src/index.ts`

Se agregaron métodos `PUT` y `DELETE` al cliente base:

```typescript
async PUT<T = any>(path: string, body?: any, init?: RequestInit): Promise<{ data?: T; error?: any }>
async DELETE<T = any>(path: string, init?: RequestInit): Promise<{ data?: T; error?: any }>
```

### 5.2 Dashboard API Client

**Archivo**: `apps/web/src/lib/dashboard-api.ts`

Wrapper completo para todos los endpoints del dashboard:

**Funciones implementadas**:

- `getDashboardSummary(accessToken)`
- `getGlucoseEvolution(accessToken)`
- `getInsulinStats(accessToken, days?)`
- `getMealStats(accessToken, days?)`
- `getRecentAlerts(accessToken, limit?)`
- `acknowledgeAlert(accessToken, alertId)`

**Características**:

- Manejo de errores consistente
- TypeScript tipado
- Headers de autenticación automáticos

## 6. Frontend - Componentes del Dashboard

### 6.1 Estructura de Componentes

```
apps/web/src/components/dashboard/
├── Sidebar.tsx           # Navegación lateral
├── Header.tsx            # Barra superior con búsqueda
├── SummaryCard.tsx       # Tarjeta de resumen reutilizable
├── GlucoseChart.tsx      # Gráfico SVG de evolución
├── InsulinStatsCard.tsx # Estadísticas de insulina
├── MealStatsCard.tsx    # Estadísticas de comidas
├── AlertCard.tsx        # Tarjeta individual de alerta
└── RecentAlerts.tsx     # Lista de alertas recientes
```

### 6.2 Sidebar Component

**Características**:

- Navegación fija lateral
- Estado activo resaltado
- Iconos de Lucide React (mismo que app móvil)
- Logo con icono Stethoscope

**Rutas implementadas**:

- `/dashboard` - Inicio (Home icon)
- `/dashboard/patients` - Pacientes (Users icon)
- `/dashboard/communication` - Comunicación (MessageSquare icon)
- `/dashboard/settings` - Ajustes & Reportes (Settings icon)

**Implementación futura requerida**:

- Página de listado de pacientes
- Sistema de comunicación/mensajería
- Configuración y reportes

### 6.3 Header Component

**Características**:

- Barra fija superior
- Búsqueda de pacientes (placeholder, funcionalidad futura)
- Iconos de notificaciones y perfil
- Avatar con iniciales del usuario

**Funcionalidad futura**:

- Búsqueda funcional de pacientes
- Dropdown de notificaciones
- Menú de perfil/usuario

### 6.4 SummaryCard Component

**Props**:

```typescript
{
  title: string;
  value: number | string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;  // Componente de icono
  iconColor?: string;  // Clase Tailwind para color
}
```

**Características**:

- Iconos de Lucide React (grises)
- Layout responsive
- Valores grandes destacados

### 6.5 GlucoseChart Component

**Implementación**: Gráfico SVG nativo (sin dependencias externas)

**Características**:

- Gráfico de línea para evolución promedio
- Ejes Y con escalas (0, 45, 90, 135, 180 mg/dL)
- Eje X con fechas formateadas
- Puntos de datos visibles
- Responsive con scroll horizontal

**Datos mostrados**:

- Línea azul: Promedio de glucosa por día
- Puntos: Valores promedio
- Escala: Min/Max del día (preparado para visualización futura)

**Mejoras futuras**:

- Rango de valores normales destacado
- Tooltips con información detallada
- Zoom y pan
- Comparación entre pacientes

### 6.6 InsulinStatsCard Component

**Estado vacío**:

- Muestra "0 unidades/día" cuando no hay datos
- Mensaje: "En los últimos X días, sus pacientes no tienen registros de insulina."

**Estado con datos**:

- Valor grande: Promedio redondeado a 1 decimal
- Descripción contextual

### 6.7 MealStatsCard Component

**Estado vacío**:

- Muestra "0 comidas" cuando no hay datos
- Mensaje: "En los últimos 30 días, sus pacientes no tienen comidas registradas."

**Estado con datos**:

- Valor grande: Total de comidas
- Descripción con número destacado en verde

### 6.8 AlertCard Component

**Características**:

- Icono `AlertTriangle` de Lucide React
- Colores según severidad:
  - `CRITICAL`: Rojo
  - `HIGH`: Naranja
  - `MEDIUM`: Amarillo
- Información del paciente
- Timestamp relativo ("Hace X min")
- Botón para reconocer alerta
- Estado de reconocimiento

**Funcionalidad**:

- Reconocimiento de alertas con actualización automática
- Manejo de estados de carga

### 6.9 RecentAlerts Component

**Características**:

- Lista scrollable de alertas
- Estado vacío cuando no hay alertas
- Altura igual a MealStatsCard (layout responsivo)

## 7. Layout del Dashboard

### 7.1 Estructura Visual

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (64px)  │  Header (64px)                        │
│                  ├───────────────────────────────────────┤
│  Navigation      │  Search    [🔔] [👤] [Avatar]        │
│                  ├───────────────────────────────────────┤
│                  │  Welcome Message                      │
│                  ├───────────────────────────────────────┤
│                  │  [Summary Cards: 3 columnas]        │
│                  ├───────────────────────────────────────┤
│                  │  [Chart (2/3)]  │  [Insulin (1/3)]   │
│                  ├───────────────────────────────────────┤
│                  │  [Meals (1/2)]  │  [Alerts (1/2)]    │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Responsive Design

**Desktop (lg:)**:

- Sidebar fija de 256px (w-64)
- Header con margen izquierdo de 256px
- Grid de 3 columnas para summary cards
- Grid de 3 columnas para chart/insulin (2/3 y 1/3)
- Grid de 2 columnas para meals/alerts (1/2 cada uno)

**Tablet/Mobile (md: y menores)**:

- Sidebar colapsable (implementación futura)
- Grid de 1 columna para todas las secciones
- Stack vertical

### 7.3 Alturas Consistentes

**Implementación**:

- Todas las cards usan `h-full flex flex-col`
- Grid containers usan `items-stretch`
- Contenido flexible con `flex-1` para distribución uniforme

**Resultado**:

- Chart y Insulin: Misma altura
- Meals y Alerts: Misma altura

## 8. Hooks de React Query

**Archivo**: `apps/web/src/hooks/useDashboard.ts`

**Hooks implementados**:

- `useDashboardSummary()`
- `useGlucoseEvolution()`
- `useInsulinStats(days)`
- `useMealStats(days)`
- `useRecentAlerts(limit)`

**Características**:

- Cache automático con React Query
- Invalidación automática después de mutaciones
- Estados de carga manejados
- Autenticación verificada antes de fetch

## 9. Integración con App Module

**Archivo**: `apps/backend/src/app.module.ts`

Todos los nuevos módulos están registrados:

```typescript
DashboardModule,
DoctorPatientModule,
AppointmentsModule,
AlertsModule,
```

## 10. Configuración de TailwindCSS

### 10.1 Instalación

- TailwindCSS v3.4.1 (versión estable para Next.js)
- PostCSS configurado
- Autoprefixer incluido

### 10.2 Archivos de Configuración

- `tailwind.config.js`: Configuración con paths de contenido
- `postcss.config.js`: Plugins de Tailwind y Autoprefixer
- `globals.css`: Directivas `@tailwind`

### 10.3 Uso

Todos los componentes usan clases de TailwindCSS:

- Sistema de grid responsive
- Colores consistentes (gray-500, blue-500, etc.)
- Espaciado uniforme
- Bordes y sombras

## 11. Dependencias y Librerías

### 11.1 Nuevas Dependencias Frontend

- `lucide-react`: Iconos (mismo que `lucide-react-native` en móvil)
- `tailwindcss@3.4.1`: Framework CSS
- `postcss`: Procesador CSS
- `autoprefixer`: Soporte cross-browser

### 11.2 Dependencias Backend

- Todas las dependencias existentes se mantienen
- Prisma Client regenerado con nuevos modelos

## 12. Consideraciones de Seguridad

### 12.1 Validación de Roles

- Todos los endpoints de médico están protegidos con `JwtAuthGuard`
- Validación adicional con `DoctorUtilsService.verifyDoctor()`
- Solo médicos pueden:
  - Ver dashboard
  - Asignar pacientes
  - Crear citas
  - Ver alertas de pacientes

### 12.2 Aislamiento de Datos

- Los médicos solo ven datos de sus pacientes asignados
- Las consultas usan `doctorId` del token JWT
- No hay acceso cruzado entre médicos

### 12.3 Validaciones de Negocio

- Pacientes solo pueden ser asignados si tienen rol `PATIENT`
- Citas solo pueden crearse para pacientes asignados
- Alertas solo pueden reconocerse por el médico del paciente

## 13. Puntos de Extensión Futura

### 13.1 Sistema de Comunicación

**Rutas preparadas**:

- `/dashboard/communication`

**Componentes necesarios**:

- Lista de mensajes/conversaciones
- Chat en tiempo real
- Notificaciones de mensajes

**Integración requerida**:

- WebSockets para tiempo real
- Modelo de mensajes en base de datos
- Sistema de notificaciones

### 13.2 Página de Pacientes

**Ruta**: `/dashboard/patients`

**Funcionalidades necesarias**:

- Lista completa de pacientes
- Búsqueda y filtrado
- Acciones por paciente:
  - Ver historial completo
  - Ver perfil
  - Editar relación
  - Enviar mensaje
- Estadísticas individuales por paciente

**Componentes a crear**:

- `PatientList.tsx`
- `PatientCard.tsx`
- `PatientDetail.tsx`
- `PatientStats.tsx`

### 13.3 Sistema de Reportes

**Ruta**: `/dashboard/settings` (sección de reportes)

**Reportes futuros**:

- Reporte de actividad de pacientes
- Reporte de adherencia a tratamiento
- Reporte de eventos de glucosa
- Exportación a PDF/Excel
- Programación de reportes automáticos

### 13.4 Detección Automática de Alertas

**Integración requerida**:

En `GlucoseEntriesService` o `SensorReadingsService`:

```typescript
// Después de crear una lectura de glucosa
await this.alertsService.detectAlert(userId, glucoseMgdl, glucoseReading.id);
```

**Consideraciones**:

- Debe ejecutarse de forma asíncrona
- No debe bloquear la creación de la lectura
- Manejo de errores para no afectar el flujo principal

### 13.5 Notificaciones en Tiempo Real

**Implementación futura**:

- WebSockets para alertas críticas
- Notificaciones push del navegador
- Actualización automática del dashboard
- Sonidos/alertas visuales

### 13.6 Gráficos Avanzados

**Mejoras al GlucoseChart**:

- Librería de gráficos (Chart.js, Recharts, Victory)
- Múltiples series (comparación entre pacientes)
- Zoom y pan
- Exportación de gráficos
- Rango de valores objetivo destacado

### 13.7 Gestión de Citas Avanzada

**Funcionalidades futuras**:

- Vista de calendario mensual/semanal
- Drag & drop para reprogramar
- Recordatorios automáticos (email/SMS)
- Integración con calendarios externos
- Videollamadas integradas

### 13.8 Búsqueda de Pacientes

**Implementación del Header**:

- Búsqueda en tiempo real
- Filtros por nombre, email, estado
- Autocompletado
- Navegación rápida a perfil del paciente

### 13.9 Estadísticas Avanzadas

**Métricas adicionales**:

- Tiempo en rango (TIR - Time in Range)
- Variabilidad de glucosa
- Adherencia a medicación
- Comparación de períodos
- Proyecciones y tendencias

## 14. Testing y Validación

### 14.1 Tests Necesarios

**Backend**:

- Unit tests para `DoctorUtilsService`
- Integration tests para endpoints de dashboard
- Tests de validación de roles
- Tests de relaciones médico-paciente

**Frontend**:

- Component tests para cards
- Integration tests para hooks
- E2E tests para flujo completo del dashboard

### 14.2 Validaciones Pendientes

- Verificar que usuarios móviles no puedan acceder a endpoints de médico
- Validar que pacientes no puedan asignarse a sí mismos
- Verificar constraints de base de datos
- Validar manejo de edge cases (cero pacientes, sin datos, etc.)

## 15. Migraciones y Rollback

### 15.1 Migración Aplicada

La migración `20251104231910_add_doctor_patient_structure` ya fue aplicada.

### 15.2 Rollback (si necesario)

Para revertir los cambios de base de datos:

```sql
-- Revertir migración (ejecutar en orden inverso)
DROP TABLE IF EXISTS "Alert";
DROP TABLE IF EXISTS "Appointment";
DROP TABLE IF EXISTS "DoctorPatient";
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE IF EXISTS "AppointmentStatus";
DROP TYPE IF EXISTS "AlertType";
DROP TYPE IF EXISTS "AlertSeverity";
DROP TYPE IF EXISTS "UserRole";
```

**⚠️ Advertencia**: Esto eliminará todos los datos de alertas, citas y relaciones médico-paciente.

## 16. Próximos Pasos Recomendados

### 16.1 Prioridad Alta

1. **Implementar detección automática de alertas**:
   - Integrar `AlertsService.detectAlert()` en creación de lecturas
   - Testing exhaustivo de umbrales
   - Notificaciones inmediatas para alertas críticas

2. **Página de listado de pacientes**:
   - Componente `PatientList`
   - Búsqueda funcional
   - Filtros y ordenamiento

3. **Búsqueda en Header**:
   - Implementar funcionalidad de búsqueda
   - Autocompletado
   - Navegación rápida

### 16.2 Prioridad Media

4. **Sistema de comunicación**:
   - Modelo de mensajes
   - WebSockets
   - UI de chat

5. **Mejoras de gráficos**:
   - Librería profesional
   - Interactividad
   - Exportación

6. **Gestión avanzada de citas**:
   - Vista de calendario
   - Recordatorios
   - Cancelación/reprogramación

### 16.3 Prioridad Baja

7. **Reportes y exportación**:
   - Generación de PDFs
   - Exportación a Excel
   - Programación automática

8. **Analytics avanzados**:
   - Métricas de TIR
   - Comparación de períodos
   - Proyecciones

## 17. Archivos Modificados y Creados

### 17.1 Backend

**Nuevos archivos**:

- `apps/backend/src/common/services/doctor-utils.service.ts`
- `apps/backend/src/modules/dashboard/dashboard.module.ts`
- `apps/backend/src/modules/dashboard/dashboard.controller.ts`
- `apps/backend/src/modules/dashboard/dashboard.service.ts`
- `apps/backend/src/modules/dashboard/dto/*.ts` (4 DTOs)
- `apps/backend/src/modules/doctor-patient/*.ts` (módulo completo)
- `apps/backend/src/modules/appointments/*.ts` (módulo completo)
- `apps/backend/src/modules/alerts/*.ts` (módulo completo)
- `apps/backend/prisma/migrations/20251104231910_add_doctor_patient_structure/migration.sql`

**Archivos modificados**:

- `apps/backend/prisma/schema.prisma`
- `apps/backend/src/app.module.ts`
- `apps/backend/src/common/common.module.ts`
- `apps/backend/src/modules/auth/dto/register.dto.ts`
- `apps/backend/src/modules/auth/services/auth.service.ts`

### 17.2 Frontend

**Nuevos archivos**:

- `apps/web/src/components/dashboard/*.tsx` (8 componentes)
- `apps/web/src/hooks/useDashboard.ts`
- `apps/web/src/lib/dashboard-api.ts`
- `apps/web/tailwind.config.js`
- `apps/web/postcss.config.js`
- `apps/web/src/app/globals.css`

**Archivos modificados**:

- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/lib/auth-api.ts`
- `apps/web/package.json`
- `packages/api-client/src/index.ts`

## 18. Comandos Útiles

### 18.1 Desarrollo

```bash
# Backend
cd apps/backend
pnpm dev

# Frontend
cd apps/web
pnpm dev

# Generar Prisma Client
cd apps/backend
pnpm prisma:generate
```

### 18.2 Base de Datos

```bash
# Crear nueva migración
cd apps/backend
pnpm prisma migrate dev --name nombre_migracion

# Aplicar migraciones
pnpm prisma migrate deploy

# Abrir Prisma Studio
pnpm prisma studio
```

### 18.3 Testing

```bash
# Backend tests
cd apps/backend
pnpm test

# Frontend tests
cd apps/web
pnpm test
```

## 19. Notas Importantes

### 19.1 Compatibilidad

- Los usuarios existentes mantienen su rol como `PATIENT`
- No se requieren cambios manuales en la base de datos
- La aplicación móvil sigue funcionando sin cambios

### 19.2 Performance

- Los índices agregados optimizan las consultas frecuentes
- Las agregaciones de dashboard son eficientes con los índices existentes
- Considerar caché para estadísticas si el volumen de datos crece

### 19.3 Escalabilidad

- La estructura de relaciones muchos-a-muchos permite crecimiento
- El sistema de alertas puede escalar con procesamiento asíncrono
- Los endpoints de dashboard pueden beneficiarse de paginación futura

---

**Documentación creada**: Noviembre 2024  
**Versión**: 1.0  
**Última actualización**: Post-implementación inicial
