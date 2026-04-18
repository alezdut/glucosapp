# Referencia Técnica Para La Presentación

## Objetivo del documento

Este documento resume la arquitectura, los módulos principales y las decisiones técnicas de `Glucosapp` para usarlo como base de preparación de la presentación del proyecto de Ingeniería de Software.

La idea es que cualquier integrante del equipo pueda usarlo para responder preguntas sobre:

- propósito general del sistema;
- stack tecnológico;
- organización del monorepo;
- responsabilidades de `backend`, `web` y `mobile`;
- flujos funcionales clave;
- decisiones arquitectónicas;
- estilo de desarrollo, testing y calidad.

## 1. Visión general del sistema

Glucosapp es una plataforma para seguimiento de glucosa, cálculo de insulina y comunicación entre paciente y profesional de salud.

El repositorio está organizado como un monorepo con tres aplicaciones principales:

- `apps/backend`: API central del sistema.
- `apps/web`: cliente para profesionales de salud.
- `apps/mobile`: cliente para pacientes.

Además, el monorepo incluye paquetes compartidos en `packages/*` para evitar duplicación de lógica, contratos y configuración.

## 2. Stack tecnológico

### Monorepo y tooling

- `pnpm workspaces` para gestión del workspace.
- `Turborepo` para orquestar `dev`, `build`, `lint`, `test` y `typecheck`.
- `TypeScript` en todo el repositorio.
- `Husky` + `lint-staged` + `commitlint` para calidad local.

### Backend

- `NestJS` como framework principal.
- `Prisma` como ORM.
- `PostgreSQL` como base de datos.
- `Swagger` para documentación de la API.
- `Socket.IO` para mensajería en tiempo real.
- `JWT` + `Passport` para autenticación.
- `pdfkit` para generación de reportes PDF.
- `@google/generative-ai` para resúmenes IA en reportes.

### Web

- `Next.js 14` con App Router.
- `React 18`.
- `React Query` para manejo de datos remotos.
- `MUI` + `Tailwind CSS` para UI.
- `socket.io-client` para eventos en tiempo real.

### Mobile

- `Expo` + `React Native`.
- `React 19`.
- `React Navigation`.
- `React Query`.
- `Expo Secure Store` para tokens.
- `Expo Auth Session` / `WebBrowser` para OAuth mobile.
- soporte de `NFC`, notificaciones push y captura/escaneo de imágenes.

### Paquetes compartidos

- `@glucosapp/api-client`
- `@glucosapp/auth-utils`
- `@glucosapp/env`
- `@glucosapp/theme`
- `@glucosapp/types`
- `@glucosapp/utils`
- `@glucosapp/mdi-insulin-algorithm`
- `@glucosapp/config`

## 3. Estructura general del monorepo

```text
apps/
  backend/
  web/
  mobile/
packages/
  api-client/
  auth-utils/
  config/
  env/
  mdi-insulin-algorithm/
  theme/
  types/
  utils/
docs/
```

### Decisión arquitectónica destacada

Se eligió monorepo para compartir:

- contratos tipados entre backend y frontends;
- utilidades transversales;
- algoritmo clínico;
- configuración de lint, prettier y TypeScript;
- cliente HTTP común.

Esto reduce inconsistencias entre aplicaciones y vuelve más defendible la arquitectura, porque la lógica transversal tiene una única fuente de verdad.

## 4. Flujo funcional general

El flujo principal del sistema es:

1. El usuario se autentica desde `web` o `mobile`.
2. El cliente usa el paquete `@glucosapp/api-client` para consumir el backend.
3. El backend aplica validaciones, reglas de negocio y persistencia con Prisma/PostgreSQL.
4. Los datos clínicos sensibles, especialmente glucosa, se almacenan cifrados.
5. Los clientes muestran métricas, historial, alertas, mensajería y reportes según el rol.
6. Para mensajería y notificaciones en tiempo real se utiliza `Socket.IO`.

## 5. Backend: módulos principales y rol de cada uno

