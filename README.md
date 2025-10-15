Glucosapp Monorepo

Overview

- Monorepo managed with pnpm workspaces and Turborepo.
- Apps:
  - apps/backend: NestJS + Prisma + Swagger
  - apps/web: Next.js + React Query
  - apps/mobile: Expo + React Native + React Query
- Shared packages in packages/: config, env, types, api-client
- Tooling: Husky, lint-staged, Commitlint, GitHub Actions CI, Docker Compose (Postgres + API)

Requirements

- Node 20.x (nvm recommended; project uses 20.19.5)
- pnpm 9.12.2 via corepack
- For Docker: Docker Desktop

Workspace Layout

```
apps/
  backend/        NestJS API (v1) with Prisma and Swagger
  web/            Next.js app (port 3001) using React Query
  mobile/         Expo app using React Query
packages/
  config/         Shared eslint, prettier, tsconfig base
  env/            Zod-based env loader (build with tsup)
  types/          Shared TS types (User, GlucoseEntry)
  api-client/     HTTP client wrapper (openapi-fetch)
```

Getting Started

1. Install dependencies (root):

```
corepack enable
corepack prepare pnpm@9.12.2 --activate
pnpm install
```

2. Shared packages (built automatically in dev):

```
pnpm -r --filter "@glucosapp/*" build
```

3. Backend environment (local Postgres):
   Create apps/backend/.env

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/glucosapp?schema=public
```

4. Prisma (optional during dev if DB is running):

```
pnpm -C apps/backend prisma:generate
pnpm -C apps/backend prisma:migrate
```

Run in Development

- Monorepo (starts backend, web, mobile dev tasks):

```
pnpm dev
```

- Individual apps:

```
pnpm -C apps/backend dev   # http://localhost:3000 (Swagger /docs)
pnpm -C apps/web dev       # http://localhost:3001
pnpm -C apps/mobile dev    # Expo dev server (prefers port 8082)
```

Build

```
pnpm build                 # via Turborepo
```

Root Scripts (turbo.json -> tasks)

- dev: turbo run dev (persistent)
- build: turbo run build (outputs: dist/**, .next/**, build/\*\*)
- lint: turbo run lint
- typecheck: turbo run typecheck

Shared Packages

- @glucosapp/config: exports tsconfig base, eslint, prettier
- @glucosapp/env: EnvSchema (Zod) + loadEnv()/env
- @glucosapp/types: common types (User, GlucoseEntry)
- @glucosapp/api-client: makeApiClient(baseUrl) using openapi-fetch

Environment Variables

- Backend: DATABASE_URL (Postgres)
- Web: NEXT_PUBLIC_API_BASE_URL (default http://localhost:3000)
- Mobile: EXPO_PUBLIC_API_BASE_URL (default http://localhost:3000; use LAN IP for real devices)

Docker

- Compose services: db (postgres:16), api (backend Dockerfile)

```
docker compose up -d db
docker compose up -d api
docker compose down
```

Note: Ensure Docker Desktop is running.

CI (GitHub Actions)

- .github/workflows/ci.yml: Node 20, corepack/pnpm, install, build, lint, typecheck

Conventional Commits & Hooks

- Husky pre-commit runs lint-staged (prettier)
- commitlint validates messages (config-conventional)

Key Endpoints & URLs

- Backend Health: http://localhost:3000/v1/health → { ok: true }
- Swagger: http://localhost:3000/docs
- Web: http://localhost:3001 (renders health JSON)
- Expo: dev server prefers port 8082

Troubleshooting

- Port conflict (3000/3001/8081/8082):

```
lsof -ti:3000,3001,8081,8082 | xargs kill -9
```

- Prisma P1001 (cannot reach DB): start local Postgres or docker compose.
- Next.js + ESLint: repo pins ESLint 8.x for compatibility; root .eslintrc.cjs extends packages/config/eslint.
- Expo on real device: set EXPO_PUBLIC_API_BASE_URL to your machine LAN IP.

Per-App Docs

- apps/backend/README.md
- apps/web/README.md
- apps/mobile/README.md
