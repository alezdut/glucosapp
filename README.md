# Glucosapp

Monorepo para la aplicación Glucosapp, gestionado con pnpm workspaces y Turborepo.

## Descripción

Glucosapp es una aplicación completa para el seguimiento de glucosa en sangre que incluye:

- **Backend**: API REST con NestJS, Prisma y PostgreSQL
- **Web**: Aplicación Next.js con Material-UI
- **Mobile**: Aplicación Expo/React Native
- **Packages compartidos**: Configuración, tipos, cliente API y utilidades

## Requisitos Previos

- **Node.js 20.x** (recomendado: 20.19.5 via nvm)
- **pnpm 9.12.2** (se activa automáticamente con corepack)
- **Docker Desktop** (para la base de datos PostgreSQL)
- **PostgreSQL 16+** (opcional, si no usas Docker)

## Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd glucosapp
```

### 2. Habilitar corepack y pnpm

```bash
corepack enable
corepack prepare pnpm@9.12.2 --activate
```

### 3. Instalar dependencias

```bash
pnpm install
```

### 4. Construir packages compartidos

```bash
pnpm -r --filter "@glucosapp/*" build
```

## Comandos de desarrollo

### Stack principal: backend + web

El flujo recomendado para desarrollo diario es:

```bash
pnpm dev
```

Ese comando:

- levanta PostgreSQL con Docker
- arranca `backend`, `web` y los packages compartidos necesarios
- deja `mobile` fuera del stack principal

URLs esperadas:

- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- Web: `http://localhost:3001`

### Mobile por separado

La app mobile debe correrse aparte:

```bash
pnpm dev:mobile
```

Ese comando corre Expo directamente, sin pasar por `turbo`, para que la consola interactiva funcione bien y puedas usar atajos como:

- `i` para abrir iOS Simulator
- `a` para abrir Android Emulator
- `w` para abrir la versión web
- `shift+i` para cambiar entre Expo Go y development build cuando aplique

Si quieres abrir el simulador directamente sin entrar primero en la consola interactiva:

```bash
pnpm dev:mobile:ios
pnpm dev:mobile:android
pnpm dev:mobile:web
```

Si quieres levantar todo el monorepo, incluyendo mobile:

```bash
pnpm dev:all
```

### Comandos útiles

```bash
pnpm db:start
pnpm db:stop
pnpm docker:dev
pnpm docker:down
```

## Configuración

### Base de Datos

Inicia la base de datos PostgreSQL con Docker:

```bash
docker compose up -d db
```

También puedes usar:

```bash
pnpm db:start
```

### Backend

Crea el archivo `apps/backend/.env` con las variables mínimas requeridas:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/glucosapp?schema=public"
JWT_ACCESS_SECRET="tu-secreto-de-al-menos-32-caracteres"
JWT_REFRESH_SECRET="tu-secreto-de-al-menos-32-caracteres"
ENCRYPTION_KEY="tu-clave-hex-de-64-caracteres"
```

**Nota**: Para ver todas las variables de entorno disponibles y cómo generarlas, consulta la sección [Variables de Entorno Completas](#variables-de-entorno-completas) más abajo.

### Ejecutar migraciones de Prisma

```bash
pnpm -C apps/backend prisma:generate
pnpm -C apps/backend prisma:migrate
```

Esto sigue siendo necesario al menos una vez en una base nueva.

### Web

Crea el archivo `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Mobile (Opcional)

Si vas a desarrollar la app móvil, configura `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=tu-google-client-id
```

**Nota**: Para dispositivos físicos, usa la IP de tu máquina en lugar de `localhost`:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.XXX:3000
```

## Variables de Entorno Completas

### Backend (`apps/backend/.env`)

#### Variables Requeridas

```env
# Base de datos
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/glucosapp?schema=public"

# JWT - Genera secretos seguros (mínimo 32 caracteres)
JWT_ACCESS_SECRET="tu-secreto-de-al-menos-32-caracteres"
JWT_REFRESH_SECRET="tu-secreto-de-al-menos-32-caracteres"