El backend está organizado por módulos de dominio en NestJS. Esta es una decisión importante para la defensa: el proyecto no está dividido por capas genéricas sueltas, sino por bounded contexts funcionales.

### 5.1 Módulos principales

- `auth`
  Responsable de registro, login, refresh token, logout, verificación de email, recuperación de contraseña y OAuth con Google.
  Es uno de los módulos más completos y más fáciles de defender porque concentra seguridad, sesiones y onboarding.

- `profile`
  Maneja el perfil clínico y personal del usuario.
  Incluye parámetros terapéuticos como ratios de carbohidratos, sensibilidad a la insulina, objetivos glucémicos y ventanas horarias de comidas.

- `glucose-entries`
  Registro manual de glucosa.
  Forma parte del flujo clínico central del sistema.

- `sensor-readings`
  Gestión de lecturas provenientes de sensores.
  Soporta carga individual y batch, evita duplicados, exporta datos y dispara alertas.
  Es un módulo fuerte para mostrar porque conecta el mundo mobile/NFC con el backend.

- `insulin-calculation`
  Expone endpoints para cálculo de dosis de comida, corrección, evaluación antes de dormir e IOB actual.
  Internamente reutiliza `@glucosapp/mdi-insulin-algorithm`.

- `insulin-doses`
  Registra dosis aplicadas por el usuario, incluyendo datos de trazabilidad como dosis calculada, corrección, edición manual e IOB descontado.

- `meals`
  Gestión de comidas y plantillas/composición de alimentos.

- `log-entries`
  Consolida eventos clínicos en una línea temporal común.
  Es importante porque integra glucosa, comida, insulina y contexto en una misma entidad de historial.

- `statistics`
  Calcula métricas agregadas para el paciente.
  Alimenta pantallas como home, tendencia y estadísticas.

- `dashboard`
  Agregador orientado a la vista profesional.
  Entrega resumen, evolución glucémica, estadísticas de insulina, métricas de comidas y vistas por paciente.

- `doctor-patient`
  Gestiona la relación doctor-paciente.
  Soporta búsqueda, asignación, consulta de datos del paciente y edición clínica desde el lado profesional.

- `appointments`
  Gestión de citas médicas.
  Incluye alta, actualización, confirmación, cancelación y vista calendario.

- `alerts`
  Motor de alertas clínicas.
  Configura umbrales, reconoce alertas y soporta detección de hipoglucemia, hiperglucemia y persistencia.

- `messages`
  Mensajería entre paciente y profesional.
  Combina endpoints REST con WebSocket Gateway para tiempo real.

- `notifications`
  Registro de dispositivos push y distribución de notificaciones.

- `reports`
  Generación de reportes individuales y grupales, en PDF o CSV, con opción de resumen IA.

- `food-search`
  Integración con OpenFoodFacts para búsqueda de alimentos.

- `health`
  Endpoint de salud.

### 5.2 Módulos backend más destacados para mostrar

#### `auth`

Por qué es importante:

- combina email/password y Google OAuth;
- usa access token corto y refresh token largo;
- implementa rotación de refresh tokens;
- exige verificación de email;
- separa guards, strategies, DTOs y servicios.

Decisión técnica:

- autenticación centralizada en NestJS usando guards y strategies de Passport;
- refresh tokens persistidos y validados del lado servidor;
- reutilización de utilidades de auth en frontends.

#### `sensor-readings`

Por qué es importante:

- conecta la captura de datos del sensor con el dominio clínico;
- soporta importación batch de lecturas históricas;
- evita duplicados por usuario + timestamp + fuente;
- dispara detección de alertas sin bloquear la respuesta.

Decisión técnica:

- procesamiento batch transaccional;
- creación de `LogEntry` para integrar la lectura actual al historial clínico;
- uso de cifrado antes de persistir.

#### `alerts`

Por qué es importante:

- convierte datos clínicos en acciones significativas;
- agrega personalización de umbrales y canales;
- es un módulo transversal que impacta backend, web y mobile.

