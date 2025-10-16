Glucosapp Web (Next.js + React Query)

📚 Documentación Importante

- Material Design Guide (./MATERIAL_DESIGN_GUIDE.md) - Guía completa para usar Material-UI en el proyecto
- Quickstart Guide (./QUICKSTART.md) - Guía de inicio rápido para desarrollo

🎨 Sistema de Diseño

Este proyecto utiliza Material-UI (MUI) v7 como sistema de diseño principal. Todas las páginas de autenticación y formularios están implementados con componentes de Material Design.

Overview

- Next.js 14 app with full authentication flow
- Uses @tanstack/react-query for data fetching
- Integrates with backend auth endpoints via @glucosapp/api-client
- Default dev port: 3001

Requirements

- Node 20.x, pnpm 9.12.2
- Backend running at http://localhost:3000 (or set env var below)
- Backend auth endpoints configured (see apps/backend/AUTH_SETUP.md)

Setup

1. Install dependencies at the repository root:
   pnpm install

2. Environment
   Create apps/web/.env.local:
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

3. Ensure backend is running with auth configured

Development

- Start dev server on port 3001:
  pnpm -C apps/web dev
- Open http://localhost:3001
- You'll be redirected to /login if not authenticated

Authentication Features

- Email/Password registration with email verification
- Login with access token and refresh token
- Automatic token refresh before expiration
- Email verification flow
- Password reset flow (forgot password)
- Protected routes requiring authentication
- User dashboard with profile information
- Logout functionality

Routes

- / - Home (redirects to /dashboard or /login)
- /login - Login page
- /register - Registration page
- /verify-email?token=... - Email verification
- /forgot-password - Request password reset
- /reset-password?token=... - Reset password with token
- /dashboard - Protected user dashboard

Build & Start

- Build:
  pnpm -C apps/web build
- Start:
  pnpm -C apps/web start

How it works

- React Query is configured in src/app/providers.tsx
- AuthProvider manages authentication state and tokens
- Tokens stored in localStorage (accessToken, refreshToken)
- Protected routes use ProtectedRoute wrapper component
- Auth API client handles all backend auth operations
- Automatic token refresh 1 minute before expiration

Key Files

- src/contexts/auth-context.tsx - Auth state management
- src/lib/auth-api.ts - Auth API client wrapper
- src/components/protected-route.tsx - Route protection
- src/app/(auth pages) - Login, register, verify, reset flows
- src/app/dashboard - Protected dashboard page

Scripts (package.json)

- dev: next dev -p 3001
- build: next build
- start: next start
- lint: next lint

Troubleshooting

- If lint config fails to load, root .eslintrc.cjs extends ./packages/config/eslint/index.cjs
- Port 3001 busy: free it with lsof -ti:3001 | xargs kill -9 and rerun
- If auth fails, ensure backend is running and configured correctly
- Check browser console for detailed error messages
- Token errors: clear localStorage and try logging in again
