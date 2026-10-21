# Puesta en marcha reproducible

## Requisitos

- Node.js 20.x
- `corepack` habilitado
- `pnpm` 9.12.2
- Docker Desktop para PostgreSQL

## Instalación

```bash
corepack enable
corepack prepare pnpm@9.12.2 --activate
pnpm install
```

## Variables de entorno

Crear los siguientes archivos a partir de sus ejemplos:

- `apps/backend/.env`
- `apps/web/.env.local`
- `apps/mobile/.env`

Comandos sugeridos:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

Variables relevantes:

- Backend: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `ALLOWED_ORIGINS`, `FRONTEND_URL`
- Web: `NEXT_PUBLIC_API_BASE_URL`
- Mobile: `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_IMAGE_ANALYSIS_BASE_URL`

## Base de datos

Levantar PostgreSQL:

```bash
pnpm db:start
```

Generar cliente Prisma y correr migraciones:

```bash
pnpm -C apps/backend prisma:generate
pnpm -C apps/backend prisma:migrate
```

## Arranque del sistema

Stack principal:

```bash
pnpm dev
```

URLs esperadas:

- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- Web: `http://localhost:3001`

Mobile por separado:

```bash
pnpm dev:mobile
```

## Validación mínima previa a demo

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Resultado esperado

- La API responde en `3000`.
- La app web carga en `3001`.
- El entorno mobile puede conectarse al backend configurado.
- Los checks de calidad finalizan sin bypasses manuales.