Decisión técnica:

- configuración persistida por usuario;
- separación entre detección de alerta y visualización/acknowledgement;
- integración con dashboard, notificaciones y lecturas de sensor.

#### `messages`

Por qué es importante:

- habilita comunicación paciente-profesional;
- muestra arquitectura híbrida REST + WebSocket;
- resuelve conversación, rooms y sincronización en tiempo real.

Decisión técnica:

- namespace `/messages`;
- autenticación del socket con JWT;
- rooms por conversación;
- eventos de creación, lectura y listado de conversaciones;
- fallback y sincronización con estado persistido.

#### `reports`

Por qué es importante:

- produce evidencia funcional de alto valor para tesis;
- trabaja sobre datos individuales y grupales;
- genera salidas concretas para toma de decisiones clínicas.

Decisión técnica:

- soporte PDF/CSV;
- consultas batch para evitar N+1 en reportes grupales;
- integración opcional con Gemini para resumen IA;
- desencriptado controlado solo en backend para procesar datos clínicos.

### 5.3 Modelo de datos y dominios del backend

El schema Prisma refleja claramente el dominio del negocio.

Entidades principales:

- `User`
- `Account`
- `RefreshToken`
- `GlucoseEntry`
- `GlucoseReading`
- `InsulinDose`
- `Meal` / `MealItem`
- `LogEntry`
- `DoctorPatient`
- `Appointment`
- `Alert` / `AlertSettings`
- `Message`
- `PushDevice`

#### Decisiones de modelado importantes

- separación entre `GlucoseEntry` manual y `GlucoseReading` de sensor;
- existencia de `LogEntry` como agregador del historial clínico;
- relación explícita `DoctorPatient` para acoplar pacientes a un profesional;
- configuración clínica y preferencias en `User` y `AlertSettings`;
- soporte de multi-fuente de lectura: manual, Libre NFC, Dexcom u otras.

### 5.4 Seguridad y privacidad en backend

Puntos fuertes para defender:

- CORS definido por `ALLOWED_ORIGINS`;
- API versionada por URI;
- `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform`;
- documentación Swagger;
- cifrado AES-256-GCM para valores clínicos sensibles;
- claves y secretos validados por entorno;
- refresh tokens revocables;
- uso de DTOs y validación declarativa.

## 6. Web: módulos principales y funcionalidades destacadas

La app `web` está orientada al profesional de salud. Es una app con foco en operación clínica, seguimiento y toma de decisiones.

### 6.1 Estructura funcional

