Glucosapp Web (Next.js + React Query)

Overview

- Next.js 14 app using @tanstack/react-query to call the backend health endpoint through @glucosapp/api-client.
- Default dev port: 3001

Requirements

- Node 20.x, pnpm 9.12.2
- Backend running at http://localhost:3000 (or set env var below)

Setup

1. Install dependencies at the repository root:
   pnpm install

2. Environment
   Create apps/web/.env.local:
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

Development

- Start dev server on port 3001:
  pnpm -C apps/web dev
- Open http://localhost:3001
- Home page fetches http://localhost:3000/v1/health and displays the JSON.

Build & Start

- Build:
  pnpm -C apps/web build
- Start:
  pnpm -C apps/web start

How it works

- React Query is configured in src/app/providers.tsx.
- The page at src/app/page.tsx creates a client via makeApiClient(`${NEXT_PUBLIC_API_BASE_URL}/v1`) and calls GET("/health").

Scripts (package.json)

- dev: next dev -p 3001
- build: next build
- start: next start
- lint: next lint

Troubleshooting

- If lint config fails to load, root .eslintrc.cjs extends ./packages/config/eslint/index.cjs.
- Port 3001 busy: free it with lsof -ti:3001 | xargs kill -9 and rerun.