# Encriptación - Genera una clave de 64 caracteres hex (32 bytes)
ENCRYPTION_KEY="genera-una-clave-hex-de-64-caracteres-aqui"
```

**Generar secretos JWT**:

```bash
openssl rand -base64 32
```

**Generar clave de encriptación**:

```bash
# Opción 1: Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opción 2: Usando OpenSSL
openssl rand -hex 32
```

#### Variables Opcionales

```env
# Servidor
PORT=3000
NODE_ENV="development"  # development | test | production

# JWT - Expiración (valores por defecto)
JWT_ACCESS_EXPIRATION="15m"    # 15 minutos
JWT_REFRESH_EXPIRATION="7d"     # 7 días

# Google OAuth (ver sección de Google SSO)
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/v1/auth/google/callback"
GOOGLE_MOBILE_CALLBACK_URL="http://localhost:3000/v1/auth/google/mobile/callback"

# Email/SMTP (para verificación de email y reset de contraseña)
SMTP_HOST="smtp.gmail.com"           # Servidor SMTP
SMTP_PORT="587"                      # Puerto (587 para TLS, 465 para SSL)
SMTP_USER="tu-email@gmail.com"      # Usuario SMTP
SMTP_PASS="tu-contraseña-de-app"     # Contraseña o App Password

# Frontend
FRONTEND_URL="http://localhost:3001"  # URL del frontend para redirects

# CORS (separado por comas, sin espacios)
ALLOWED_ORIGINS="http://localhost:3001,http://localhost:8082"
```

**Notas sobre SMTP**:

- Para Gmail, necesitas generar una "App Password" en tu cuenta de Google
- En desarrollo, si no configuras SMTP, los tokens de verificación se mostrarán en los logs del backend
- El servicio de email funciona sin SMTP, pero no enviará correos reales

### Web (`apps/web/.env.local`)

#### Variables Requeridas

```env
# URL base de la API backend
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"
```

**Nota**: En producción, usa la URL completa del backend:

```env
NEXT_PUBLIC_API_BASE_URL="https://api.tu-dominio.com"
```

### Mobile (`apps/mobile/.env`)

#### Variables Requeridas

```env
# URL base de la API backend
EXPO_PUBLIC_API_BASE_URL="http://localhost:3000"
```

#### Variables Opcionales

```env
# Google OAuth Client ID (para inicio de sesión con Google)
EXPO_PUBLIC_GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
```

**Notas**:

- Para dispositivos físicos, usa la IP de tu máquina: `http://192.168.1.XXX:3000`
- Para desarrollo con ngrok, usa la URL de ngrok: `https://abc123.ngrok-free.app`
- El Client ID debe coincidir con el configurado en Google Cloud Console

## Dockerización

El repositorio ya soporta una opción Docker para `db + api + web`:

```bash
pnpm docker:dev
```

Notas:

- Es útil para un entorno reproducible o para onboarding rápido.
- No es la mejor opción para la app mobile; Expo/simulators conviene correrlos fuera de Docker.
- Para desarrollo diario, `pnpm dev` suele ser más práctico porque deja `backend + web` en modo watch y mantiene `mobile` separado.

### Variables de Entorno Globales

Estas variables pueden ser útiles en cualquier parte del proyecto:

```env
# Entorno de ejecución
NODE_ENV="development"  # development | test | production
```

### Ejemplo de Archivo `.env` Completo para Backend

