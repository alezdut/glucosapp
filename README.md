# Glucosapp

Monorepo de una plataforma para seguimiento de glucosa, soporte al cálculo de insulina y comunicación entre paciente y profesional de salud.

## Qué contiene

- `apps/backend`: API REST en NestJS + Prisma + PostgreSQL.
- `apps/web`: aplicación Next.js orientada a profesionales.
- `apps/mobile`: aplicación Expo/React Native orientada a pacientes.
- `packages/*`: tipos, utilidades, cliente API, tema y algoritmo clínico compartido.

## Documentación clave

- [Arquitectura](./docs/ARCHITECTURE.md)
- [Puesta en marcha reproducible](./docs/SETUP.md)
- [Guion de demo](./docs/DEMO_SCRIPT.md)

## Requisitos

- Node.js 20.x
- `corepack`
- `pnpm` 9.12.2
- Docker Desktop para PostgreSQL

## Inicio rápido

```bash
corepack enable
corepack prepare pnpm@9.12.2 --activate
pnpm install

cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

pnpm db:start
pnpm -C apps/backend prisma:generate
pnpm -C apps/backend prisma:migrate
pnpm dev
```

URLs esperadas:

- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- Web: `http://localhost:3001`

La app mobile se corre por separado:

```bash
pnpm dev:mobile
```

## Scripts principales

```bash
pnpm dev
pnpm dev:all
pnpm dev:mobile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

## Flujo de calidad

- `pre-commit`: ejecuta `lint-staged`.
- `lint-staged`: corre `prettier --write` sobre archivos staged compatibles y luego `eslint --max-warnings=0` por workspace afectado.
- `pre-push`: ejecuta `pnpm typecheck` para evitar pushes con tipos rotos.
- CI ejecuta la misma base de validaciones del repositorio:
  - `pnpm install --frozen-lockfile`
  - `pnpm -C apps/backend prisma:generate`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

## Política de cobertura

- `apps/backend`, `apps/web` y `apps/mobile` comparten el mismo mínimo global de cobertura: `branches 70`, `functions 82`, `lines 82`, `statements 82`.
- Los `packages/*` con tests deben declarar `coverageThreshold` explícito en su runner correspondiente.
- Las exclusiones de cobertura deben limitarse a archivos estructurales, de configuración o de barrel export; no se usan para ocultar deuda funcional.

## Convenciones de entorno

- Backend usa `ALLOWED_ORIGINS` como única fuente de verdad para CORS y WebSocket.
- Web usa `NEXT_PUBLIC_API_BASE_URL`.
- Mobile usa `EXPO_PUBLIC_API_BASE_URL` y `EXPO_PUBLIC_IMAGE_ANALYSIS_BASE_URL`.
- Los defaults locales viven en `@glucosapp/env`; producción debe definir los valores críticos del backend explícitamente.

Si tocás auth, cálculo clínico, alertas, reportes o sincronización entre clientes y backend, sumá o ajustá tests en la misma rama.

## Evidencia técnica para tesis

Los flujos principales que se consideran evidencia funcional del sistema son:

- autenticación y sesión;
- registro y consulta de glucosa;
- cálculo de dosis de insulina;
- alertas clínicas;
- mensajería entre paciente y profesional;
- reportes y estadísticas.

## Validación antes de presentar

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Si querés más detalle operativo, seguí [docs/SETUP.md](./docs/SETUP.md). Si vas a mostrar el sistema en defensa, usá [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md) como checklist.
