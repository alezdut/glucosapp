# Sistema de Alertas - Documentación de Referencia

Este documento contiene todas las definiciones, reglas de negocio y especificaciones técnicas del sistema de alertas implementado en GlucosApp.

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Modelo de Datos](#modelo-de-datos)
3. [Tipos de Alertas](#tipos-de-alertas)
4. [Configuración de Alertas](#configuración-de-alertas)
5. [Reglas de Negocio](#reglas-de-negocio)
6. [API Endpoints](#api-endpoints)
7. [Validaciones](#validaciones)
8. [Interfaz de Usuario](#interfaz-de-usuario)
9. [Flujo de Detección de Alertas](#flujo-de-detección-de-alertas)

---

## Visión General

### Propósito

El sistema de alertas permite a los doctores recibir notificaciones cuando los pacientes tienen niveles de glucosa fuera de los rangos normales. Las alertas se generan automáticamente cuando se registran nuevas lecturas de glucosa.

### Roles y Acceso

- **Doctores (DOCTOR)**:
  - Pueden configurar alertas para todos sus pacientes asignados
  - Reciben alertas basadas en los datos de sus pacientes
  - Solo tienen acceso a la aplicación web
  - La configuración de alertas se aplica a todos los pacientes del doctor

- **Pacientes (PATIENT)**:
  - No pueden configurar alertas
  - No reciben alertas directamente
  - Solo tienen acceso a la aplicación móvil
  - Los datos de glucosa que registran generan alertas para sus doctores

### Principios de Diseño

1. **Configuración Global por Doctor**: Un doctor configura las alertas una vez y se aplican a todos sus pacientes asignados
2. **Detección Automática**: Las alertas se generan automáticamente al crear nuevas lecturas de glucosa
3. **Notificaciones para Doctores**: Solo los doctores reciben notificaciones, no los pacientes
4. **Sin Notificaciones Push**: Los doctores no tienen acceso a la app móvil, por lo que las notificaciones push no están disponibles

---

## Modelo de Datos

### Tabla: `Alert`

Almacena las alertas generadas para los pacientes.

```prisma
model Alert {
  id               String        @id @default(cuid())
  userId           String        // ID del paciente
  type             AlertType     // Tipo de alerta
  severity         AlertSeverity // Severidad de la alerta
  message          String        // Mensaje descriptivo
  glucoseReadingId String?       // ID de la lectura que generó la alerta
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

### Tabla: `AlertSettings`

Almacena la configuración de alertas para cada paciente. Cada paciente tiene una configuración única, pero los doctores las configuran de forma masiva.

```prisma
model AlertSettings {
  id                                 String   @id @default(cuid())
  userId                             String   @unique // ID del paciente
  alertsEnabled                      Boolean  @default(true)
  hypoglycemiaEnabled                Boolean  @default(true)
  hypoglycemiaThreshold              Int      @default(70)
  severeHypoglycemiaEnabled          Boolean  @default(true)
  severeHypoglycemiaThreshold        Int      @default(54)
  hyperglycemiaEnabled               Boolean  @default(true)
  hyperglycemiaThreshold             Int      @default(250)
  persistentHyperglycemiaEnabled     Boolean  @default(true)
  persistentHyperglycemiaThreshold   Int      @default(250)
  persistentHyperglycemiaWindowHours Int      @default(4)
  persistentHyperglycemiaMinReadings Int      @default(2)
  notificationChannels               Json     @default("{\"dashboard\":true,\"email\":false,\"push\":false}")
  dailySummaryEnabled                Boolean  @default(true)
  dailySummaryTime                   String   @default("08:00")
  quietHoursEnabled                  Boolean  @default(false)
  quietHoursStart                    String?
  quietHoursEnd                      String?
  notificationFrequency              String   @default("IMMEDIATE")
  createdAt                          DateTime @default(now())
  updatedAt                          DateTime @updatedAt
  user                               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

---

## Tipos de Alertas

### Enums

#### `AlertType`

Tipos de alertas disponibles:

- `HYPOGLYCEMIA`: Hipoglucemia (nivel bajo de glucosa)
- `SEVERE_HYPOGLYCEMIA`: Hipoglucemia severa (nivel crítico bajo)
- `HYPERGLYCEMIA`: Hiperglucemia (nivel alto de glucosa)
- `PERSISTENT_HYPERGLYCEMIA`: Hiperglucemia persistente (niveles altos sostenidos)
- `OTHER`: Otros tipos de alertas

#### `AlertSeverity`

Niveles de severidad:

- `LOW`: Baja
- `MEDIUM`: Media
- `HIGH`: Alta
- `CRITICAL`: Crítica

### Mapeo de Tipos a Severidades

| Tipo de Alerta             | Severidad  | Condición                                                        |
| -------------------------- | ---------- | ---------------------------------------------------------------- |
| `SEVERE_HYPOGLYCEMIA`      | `CRITICAL` | `glucose < severeHypoglycemiaThreshold`                          |
| `HYPOGLYCEMIA`             | `HIGH`     | `severeHypoglycemiaThreshold <= glucose < hypoglycemiaThreshold` |
| `HYPERGLYCEMIA`            | `MEDIUM`   | `glucose > hyperglycemiaThreshold`                               |
| `PERSISTENT_HYPERGLYCEMIA` | `HIGH`     | Múltiples lecturas altas en ventana de tiempo                    |

---

## Configuración de Alertas

### Rangos de Umbrales

Los umbrales tienen rangos válidos definidos en `ALERT_THRESHOLD_RANGES`:

```typescript
export const ALERT_THRESHOLD_RANGES = {
  HYPOGLYCEMIA: { min: 40, max: 80, default: 70 },
  SEVERE_HYPOGLYCEMIA: { min: 30, max: 60, default: 54 },
  HYPERGLYCEMIA: { min: 180, max: 400, default: 250 },
  PERSISTENT_HYPERGLYCEMIA: { min: 180, max: 400, default: 250 },
} as const;
```

### Configuración por Tipo de Alerta

#### 1. Hipoglucemia

- **Umbral**: Rango 40-80 mg/dL (default: 70 mg/dL)
- **Severidad**: HIGH
- **Habilitable**: Sí
- **Validación**: Debe ser mayor que el umbral de hipoglucemia severa

#### 2. Hipoglucemia Severa

- **Umbral**: Rango 30-60 mg/dL (default: 54 mg/dL)
- **Severidad**: CRITICAL
- **Habilitable**: Sí
- **Validación**: Debe ser menor que el umbral de hipoglucemia

#### 3. Hiperglucemia

- **Umbral**: Rango 180-400 mg/dL (default: 250 mg/dL)
- **Severidad**: MEDIUM
- **Habilitable**: Sí
- **Validación**: Debe ser mayor que el umbral de hipoglucemia

#### 4. Hiperglucemia Persistente

- **Umbral**: Rango 180-400 mg/dL (default: 250 mg/dL)
- **Severidad**: HIGH
- **Habilitable**: Sí
- **Parámetros adicionales**:
  - `persistentHyperglycemiaWindowHours`: Ventana de tiempo en horas (default: 4)
  - `persistentHyperglycemiaMinReadings`: Mínimo de lecturas altas requeridas (default: 2)
- **Validación**: Debe ser mayor que el umbral de hipoglucemia

### Canales de Notificación

```typescript
type NotificationChannels = {
  dashboard: boolean; // Siempre activo para doctores
  email: boolean; // Configurable
  push: boolean; // Siempre false (doctores no tienen app móvil)
};
```

**Nota**: El campo `push` siempre debe ser `false` ya que los doctores no tienen acceso a la aplicación móvil.

### Frecuencia de Notificación

```typescript
enum NotificationFrequency {
  IMMEDIATE = "IMMEDIATE", // Notificaciones inmediatas
  DAILY = "DAILY", // Resumen diario
  WEEKLY = "WEEKLY", // Resumen semanal
}
```

**Comportamiento**:

- `IMMEDIATE`: Las alertas se envían tan pronto como se detectan
- `DAILY`: Las alertas se agrupan y se envían en un resumen diario
- `WEEKLY`: Las alertas se agrupan y se envían en un resumen semanal

### Resúmenes Diarios/Semanales

- **Campo**: `dailySummaryTime` (formato: "HH:MM", default: "08:00")
- **Visibilidad**: Solo se muestra cuando `notificationFrequency` es `DAILY` o `WEEKLY`
- **Auto-habilitación**: `dailySummaryEnabled` se establece automáticamente:
  - `true` si la frecuencia es `DAILY` o `WEEKLY`
  - `false` si la frecuencia es `IMMEDIATE`

### Horario de Silencio

- **Habilitable**: Sí (default: false)
- **Campos**:
  - `quietHoursStart`: Hora de inicio (formato: "HH:MM", default: "22:00")
  - `quietHoursEnd`: Hora de fin (formato: "HH:MM", default: "07:00")
- **Propósito**: Evitar notificaciones durante horas de descanso

---

## Reglas de Negocio

### 1. Control de Acceso

- **Solo doctores pueden configurar alertas**: Los endpoints de configuración verifican que el usuario sea `DOCTOR`
- **Configuración aplicada a todos los pacientes**: Cuando un doctor actualiza la configuración, se aplica a todos sus pacientes asignados
- **Pacientes no pueden configurar**: Los pacientes no tienen acceso a los endpoints de configuración

### 2. Detección de Alertas

- **Automática**: Las alertas se generan automáticamente cuando se crean nuevas lecturas de glucosa
- **Basada en configuración**: Usa los umbrales configurados por el doctor para cada paciente
- **Priorización**: Si se detectan múltiples condiciones, se prioriza la más severa:
  1. Hipoglucemia severa (CRITICAL)
  2. Hipoglucemia (HIGH)
  3. Hiperglucemia persistente (HIGH)
  4. Hiperglucemia (MEDIUM)

### 3. Hiperglucemia Persistente

Se detecta cuando:

- El nivel de glucosa actual es mayor que `persistentHyperglycemiaThreshold`
- Y en la ventana de tiempo (`persistentHyperglycemiaWindowHours`) hay al menos `persistentHyperglycemiaMinReadings` lecturas altas

### 4. Validaciones de Umbrales

- **Hipoglucemia**: Debe estar entre 40-80 mg/dL
- **Hipoglucemia Severa**: Debe estar entre 30-60 mg/dL
- **Hiperglucemia**: Debe estar entre 180-400 mg/dL
- **Hiperglucemia Persistente**: Debe estar entre 180-400 mg/dL
- **Validación cruzada**: `severeHypoglycemiaThreshold < hypoglycemiaThreshold`
- **Validación cruzada**: `hyperglycemiaThreshold > hypoglycemiaThreshold`
- **Validación cruzada**: `persistentHyperglycemiaThreshold > hypoglycemiaThreshold`

### 5. Configuración por Defecto

Cuando se crea una configuración nueva para un paciente, se usan estos valores:

```typescript
{
  alertsEnabled: true,
  hypoglycemiaEnabled: true,
  hypoglycemiaThreshold: 70,
  severeHypoglycemiaEnabled: true,
  severeHypoglycemiaThreshold: 54,
  hyperglycemiaEnabled: true,
  hyperglycemiaThreshold: 250,
  persistentHyperglycemiaEnabled: true,
  persistentHyperglycemiaThreshold: 250,
  persistentHyperglycemiaWindowHours: 4,
  persistentHyperglycemiaMinReadings: 2,
  notificationChannels: { dashboard: true, email: false, push: false },
  dailySummaryEnabled: true,
  dailySummaryTime: "08:00",
  quietHoursEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  notificationFrequency: "IMMEDIATE",
}
```

---

## API Endpoints

### Base Path

`/v1/alerts`

### Autenticación

Todos los endpoints requieren autenticación JWT (`Bearer token`).

### Endpoints

#### 1. Obtener Configuración de Alertas

```
GET /v1/alerts/settings
```

**Descripción**: Obtiene la configuración de alertas para todos los pacientes del doctor.

**Acceso**: Solo doctores

**Respuesta**:

- `200 OK`: Retorna la configuración del primer paciente como plantilla
- `401 Unauthorized`: No autenticado
- `403 Forbidden`: Usuario no es doctor o no tiene pacientes asignados

**Ejemplo de respuesta**:

```json
{
  "id": "settings-123",
  "userId": "patient-123",
  "alertsEnabled": true,
  "hypoglycemiaEnabled": true,
  "hypoglycemiaThreshold": 70,
  "severeHypoglycemiaEnabled": true,
  "severeHypoglycemiaThreshold": 54,
  "hyperglycemiaEnabled": true,
  "hyperglycemiaThreshold": 250,
  "persistentHyperglycemiaEnabled": true,
  "persistentHyperglycemiaThreshold": 250,
  "persistentHyperglycemiaWindowHours": 4,
  "persistentHyperglycemiaMinReadings": 2,
  "notificationChannels": {
    "dashboard": true,
    "email": false,
    "push": false
  },
  "dailySummaryEnabled": true,
  "dailySummaryTime": "08:00",
  "quietHoursEnabled": false,
  "quietHoursStart": null,
  "quietHoursEnd": null,
  "notificationFrequency": "IMMEDIATE",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Actualizar Configuración de Alertas

```
PATCH /v1/alerts/settings
```

**Descripción**: Actualiza la configuración de alertas para todos los pacientes asignados al doctor.

**Acceso**: Solo doctores

**Body** (todos los campos son opcionales):

```json
{
  "alertsEnabled": true,
  "hypoglycemiaEnabled": true,
  "hypoglycemiaThreshold": 70,
  "severeHypoglycemiaEnabled": true,
  "severeHypoglycemiaThreshold": 54,
  "hyperglycemiaEnabled": true,
  "hyperglycemiaThreshold": 250,
  "persistentHyperglycemiaEnabled": true,
  "persistentHyperglycemiaThreshold": 250,
  "persistentHyperglycemiaWindowHours": 4,
  "persistentHyperglycemiaMinReadings": 2,
  "notificationChannels": {
    "dashboard": true,
    "email": false,
    "push": false
  },
  "dailySummaryEnabled": true,
  "dailySummaryTime": "08:00",
  "quietHoursEnabled": false,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "07:00",
  "notificationFrequency": "IMMEDIATE"
}
```

**Respuesta**:

- `200 OK`: Configuración actualizada exitosamente
- `400 Bad Request`: Validación fallida (umbrales inválidos)
- `401 Unauthorized`: No autenticado
- `403 Forbidden`: Usuario no es doctor o no tiene pacientes asignados

**Comportamiento**:

- Actualiza la configuración de todos los pacientes asignados al doctor
- Si un paciente no tiene configuración, se crea una nueva
- Si un paciente ya tiene configuración, se actualiza

#### 3. Obtener Todas las Alertas

```
GET /v1/alerts?limit=50
```

**Descripción**: Obtiene todas las alertas de los pacientes del doctor.

**Acceso**: Solo doctores

**Query Parameters**:

- `limit` (opcional): Número máximo de alertas a retornar (default: 50)

**Respuesta**: Array de `AlertResponseDto`

#### 4. Obtener Alertas Críticas

```
GET /v1/alerts/critical
```

**Descripción**: Obtiene alertas críticas (severidad CRITICAL o HIGH) no reconocidas.

**Acceso**: Solo doctores

**Respuesta**: Array de `AlertResponseDto`

#### 5. Obtener Alertas Recientes

```
GET /v1/alerts/recent?limit=10
```

**Descripción**: Obtiene alertas de las últimas 24 horas.

**Acceso**: Solo doctores

**Query Parameters**:

- `limit` (opcional): Número máximo de alertas a retornar (default: 10)

**Respuesta**: Array de `AlertResponseDto`

#### 6. Reconocer una Alerta

```
POST /v1/alerts/:id/acknowledge
```

**Descripción**: Marca una alerta como reconocida.

**Acceso**: Solo doctores

**Respuesta**: `AlertResponseDto` actualizado

---

## Validaciones

### Validaciones del Frontend

#### Validación de Rangos (con debounce de 500ms)

- **Hipoglucemia**: 40-80 mg/dL
- **Hipoglucemia Severa**: 30-60 mg/dL
- **Hiperglucemia**: 180-400 mg/dL
- **Hiperglucemia Persistente**: 180-400 mg/dL

#### Validaciones Cruzadas

1. `severeHypoglycemiaThreshold < hypoglycemiaThreshold`
2. `hyperglycemiaThreshold > hypoglycemiaThreshold`
3. `persistentHyperglycemiaThreshold > hypoglycemiaThreshold`

#### Comportamiento de Validación

- Las validaciones se ejecutan 500ms después de que el usuario deje de escribir (debounce)
- Los campos muestran error en rojo cuando están fuera del rango
- El botón "Guardar Configuración" se deshabilita cuando hay errores de validación
- Los campos de umbral son de tipo texto (no number) y solo aceptan números

### Validaciones del Backend

#### Validación de Rangos (DTO)

- Implementada en `UpdateAlertSettingsDto` usando `@Min()` y `@Max()`
- Validación cruzada usando `@Validate(IsSevereHypoglycemiaLessThanHypoglycemiaConstraint)`

#### Validación en el Servicio

- Verificación adicional en `updateAlertSettings()` antes de guardar
- Mensajes de error en español

---

## Interfaz de Usuario

### Ubicación

`/dashboard/settings` (pestaña "Configuración de Alertas")

### Componentes Principales

#### 1. AlertConfigCard

Card reutilizable para secciones de configuración de alertas.

**Props**:

- `title`: Título de la card
- `icon`: Icono opcional
- `enabled`: Estado habilitado/deshabilitado
- `onToggle`: Callback para cambiar el estado
- `showToggle`: Si es `false`, oculta el toggle (default: `true`)
- `description`: Descripción opcional
- `children`: Contenido de la card

#### 2. IndividualAlertConfig

Componente para configurar un tipo de alerta individual.

**Props**:

- `enabled`: Si la alerta está habilitada
- `onEnabledChange`: Callback para cambiar el estado
- `threshold`: Valor del umbral
- `onThresholdChange`: Callback para cambiar el umbral
- `severity`: Severidad de la alerta ("critical" | "high" | "medium" | "low")
- `frequency`: Frecuencia de notificación
- `onFrequencyChange`: Callback para cambiar la frecuencia
- `thresholdLabel`: Etiqueta del umbral
- `thresholdMin`: Valor mínimo del umbral
- `thresholdMax`: Valor máximo del umbral
- `thresholdError`: Mensaje de error de validación
- `showFrequency`: Si mostrar el selector de frecuencia (default: `true`)

#### 3. NotificationPreferences

Componente para configurar preferencias de notificación.

**Props**:

- `channels`: Canales de notificación
- `onChannelsChange`: Callback para cambiar los canales
- `notificationFrequency`: Frecuencia de notificación actual
- `dailySummaryTime`: Hora del resumen diario/semanal
- `onDailySummaryTimeChange`: Callback para cambiar la hora
- `quietHoursEnabled`: Si el horario de silencio está habilitado
- `onQuietHoursChange`: Callback para cambiar el estado
- `quietHoursStart`: Hora de inicio del horario de silencio
- `onQuietHoursStartChange`: Callback para cambiar la hora de inicio
- `quietHoursEnd`: Hora de fin del horario de silencio
- `onQuietHoursEndChange`: Callback para cambiar la hora de fin

### Secciones de la UI

#### 1. Configuración General de Alertas

- Toggle para activar/desactivar todas las alertas
- Afecta a `alertsEnabled`

#### 2. Alertas de Hipoglucemia

- **Hipoglucemia**:
  - Toggle para activar/desactivar
  - Campo de umbral (texto, solo números, rango 40-80)
  - Selector de frecuencia de notificación
- **Hipoglucemia Severa**:
  - Toggle para activar/desactivar
  - Campo de umbral (texto, solo números, rango 30-60)
  - Selector de frecuencia de notificación

#### 3. Alertas de Hiperglucemia

- **Hiperglucemia**:
  - Toggle para activar/desactivar
  - Campo de umbral (texto, solo números, rango 180-400)
  - Selector de frecuencia de notificación
- **Hiperglucemia Persistente**:
  - Toggle para activar/desactivar
  - Campo de umbral (texto, solo números, rango 180-400)
  - Campo de ventana de tiempo (horas)
  - Campo de mínimo de lecturas

#### 4. Preferencias de Notificación

- **Canales de Notificación**:
  - Dashboard (siempre activo, deshabilitado)
  - Email (configurable)
  - Push (no visible, siempre false)
- **Horario del Resumen** (solo visible si frecuencia es DAILY o WEEKLY):
  - Campo de hora con label dinámico ("Hora para resumen diario" o "Hora para resumen semanal")
  - Helper text explicativo
- **Horario de Silencio**:
  - Toggle para activar/desactivar
  - Campos de hora de inicio y fin (solo visibles si está activado)

### Validación en la UI

- **Debounce**: 500ms después de dejar de escribir
- **Visualización de errores**: Campos en rojo con mensaje de error
- **Botón deshabilitado**: Se deshabilita cuando hay errores de validación
- **Campos de umbral**: Tipo texto, solo aceptan números, sin botones de incremento/decremento

---

## Flujo de Detección de Alertas

### 1. Trigger

Las alertas se detectan automáticamente cuando:

- Se crea un nuevo `GlucoseEntry`
- Se crea un nuevo `GlucoseReading`
- Se crea un nuevo `LogEntry` con `glucoseEntryId`

### 2. Proceso de Detección

```typescript
async detectAlert(userId: string, glucoseMgdl: number, glucoseReadingId?: string)
```

**Pasos**:

1. **Obtener configuración del paciente**:
   - Si no existe, se crea con valores por defecto
   - Si existe, se usa la configuración actual

2. **Verificar si las alertas están habilitadas**:
   - Si `alertsEnabled === false`, no se crea ninguna alerta

3. **Evaluar condiciones (en orden de prioridad)**:

   a. **Hipoglucemia Severa**:
   - Si `severeHypoglycemiaEnabled === true`
   - Y `glucoseMgdl < severeHypoglycemiaThreshold`
   - → Crear alerta `SEVERE_HYPOGLYCEMIA` con severidad `CRITICAL`
   - → **Detener evaluación** (prioridad más alta)

   b. **Hipoglucemia**:
   - Si `hypoglycemiaEnabled === true`
   - Y `severeHypoglycemiaThreshold <= glucoseMgdl < hypoglycemiaThreshold`
   - → Crear alerta `HYPOGLYCEMIA` con severidad `HIGH`
   - → **Detener evaluación**

   c. **Hiperglucemia**:
   - Si `hyperglycemiaEnabled === true`
   - Y `glucoseMgdl > hyperglycemiaThreshold`
   - → Evaluar hiperglucemia persistente si está habilitada
   - → Si no es persistente, crear alerta `HYPERGLYCEMIA` con severidad `MEDIUM`
   - → Si es persistente, crear alerta `PERSISTENT_HYPERGLYCEMIA` con severidad `HIGH`

4. **Evaluación de Hiperglucemia Persistente** (si aplica):
   - Obtener lecturas de las últimas `persistentHyperglycemiaWindowHours` horas
   - Contar cuántas lecturas son mayores que `persistentHyperglycemiaThreshold`
   - Si el conteo >= `persistentHyperglycemiaMinReadings`:
     - → Crear alerta `PERSISTENT_HYPERGLYCEMIA`
   - Si no:
     - → Crear alerta `HYPERGLYCEMIA` normal

5. **Crear alerta en la base de datos**:
   - Guardar en la tabla `Alert`
   - Asociar con el `userId` del paciente
   - Opcionalmente asociar con `glucoseReadingId`

### 3. Integración con Servicios

Los siguientes servicios llaman a `detectAlert()` después de crear datos de glucosa:

- `GlucoseEntriesService.create()`
- `SensorReadingsService.create()`
- `LogEntriesService.create()` (si incluye `glucoseEntryId`)

---

## Ejemplos de Uso

### Ejemplo 1: Configurar Alertas para Todos los Pacientes

```typescript
// Frontend
const updateAlertSettings = useUpdateAlertSettings();

await updateAlertSettings.mutateAsync({
  hypoglycemiaThreshold: 75,
  hyperglycemiaThreshold: 240,
  notificationChannels: {
    dashboard: true,
    email: true,
    push: false, // Siempre false
  },
  notificationFrequency: "DAILY",
  dailySummaryTime: "09:00",
});
```

### Ejemplo 2: Detección de Alerta

```typescript
// Backend - Automático cuando se crea una lectura
await alertsService.detectAlert(patientId, 45, glucoseReadingId);
// Si el umbral de hipoglucemia severa es 54 y está habilitado:
// → Crea alerta SEVERE_HYPOGLYCEMIA con severidad CRITICAL
```

### Ejemplo 3: Obtener Alertas Críticas

```typescript
// Frontend
const { data: criticalAlerts } = useQuery({
  queryKey: ["alerts", "critical"],
  queryFn: () => getCriticalAlerts(accessToken),
});
```

---

## Notas de Implementación

### Frontend

- **React Query**: Se usa para cachear y gestionar el estado de las configuraciones
- **Debounce**: Validaciones con delay de 500ms para mejor UX
- **Campos de texto**: Los umbrales usan campos de texto (no number) para evitar botones de incremento/decremento
- **Validación en tiempo real**: Los errores se muestran después del debounce

### Backend

- **Validación en múltiples capas**: DTO, servicio y base de datos
- **Actualización masiva**: `Promise.all()` para actualizar todos los pacientes en paralelo
- **Configuración por defecto**: Se crea automáticamente si no existe
- **Encriptación**: Los valores de glucosa se desencriptan para evaluar hiperglucemia persistente

### Base de Datos

- **Índices**: Optimizados para consultas por `userId`, `severity`, `acknowledged`, `createdAt`
- **Relaciones**: `Alert` y `AlertSettings` tienen relación con `User` (paciente)
- **Cascada**: Eliminación en cascada cuando se elimina un usuario

---

## Cambios Futuros Potenciales

1. **Notificaciones por Email**: Implementar envío real de emails
2. **Notificaciones Push**: Si en el futuro los doctores tienen app móvil
3. **Alertas Personalizadas**: Permitir mensajes personalizados por tipo de alerta
4. **Historial de Configuraciones**: Guardar historial de cambios en configuración
5. **Alertas por Grupo**: Configurar alertas para grupos específicos de pacientes
6. **Integración con Sistemas Externos**: Webhooks para sistemas de terceros

---

## Referencias

- **Schema Prisma**: `apps/backend/prisma/schema.prisma`
- **Tipos TypeScript**: `packages/types/src/index.ts`
- **Servicio de Alertas**: `apps/backend/src/modules/alerts/alerts.service.ts`
- **Controller de Alertas**: `apps/backend/src/modules/alerts/alerts.controller.ts`
- **DTOs**: `apps/backend/src/modules/alerts/dto/`
- **UI de Configuración**: `apps/web/src/app/dashboard/settings/page.tsx`
- **Componentes**: `apps/web/src/components/dashboard/`

---

**Última actualización**: Enero 2025
**Versión del documento**: 1.0
