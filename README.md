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
pnpm build
```

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