```env
# ============================================
# REQUERIDAS
# ============================================
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/glucosapp?schema=public"
JWT_ACCESS_SECRET="tu-secreto-jwt-access-generado-con-openssl"
JWT_REFRESH_SECRET="tu-secreto-jwt-refresh-generado-con-openssl"
ENCRYPTION_KEY="tu-clave-de-encriptacion-hex-de-64-caracteres"

# ============================================
# OPCIONALES - Servidor
# ============================================
PORT=3000
NODE_ENV="development"

# ============================================
# OPCIONALES - JWT
# ============================================
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# ============================================
# OPCIONALES - Google OAuth
# ============================================
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/v1/auth/google/callback"
GOOGLE_MOBILE_CALLBACK_URL="http://localhost:3000/v1/auth/google/mobile/callback"

# ============================================
# OPCIONALES - Email/SMTP
# ============================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-email@gmail.com"
SMTP_PASS="tu-app-password"

# ============================================
# OPCIONALES - Frontend y CORS
# ============================================
FRONTEND_URL="http://localhost:3001"
ALLOWED_ORIGINS="http://localhost:3001,http://localhost:8082"
```

### Verificación de Variables de Entorno

Para verificar que todas las variables requeridas estén configuradas:

```bash
# Backend - Verifica que las variables estén cargadas
cd apps/backend
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓' : '✗'); console.log('JWT_ACCESS_SECRET:', process.env.JWT_ACCESS_SECRET ? '✓' : '✗'); console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? '✓' : '✗');"
```

## Configuración de Google SSO

Para habilitar el inicio de sesión con Google en la aplicación móvil, necesitas configurar OAuth 2.0 tanto en Google Cloud Console como en tu aplicación.

### 1. Configuración en Google Cloud Console

1. **Accede a Google Cloud Console**:
   - Ve a https://console.cloud.google.com/
   - Crea un nuevo proyecto o selecciona uno existente

2. **Habilita la API de Google+**:
   - Navega a "APIs & Services" > "Library"
   - Busca "Google+ API" y habilítala

3. **Crea credenciales OAuth 2.0**:
   - Ve a "APIs & Services" > "Credentials"
   - Haz clic en "Create Credentials" > "OAuth client ID"
   - Si es la primera vez, configura la pantalla de consentimiento OAuth

4. **Configura el cliente OAuth para móvil**:
   - Tipo de aplicación: **iOS** o **Android**
   - **Para iOS**:
     - Bundle ID: `com.glucosapp.mobile`
   - **Para Android**:
     - Package name: `com.glucosapp.mobile`
     - SHA-1 certificate fingerprint (opcional para desarrollo)

5. **Configura URIs de redireccionamiento**:
   - En la configuración del cliente OAuth, agrega las siguientes URIs autorizadas:
     - Para desarrollo local: `http://localhost:3000/v1/auth/google/mobile/callback`
     - Para desarrollo con ngrok: `https://TU-URL-NGROK.ngrok-free.app/v1/auth/google/mobile/callback`
     - Para producción: `https://tu-dominio.com/v1/auth/google/mobile/callback`
   - **Esquema personalizado para la app**: `glucosapp://auth/callback`

6. **Copia las credenciales**:
   - Anota el **Client ID** y **Client Secret** generados

### 2. Configuración en el Backend

