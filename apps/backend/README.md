Glucosapp Backend (NestJS + Prisma + PostgreSQL)

Overview

- NestJS API with URI versioning (v1), class-validation pipes, and Swagger docs.
- Prisma ORM targeting PostgreSQL.
- Health endpoint: GET /v1/health → { ok: true }

Requirements

- Node 20.x (project uses nvm 20.19.5)
- pnpm 9.12.2 (corepack)
- PostgreSQL 16+ locally or Docker Desktop for docker-compose

Setup

1. Install dependencies at the repository root:
   pnpm install

2. Environment
   Create apps/backend/.env (if not present):
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/glucosapp?schema=public

3. Prisma
   - Generate client:
     pnpm -C apps/backend prisma:generate
   - Optional: create/migrate dev database (requires Postgres running):
     pnpm -C apps/backend prisma:migrate

Development

- Start dev server (port 3000):
  pnpm -C apps/backend dev

- Endpoints:
  - Health JSON: http://localhost:3000/v1/health → { ok: true }
  - Swagger UI: http://localhost:3000/docs

Build & Run

- Build:
  pnpm -C apps/backend build
- Start (production build):
  node apps/backend/dist/main.js

Docker (db + api)

- Compose file at repository root: docker-compose.yml
- Start database and API (Docker Desktop must be running):
  docker compose up -d db
  docker compose up -d api
- Stop all:
  docker compose down

Scripts (package.json)

- dev: ts-node-dev --respawn --transpile-only src/main.ts
- build: tsc -p tsconfig.json
- start:prod: node dist/main.js
- prisma:generate: prisma generate --schema prisma/schema.prisma
- prisma:migrate: prisma migrate dev --schema prisma/schema.prisma

Troubleshooting

- EADDRINUSE 3000: free the port
  lsof -ti:3000 | xargs kill -9
- Prisma P1001 (cannot reach DB): ensure PostgreSQL is running or use docker-compose.
- Swagger not loading: check logs in /tmp/glucosapp-backend.log (dev task writes there when started via helper scripts).