Rutas principales:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/dashboard`
- `/dashboard/patients`
- `/dashboard/patients/[id]`
- `/dashboard/appointments`
- `/dashboard/communication`
- `/dashboard/settings`

### 6.2 Módulos principales

- autenticación y sesión;
- dashboard general del profesional;
- gestión de pacientes;
- detalle de paciente;
- citas;
- mensajería;
- configuración y alertas;
- notificaciones.

### 6.3 Funcionalidades web más destacadas

#### Dashboard del profesional

Incluye:

- resumen de pacientes activos;
- alertas críticas;
- próximas citas;
- evolución glucémica;
- estadísticas de insulina;
- estadísticas de comidas.

Valor arquitectónico:

- usa hooks específicos (`useDashboard*`) y React Query;
- separa pantalla, componentes visuales y capa `lib/*-api.ts`;
- persiste filtros globales como el rango temporal.

#### Gestión de pacientes

Incluye:

- listado y filtros;
- búsqueda;
- asignación de pacientes;
- ficha individual;
- parámetros terapéuticos;
- gráficos de glucosa e insulina;
- historial y logs.

Valor arquitectónico:

- la web consume datos agregados de `dashboard` y datos específicos de `doctor-patient`;
- la edición clínica queda encapsulada en componentes dedicados.

#### Comunicación

Incluye:

- lista de conversaciones;
- chat con paciente;
- badges de mensajes no leídos;
- notificaciones de mensajes nuevos.

Valor arquitectónico:

- mezcla consultas persistidas con actualización por socket;
- usa renderizado dinámico en Next cuando la pantalla depende de auth + WebSocket;
- desacopla UI de transporte a través de hooks y librerías `messages-api` / `socket-client`.

#### Configuración y alertas

Incluye:

- umbrales;
- canales de notificación;
- preferencias de frecuencia;
- reconocimiento batch de alertas.

### 6.4 Decisiones técnicas importantes en web

- `Next.js` con App Router.
- `ProtectedRoute` para proteger vistas autenticadas.
- `AuthProvider` cliente con tokens en `localStorage`.
- renovación preventiva de access token usando `@glucosapp/auth-utils`.
- `React Query` como patrón principal de estado remoto.
- `MUI` para tema y componentes, con `Tailwind` para layout rápido.
- integración con `@glucosapp/theme` para mantener consistencia visual.

### 6.5 Estilo y organización web

La organización del código es clara:

- `app/` para rutas y páginas;
- `components/` para UI reutilizable;
- `hooks/` para acceso a datos y lógica de pantalla;
- `lib/` para capa de acceso a backend y utilidades específicas;
- `contexts/` para auth y búsqueda.

Esto facilita explicar separación de responsabilidades:

- la UI no llama directamente a `fetch`;
- la lógica de datos vive en hooks/lib;
- la navegación y la composición viven en App Router.

## 7. Mobile: módulos principales y funcionalidades destacadas

La app `mobile` está orientada al paciente. El foco es captura de datos, seguimiento diario y comunicación con su profesional.

### 7.1 Navegación principal

La navegación usa `React Navigation` con:

- `AuthNavigator`;
- `RootNavigator`;
- `TabNavigator`;
- stacks secundarios como `HomeStackNavigator`.

Tabs principales:

- `Inicio`
- `Historial`
- `Registrar`
- `Médico`
- `Perfil`

Además existen pantallas adicionales apiladas:

- `Calculator`
- `TreatmentParameters`
- `Communication`
- `Appointments`

### 7.2 Pantallas principales

- `HomeScreen`
- `HistoryScreen`
- `RegistrarScreen`
- `DoctorScreen`
- `ProfileScreen`
- `CalculatorScreen`
- `TreatmentParametersScreen`
- `CommunicationScreen`
- `AppointmentsScreen`
- `NFCScanScreen`
- `ScanScreen`
- `StatsScreen`
- `OnboardingScreen`
- `WelcomeScreen`
- `SettingsScreen`

### 7.3 Funcionalidades mobile más destacadas

#### Registro clínico (`RegistrarScreen`)

Es una de las pantallas más ricas del proyecto:

- permite ingresar glucosa, carbohidratos e insulina;
- calcula dosis en tiempo real;
- distingue entre comida y corrección;
- incorpora contexto clínico: ejercicio, alcohol, estrés, enfermedad, menstruación, comida alta en grasa;
- usa validación con debounce;
- soporta edición manual de la dosis calculada;
- usa el horario para inferir categoría de comida.

Valor arquitectónico:

- combina UX guiada con lógica clínica reutilizable;
- se apoya en hooks especializados de cálculo en tiempo real;
- consume parámetros del perfil del usuario para personalizar el cálculo.

#### Pantalla de inicio (`HomeScreen`)

Muestra:

- glucosa media;
- dosis diaria total;
- comidas registradas;
- acceso rápido a cálculo e historial;
- acceso directo a escaneo NFC.

#### Lectura de sensor (`NFCScanScreen`)

Es un módulo muy importante para demo y defensa porque:

- vincula hardware/capacidades del móvil con el backend;
- envía lecturas al módulo `sensor-readings`;
- actualiza el historial y puede disparar alertas.

#### Comunicación

La pantalla `CommunicationScreen`:

- muestra la conversación con el médico asignado;
- soporta mensajes en tiempo real;
- maneja estados de envío, cola y reintento;
- marca lectura en batch;
- combina socket, outbox y cache.

Este punto es especialmente fuerte porque muestra tolerancia a estados de red no ideales.

#### Onboarding y auth

La app mobile:

- usa Google Sign-In con deep linking;
- guarda tokens en almacenamiento seguro;
- detecta si el usuario necesita onboarding;
- completa perfil mínimo antes de entrar al flujo principal.

### 7.4 Decisiones técnicas importantes en mobile

- `Expo` para acelerar desarrollo multiplataforma;
- `Secure Store` para tokens en vez de almacenamiento plano;
- `React Query` para cache y sincronización;
- navegación por tabs + stacks para separar tareas frecuentes de flujos profundos;
- `socket.io-client` para comunicación en tiempo real;
- integración con capacidades nativas: NFC, notificaciones, cámara, galería y compartir.

### 7.5 Estilo y organización mobile

La app está separada en:

- `screens/`
- `components/`
- `hooks/`
- `lib/`
- `navigation/`
- `contexts/`

Eso permite explicar una arquitectura clara:

- pantallas componen experiencia;
- hooks encapsulan acceso y comportamiento;
- `lib/` resuelve integración técnica;
- `navigation/` define la experiencia de flujo.

## 8. Paquetes compartidos más importantes

### `@glucosapp/api-client`

Cliente HTTP compartido por web y mobile.

Valor:

- evita duplicar wrapper de `fetch`;
- centraliza timeout, parseo y manejo de errores;
- da una interfaz uniforme `GET/POST/PATCH/PUT/DELETE`.

### `@glucosapp/types`

Contrato compartido del sistema.

Valor:

- reduce divergencias entre frontend y backend;
- define enums y tipos del dominio: usuarios, alertas, turnos, perfiles, glucosa, dosis, etc.

### `@glucosapp/mdi-insulin-algorithm`

Paquete clínico de alto valor.

Valor:

- separa la lógica de cálculo del backend y de la UI;
- facilita testearla de forma aislada;
- hace explícita la intención de reutilización y mantenibilidad.

Incluye:

- cálculo de dosis;
- IOB;
- COB;
- funciones de seguridad;
- validaciones;
- recomendaciones y análisis.

### `@glucosapp/auth-utils`

Helpers compartidos para expiración y lectura de JWT.

Valor:

- evita reimplementar manejo de expiración en web y mobile.

### `@glucosapp/env`

Validación de variables de entorno con `zod`.

Valor:

- previene configuraciones inválidas;
- documenta defaults y claves obligatorias;
- unifica criterios de entorno entre proyectos.

### `@glucosapp/theme`

Tokens visuales compartidos.

Valor:

- mantiene consistencia entre web y mobile;
- define colores, spacing, tipografía y bordes como fuente única.

### `@glucosapp/config`

Configuración compartida de ESLint, Prettier y tsconfig.

Valor:

- estandariza estilo y validaciones;
- reduce drift entre apps.

## 9. Decisiones arquitectónicas que conviene destacar en la presentación

### 9.1 Monorepo con paquetes compartidos

Se priorizó coherencia entre aplicaciones y reutilización real de dominio.

Beneficios:

- menos duplicación;
- contratos comunes;
- mantenimiento más simple;
- mejor trazabilidad de cambios.

### 9.2 Backend modular por dominio

El backend no está separado solo por “controllers/services” globales, sino por módulos del negocio.

Beneficios:

- mayor claridad funcional;
- escalabilidad conceptual;
- facilita asignar responsabilidades por feature;
- más fácil de defender académicamente.

### 9.3 Lógica clínica extraída a paquete independiente

El cálculo de insulina no quedó “pegado” a una pantalla o a un servicio.

Beneficios:

- testabilidad;
- reutilización;
- mejor separación entre lógica clínica y capa de transporte.

### 9.4 Datos sensibles cifrados

Los valores de glucosa se almacenan cifrados con AES-256-GCM.

Beneficios:

- mejora postura de privacidad;
- muestra conciencia sobre datos de salud;
- refuerza la seriedad del diseño.

### 9.5 Tiempo real solo donde agrega valor

Socket.IO se usa sobre todo en mensajería y notificaciones, no para todo el sistema.

Beneficios:

- complejidad acotada;
- uso pragmático del tiempo real;
- mezcla adecuada entre REST para CRUD/consulta y WebSocket para eventos.

### 9.6 React Query como estrategia de estado remoto

Tanto web como mobile usan un patrón consistente de fetching, cache, invalidación y sincronización.

Beneficios:

- simplifica manejo de datos;
- mejora UX;
- reduce estado manual disperso.

## 10. Testing, cobertura y calidad

## 10.1 Enfoque general

El repositorio tiene una estrategia fuerte de testing automatizado distribuida entre apps y paquetes.

Inventario aproximado de archivos de tests detectados:

- backend: `44`
- web: `66`
- mobile: `55`
- packages: `14`
- total: `179`

Esto da una buena señal de cobertura funcional y de componentes, especialmente para una tesis/proyecto integrador.

## 10.2 Runners de test

- `backend`: `Jest`
- `web`: `Jest` con integración Next.js
- `mobile`: `Jest` con `babel-jest`
- `packages/mdi-insulin-algorithm`: `Vitest`
- `packages/auth-utils` y `packages/utils`: `Jest`

## 10.3 Política de cobertura

Las tres apps principales comparten mínimos globales:

- branches: `70`
- functions: `82`
- lines: `82`
- statements: `82`

Esto es importante para defender disciplina de calidad porque no es solo “hay tests”, sino que existe un umbral explícito.

## 10.4 Qué tipo de tests se observan

- unit tests de servicios backend;
- tests de hooks;
- tests de componentes;
- tests de pantallas mobile;
- tests de auth;
- tests de APIs cliente;
- tests de sockets/mensajería;
- tests del algoritmo clínico.

## 10.5 Lint, formato y chequeos

### Lint

- ESLint centralizado vía `@glucosapp/config`.
- Config base para TypeScript.
- Config React compartida para web y mobile.

### Formato

- Prettier definido a nivel repo.
- estilo consistente con `semi: true`, `singleQuote: false`, `printWidth: 100`.

### Typecheck

- `tsc` por workspace.
- `pre-push` corre `pnpm typecheck`.

### Hooks Git

- `pre-commit`: `pnpm lint-staged`
- `pre-push`: `pnpm typecheck`
- `commit-msg`: `commitlint`

### lint-staged

Hace dos cosas:

- corre `prettier --write` en archivos staged;
- agrupa archivos por workspace y corre `eslint --max-warnings=0` por proyecto afectado.

Eso es una decisión bastante buena porque evita correr lint completo innecesariamente y mantiene feedback rápido.

## 10.6 CI

El workflow principal de GitHub Actions ejecuta:

1. checkout
2. setup de `pnpm`
3. setup de `Node 20`
4. `pnpm install --frozen-lockfile`
5. `pnpm -C apps/backend prisma:generate`
6. `pnpm lint`
7. `pnpm typecheck`
8. `pnpm test`
9. `pnpm build`

Además existe un workflow de protección de ramas que obliga a respetar el flujo `feature -> develop -> master/main`.

## 11. Estilo de desarrollo y señales de madurez

Buenas señales que conviene remarcar:

- TypeScript en todo el stack.
- contratos compartidos.
- validación de entorno.
- documentación de arquitectura y setup.
- CI alineada con validaciones locales.
- hooks Git para prevenir deuda antes del push.
- documentación Swagger.
- thresholds de cobertura.
- separación clara entre responsabilidades.
- tests también en paquetes de dominio, no solo en apps.

## 12. Flujos funcionales recomendados para mostrar en la presentación

### Flujo 1: autenticación

1. registro/login;
2. sesión activa;
3. refresh token;
4. acceso protegido.

Por qué mostrarlo:

- demuestra seguridad, roles y consistencia entre clientes.

### Flujo 2: registro clínico del paciente

1. carga de glucosa y carbohidratos;
2. cálculo de insulina;
3. almacenamiento en backend;
4. visualización en historial y estadísticas.

Por qué mostrarlo:

- conecta mobile, backend, modelo clínico y visualización.

### Flujo 3: lectura de sensor / NFC

1. escaneo en mobile;
2. batch de lecturas;
3. persistencia cifrada;
4. alertas y actualización de historial.

Por qué mostrarlo:

- demuestra integración avanzada y valor diferencial.

### Flujo 4: alertas clínicas

1. llega una lectura fuera de rango;
2. backend evalúa reglas;
3. se genera alerta;
4. profesional la ve y puede reconocerla.

Por qué mostrarlo:

- conecta lógica clínica, dashboard y notificaciones.

### Flujo 5: mensajería paciente-profesional

1. paciente envía mensaje;
2. WebSocket lo propaga;
3. profesional recibe notificación;
4. se marca como leído.

Por qué mostrarlo:

- muestra tiempo real y valor asistencial.

### Flujo 6: reportes

1. profesional selecciona paciente o grupo;
2. backend agrega datos;
3. genera PDF/CSV;
4. opcionalmente agrega resumen IA.

Por qué mostrarlo:

- evidencia analítica y valor profesional del sistema.

## 13. Posibles preguntas y respuestas cortas

### ¿Por qué un monorepo?

Porque tenemos tres superficies del mismo producto y necesitábamos compartir tipos, lógica clínica, cliente API y configuración sin duplicación.

### ¿Por qué NestJS en backend?

Porque ofrece una estructura modular clara, inyección de dependencias, guards, pipes y una muy buena base para una API mantenible.

### ¿Por qué Prisma?

Porque facilita modelado tipado, migraciones y acceso consistente a PostgreSQL.

### ¿Por qué separar `GlucoseEntry` y `GlucoseReading`?

Porque una representa ingreso manual y la otra datos de sensor; ambas tienen semántica distinta aunque luego puedan converger en análisis e historial.

### ¿Por qué extraer el algoritmo clínico a un paquete?

Para poder testearlo, reutilizarlo y mantenerlo independiente de la UI y del framework backend.

### ¿Cómo manejan calidad?

Con ESLint, Prettier, TypeScript, Husky, lint-staged, commitlint, CI y thresholds de cobertura.

### ¿Cómo manejan seguridad?

Con JWT, refresh tokens, validación de input, CORS controlado, secretos por entorno y cifrado de datos sensibles.

### ¿Cómo manejan tiempo real?

Usamos REST para operaciones estándar y Socket.IO solo para mensajería/notificaciones, donde realmente agrega valor.

## 14. Riesgos, deuda o puntos a mencionar con honestidad

Si en la defensa surge una pregunta de mejora futura, se pueden mencionar estos puntos como evolución natural:

- endurecer aún más la observabilidad y métricas operativas;
- ampliar pruebas end-to-end integradas;
- fortalecer más integraciones externas productivas;
- seguir refinando sincronización offline/online en mobile;
- ampliar internacionalización y personalización.

Decir esto no debilita la presentación; al contrario, muestra criterio de ingeniería y capacidad de evolución.

## 15. Resumen ejecutivo final

Si hay que resumir el repositorio en pocas líneas:

- es un monorepo full-stack tipado;
- separa claramente backend, web y mobile;
- centraliza la lógica clínica y contratos compartidos;
- prioriza seguridad y privacidad sobre datos de salud;
- implementa flujos clínicos reales: registro, cálculo, alertas, comunicación y reportes;
- tiene una base sólida de calidad con tests, lint, hooks y CI.

## 16. Nota de uso

Este documento fue construido a partir de inspección estática del repositorio y su documentación local. Sirve como referencia técnica de arquitectura y organización del código. Si antes de la defensa se quiere complementar con métricas reales de ejecución, conviene correr:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