Agrega las variables de Google OAuth a `apps/backend/.env`. Consulta la sección [Variables de Entorno Completas](#variables-de-entorno-completas) para ver todas las variables disponibles.

Las variables necesarias son:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `GOOGLE_MOBILE_CALLBACK_URL`

**Nota**: Si usas ngrok (recomendado para desarrollo móvil), actualiza `GOOGLE_MOBILE_CALLBACK_URL` con la URL de ngrok. Ver sección de ngrok más abajo.

### 3. Configuración en la App Móvil

Agrega las variables necesarias a `apps/mobile/.env`. Consulta la sección [Variables de Entorno Completas](#variables-de-entorno-completas) para ver todas las variables disponibles.

Las variables necesarias son:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`

**Nota**: Para dispositivos físicos o cuando uses ngrok, actualiza `EXPO_PUBLIC_API_BASE_URL` con la URL correspondiente.

### 4. Verificar la Configuración

1. Asegúrate de que el backend esté corriendo
2. Verifica que las URLs de callback en Google Cloud Console coincidan exactamente con las configuradas en el backend
3. Inicia la app móvil y prueba el inicio de sesión con Google

## Desarrollo con ngrok

ngrok permite exponer tu localhost a Internet, facilitando el desarrollo móvil y evitando problemas con Google OAuth cuando cambias de red WiFi.

### ¿Por qué usar ngrok?

- **URL pública estable**: Funciona desde cualquier red sin cambiar IPs
- **HTTPS automático**: Requerido por Google OAuth
- **Evita reconfiguración**: No necesitas actualizar Google Cloud Console cada vez que cambias de red

### Instalación de ngrok

```bash
# macOS (con Homebrew)
brew install ngrok

# Verificar instalación
which ngrok
```

### Configuración inicial (solo una vez)

1. **Crea una cuenta gratuita** en https://ngrok.com
2. **Autentica ngrok** con tu token:
   ```bash
   ngrok config add-authtoken TU_TOKEN_AQUI
   ```

### Uso diario

#### Iniciar ngrok y actualizar configuración

El proyecto incluye un script que automatiza todo el proceso:

```bash
./start-dev-ngrok.sh
```

Este script:

- ✅ Inicia ngrok en segundo plano (puerto 3000)
- ✅ Obtiene la URL pública de ngrok
- ✅ Actualiza `apps/backend/.env` con `GOOGLE_MOBILE_CALLBACK_URL`
- ✅ Actualiza `apps/mobile/.env` con `EXPO_PUBLIC_API_BASE_URL`
- ✅ Crea backups de los archivos `.env` originales
- ✅ Muestra la URL que debes agregar en Google Cloud Console

#### Actualizar Google Cloud Console

Después de ejecutar el script, verás una URL como:

```
https://abc123.ngrok-free.app/v1/auth/google/mobile/callback
```

1. Ve a https://console.cloud.google.com/apis/credentials
2. Edita tu **OAuth 2.0 Client ID** para móvil
3. En **"URIs de redireccionamiento autorizados"**, agrega:
   ```
   https://TU-URL-NGROK.ngrok-free.app/v1/auth/google/mobile/callback
   ```
4. Guarda los cambios

#### Reiniciar servicios

Después de actualizar la configuración:

```bash
# Reiniciar backend (en otra terminal)
cd apps/backend
pnpm dev

# Reiniciar app móvil (en otra terminal)
cd apps/mobile
pnpm dev
```

#### Detener ngrok

Cuando termines de desarrollar:

```bash
./stop-dev-ngrok.sh
```

Este script:

- Detiene ngrok
- Te pregunta si quieres restaurar las IPs locales en los `.env`

### Notas importantes sobre ngrok

⚠️ **URL dinámica (cuenta gratuita)**:

- Con la cuenta gratuita, cada vez que reinicias ngrok obtienes una URL diferente
- Necesitarás actualizar Google Cloud Console con la nueva URL
- El script `start-dev-ngrok.sh` te muestra la nueva URL cada vez

💡 **URL estática (plan de pago)**:

- Con un plan de pago (~$8/mes) puedes obtener un dominio estático
- Esto evita tener que actualizar Google Cloud Console constantemente

🔧 **Dashboard de ngrok**:

- Accede al dashboard en http://localhost:4040 para ver el tráfico y logs
- Útil para debugging de requests

### Troubleshooting con ngrok

**"No se pudo obtener la URL de ngrok"**:

- Espera unos segundos después de iniciar ngrok
- Verifica que ngrok esté corriendo: `lsof -Pi :4040 -sTCP:LISTEN`
- Revisa los logs: `tail -f /tmp/ngrok.log`

**"Address already in use"**:

- El puerto 3000 ya está en uso
- Libera el puerto: `lsof -ti:3000 | xargs kill -9`

**La app móvil no puede conectar**:

- Verifica que el backend esté corriendo
- Verifica que la URL en `apps/mobile/.env` sea correcta
- Abre la URL de ngrok en un navegador para confirmar que funciona

**Google OAuth falla**:

- Verifica que la URL de callback en Google Cloud Console coincida exactamente
- Asegúrate de haber reiniciado el backend después de actualizar `.env`
- Revisa los logs del backend para ver errores específicos

## Ejecución

### Desarrollo (todas las apps)

Para iniciar todas las aplicaciones en modo desarrollo:

```bash
pnpm dev
```

Esto iniciará:

- **Backend** en http://localhost:3000
- **Web** en http://localhost:3001
- **Mobile** en el servidor Expo (puerto 8082)

### Desarrollo (apps individuales)

```bash
# Backend
pnpm -C apps/backend dev

# Web
pnpm -C apps/web dev

# Mobile
pnpm -C apps/mobile dev
```

## URLs Importantes

- **Backend API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/v1/health
- **Web App**: http://localhost:3001
- **Expo Dev Server**: http://localhost:8082

## Estructura del Monorepo

```
glucosapp/
├── apps/
│   ├── backend/          # NestJS API con Prisma y Swagger
│   ├── web/              # Next.js App Router con Material-UI
│   └── mobile/           # Expo + React Native
├── packages/
│   ├── config/           # Configuración compartida (ESLint, Prettier, TSConfig)
│   ├── env/              # Cargador de variables de entorno con Zod
│   ├── types/            # Tipos TypeScript compartidos
│   ├── api-client/       # Cliente HTTP basado en openapi-fetch
│   ├── theme/            # Tema compartido
│   └── utils/            # Utilidades compartidas
└── docker-compose.yml     # Servicios Docker (PostgreSQL + API)
```

## Comandos Útiles

### Construcción

```bash
# Construir todas las apps
pnpm build

# Construir una app específica
pnpm -C apps/backend build
pnpm -C apps/web build
```

### Linting y Type Checking

```bash
# Lint en todo el monorepo
pnpm lint

# Type check en todo el monorepo
pnpm typecheck
```

### Base de Datos

```bash
# Generar Prisma Client
pnpm -C apps/backend prisma:generate

# Ejecutar migraciones
pnpm -C apps/backend prisma:migrate

# Abrir Prisma Studio (GUI)
pnpm -C apps/backend prisma studio

# Reiniciar base de datos (⚠️ elimina todos los datos)
pnpm -C apps/backend prisma migrate reset
```

### Docker

```bash
# Iniciar solo la base de datos
docker compose up -d db

# Iniciar base de datos y API
docker compose up -d db api

# Detener todos los servicios
docker compose down
```

## Solución de Problemas

### Puerto en uso

Si un puerto está ocupado, puedes liberarlo:

```bash
# Liberar puertos comunes
lsof -ti:3000,3001,8081,8082 | xargs kill -9
```

### Error de conexión a la base de datos (P1001)

- Verifica que PostgreSQL esté corriendo: `docker compose up -d db`
- Revisa la variable `DATABASE_URL` en `apps/backend/.env`
- Verifica la conexión: `psql $DATABASE_URL`

### Errores de Prisma

```bash
# Regenerar el cliente
pnpm -C apps/backend prisma:generate

# Ejecutar migraciones pendientes
pnpm -C apps/backend prisma:migrate
```

### Problemas con Expo en dispositivos físicos

Asegúrate de usar la IP de tu máquina en lugar de `localhost`:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.XXX:3000
```

Puedes encontrar tu IP con:

```bash
# macOS/Linux
ipconfig getifaddr en0  # o en1, según tu interfaz

# Windows
ipconfig
```

## Documentación Adicional

- [Backend README](./apps/backend/README.md) - Documentación completa del backend
- [Web README](./apps/web/README.md) - Documentación de la aplicación web
- [Mobile README](./apps/mobile/README.md) - Documentación de la aplicación móvil

## CI/CD

El proyecto incluye GitHub Actions que ejecutan:

- Instalación de dependencias
- Construcción de todas las apps
- Linting
- Type checking

## Convenciones

- **Commits**: Se usa Conventional Commits (feat, fix, chore, etc.)
- **Pre-commit**: Husky ejecuta lint-staged (Prettier)
- **Versionado API**: URI-based v1 (`/v1/*`)

## Licencia

[Especificar licencia si aplica]
