# CLAUDE.md - AI Assistant Guide for Glucosapp

This document provides comprehensive guidance for AI assistants working on the Glucosapp codebase.

## Project Overview

**Glucosapp** is a full-stack diabetes management application built as a monorepo with:
- **Backend**: NestJS REST API with PostgreSQL/Prisma
- **Web**: Next.js 14 App Router with Material-UI
- **Mobile**: Expo/React Native application
- **Shared Packages**: Common types, utilities, theme, and API client

**Tech Stack**: TypeScript, pnpm workspaces, Turborepo, Docker

## Repository Structure

```
glucosapp/
├── apps/
│   ├── backend/          # NestJS REST API (port 3000)
│   ├── web/              # Next.js web app (port 3001)
│   └── mobile/           # Expo mobile app (port 8082)
├── packages/
│   ├── api-client/       # HTTP client wrapper (openapi-fetch based)
│   ├── config/           # Shared ESLint, Prettier, TSConfig
│   ├── env/              # Environment validation with Zod
│   ├── mdi-insulin-algorithm/  # OpenAPS-based insulin calculator
│   ├── theme/            # Design tokens (colors, spacing, typography)
│   ├── types/            # Shared TypeScript types and enums
│   └── utils/            # Shared utility functions
├── docs/                 # Documentation
├── .github/workflows/    # CI/CD pipelines
├── .husky/               # Git hooks (pre-commit, commit-msg)
└── [config files]        # Root-level configuration
```

## Architecture Patterns

### Backend (NestJS)

**Location**: `apps/backend`

**Module-Based Architecture**: Each feature is a self-contained NestJS module

```
module-name/
├── module-name.module.ts           # Module definition with imports/exports
├── module-name.controller.ts       # HTTP endpoints with Swagger decorators
├── module-name.service.ts          # Business logic
├── module-name.controller.spec.ts  # Controller unit tests
├── module-name.service.spec.ts     # Service unit tests
├── dto/                            # Data Transfer Objects
│   ├── create-*.dto.ts
│   ├── update-*.dto.ts
│   └── *-response.dto.ts
├── guards/                         # Auth guards (optional)
├── strategies/                     # Passport strategies (optional)
└── decorators/                     # Custom decorators (optional)
```

**Key Modules**:
- **auth**: JWT + Google OAuth, email verification, password reset
- **profile**: User profile management
- **glucose-entries**: Blood glucose tracking (encrypted)
- **insulin-doses**: Insulin dose tracking and calculations
- **meals**: Meal templates and food items
- **log-entries**: Combined entries (glucose + insulin + meal)
- **statistics**: Analytics and aggregated data
- **food-search**: Food database integration
- **insulin-calculation**: MDI algorithm integration
- **sensor-readings**: CGM/FreeStyle Libre NFC data
- **doctor-patient**: Doctor-patient relationships
- **appointments**: Appointment scheduling
- **alerts**: Alert system and notifications
- **messages**: Real-time messaging with WebSockets
- **reports**: PDF report generation
- **dashboard**: Dashboard data aggregation
- **health**: Health check endpoint

**Database**: PostgreSQL with Prisma ORM
- **Schema**: `apps/backend/prisma/schema.prisma`
- **Key Models**: User, GlucoseEntry, InsulinDose, Meal, LogEntry, GlucoseReading, DoctorPatient, Appointment, Alert, Message
- **Encryption**: Glucose data encrypted with pgcrypto extension
- **Migrations**: Located in `apps/backend/prisma/migrations/`

**API Design**:
- URI-based versioning: `/v1/*`
- Swagger documentation: `http://localhost:3000/docs`
- Global validation with class-validator
- Bearer token authentication (JWT)
- CORS enabled with configurable origins

### Web (Next.js)

**Location**: `apps/web`

**Architecture**: Next.js 14 App Router with Material-UI

```
src/
├── app/                    # Next.js App Router (file-based routing)
│   ├── dashboard/          # Protected dashboard routes
│   ├── login/              # Authentication pages
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Home page
│   └── providers.tsx       # React Query + MUI providers
├── components/             # Reusable components
│   ├── dashboard/          # Dashboard-specific components
│   └── [shared components]
├── contexts/               # React contexts
│   ├── auth-context.tsx    # Authentication state
│   └── search-context.tsx  # Search state
├── hooks/                  # Custom React hooks
├── lib/                    # Library integrations
└── utils/                  # Utility functions
```

**State Management**:
- React Query for server state and caching
- React Context for auth and global UI state
- Socket.io for real-time messaging

### Mobile (Expo/React Native)

**Location**: `apps/mobile`

**Architecture**: Expo SDK 54 with React Navigation

```
src/
├── screens/                # Screen components
│   ├── HomeScreen.tsx
│   ├── RegistrarScreen.tsx      # Entry logging
│   ├── CalculatorScreen.tsx     # Insulin calculator
│   ├── HistoryScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── DoctorScreen.tsx
│   ├── NFCScanScreen.tsx        # FreeStyle Libre NFC
│   └── ...
├── components/             # Reusable components
├── navigation/             # React Navigation setup
├── contexts/               # React contexts
│   └── AuthContext.tsx
├── hooks/                  # Custom hooks
└── utils/                  # Utility functions
```

**Key Features**:
- NFC support for FreeStyle Libre sensor reading
- Camera integration for food scanning
- Real-time insulin dose calculation
- WebSocket for doctor-patient messaging
- Google OAuth authentication
- Deep linking support (`glucosapp://`)

## Shared Packages

### @glucosapp/types
**Purpose**: Shared TypeScript types and enums
**Key Exports**:
- Enums: `DiabetesType`, `GlucoseUnit`, `Theme`, `Language`, `InsulinType`, `MealCategory`, `UserRole`
- Types: `User`, `UserProfile`, `GlucoseEntry`, `InsulinDose`, `Meal`, `LogEntry`, `Statistics`
- Constants: `ALERT_THRESHOLD_RANGES`, `GLUCOSE_UNIT_OPTIONS`

### @glucosapp/api-client
**Purpose**: HTTP client for API communication
**Usage**:
```typescript
import { makeApiClient } from '@glucosapp/api-client';
const client = makeApiClient('http://localhost:3000');
const data = await client.get('/v1/profile', { token: 'jwt-token' });
```

### @glucosapp/env
**Purpose**: Environment variable validation with Zod
**Usage**:
```typescript
import { loadEnv, env } from '@glucosapp/env';
const config = loadEnv(); // Validates and returns env vars
console.log(env.DATABASE_URL);
```

### @glucosapp/theme
**Purpose**: Unified design tokens for web and mobile
**Exports**: `colors`, `spacing`, `fontSize`, `fontWeight`, `borderRadius`, `brandLogoShapes`

### @glucosapp/utils
**Purpose**: Shared utility functions
**Modules**: `date-utils`, `validation-utils`, `patient-utils`, `password-utils`, `alert-utils`

### @glucosapp/mdi-insulin-algorithm
**Purpose**: MDI insulin dose calculation (adapted from OpenAPS)
**Features**:
- IOB (Insulin on Board) calculation
- COB (Carbs on Board) calculation
- Insulin dose recommendation
- Safety validations
- Comprehensive test suite (Vitest)

## Code Conventions

### General Conventions
- **Language**: Code, comments, and documentation in English or Spanish (mixed)
- **TypeScript**: Strict mode enabled across all apps
- **Formatting**: Prettier with double quotes, semicolons, 100 char width
- **Linting**: ESLint with TypeScript, React, and React Hooks plugins
- **Naming**:
  - Functions: camelCase with verbs (e.g., `getUserProfile`, `calculateInsulin`)
  - Variables: camelCase with nouns (avoid abbreviations)
  - Components: PascalCase
  - Files: kebab-case for utilities, PascalCase for components
  - Constants: UPPER_SNAKE_CASE

### Backend Conventions
- **DTOs**: Use class-validator decorators for validation
  ```typescript
  export class CreateGlucoseEntryDto {
    @IsNumber()
    @Min(0)
    @Max(600)
    value: number;
  }
  ```
- **Guards**: Use JWT guards for protected endpoints
  ```typescript
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@GetUser() user: User) { }
  ```
- **Services**: Business logic separated from controllers
- **Controllers**: Thin controllers that delegate to services
- **Error Handling**: Use NestJS built-in exception filters
- **Testing**: Jest with spec files co-located with source

### Frontend Conventions (Web & Mobile)
- **Data Fetching**: Use React Query hooks
  ```typescript
  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => client.get('/v1/profile', { token })
  });
  ```
- **API Client**: Use shared `@glucosapp/api-client` package
- **Authentication**: Context-based auth state management
- **Styling**:
  - Web: Material-UI components + Tailwind CSS utilities
  - Mobile: StyleSheet API + shared theme tokens from `@glucosapp/theme`
- **Real-time**: Socket.io for messaging and live updates

### Commit Conventions
- **Format**: Conventional Commits (enforced by commitlint)
  - `feat:` New feature
  - `fix:` Bug fix
  - `docs:` Documentation changes
  - `refactor:` Code refactoring
  - `test:` Adding tests
  - `chore:` Maintenance tasks
- **Enforcement**: Husky pre-commit hook runs Prettier via lint-staged
- **Example**: `feat(backend): add insulin dose calculation endpoint`

## Development Workflows

### Initial Setup

```bash
# 1. Enable corepack and pnpm
corepack enable
corepack prepare pnpm@9.12.2 --activate

# 2. Install dependencies
pnpm install

# 3. Build shared packages (IMPORTANT: Do this first!)
pnpm -r --filter "@glucosapp/*" build

# 4. Start PostgreSQL
docker compose up -d db

# 5. Setup backend environment
cd apps/backend
cp .env.example .env  # Then edit with your secrets
pnpm prisma:generate
pnpm prisma:migrate

# 6. Setup web environment
cd apps/web
echo 'NEXT_PUBLIC_API_BASE_URL=http://localhost:3000' > .env.local

# 7. Setup mobile environment (optional)
cd apps/mobile
echo 'EXPO_PUBLIC_API_BASE_URL=http://localhost:3000' > .env
```

### Daily Development

```bash
# Start all apps (uses Turborepo)
pnpm dev

# Or start individual apps
pnpm -C apps/backend dev    # Backend on :3000
pnpm -C apps/web dev        # Web on :3001
pnpm -C apps/mobile dev     # Mobile on :8082
```

### Working with Shared Packages

**IMPORTANT**: When modifying shared packages, you must rebuild them:

```bash
# After modifying @glucosapp/types or any shared package
pnpm -r --filter "@glucosapp/*" build

# Or rebuild a specific package
pnpm -C packages/types build
```

**Tip**: Turborepo automatically handles dependencies, so `pnpm dev` will rebuild changed packages.

### Database Operations

```bash
cd apps/backend

# Generate Prisma Client (after schema changes)
pnpm prisma:generate

# Create and run migration
pnpm prisma:migrate

# Open Prisma Studio (database GUI)
pnpm prisma studio

# Reset database (⚠️ DESTRUCTIVE - deletes all data)
pnpm prisma migrate reset

# Seed database (if seed script exists)
pnpm prisma db seed
```

### Testing

```bash
# Run all tests
pnpm test

# Backend tests with coverage
pnpm -C apps/backend test:coverage

# MDI algorithm tests
pnpm -C packages/mdi-insulin-algorithm test

# Watch mode for development
pnpm -C apps/backend test:watch
```

### Building for Production

```bash
# Build all apps and packages
pnpm build

# Build specific app
pnpm -C apps/backend build
pnpm -C apps/web build

# Docker build and run
docker compose up -d
```

### Linting and Type Checking

```bash
# Lint all workspaces
pnpm lint

# Type check all workspaces
pnpm typecheck

# Fix auto-fixable issues
pnpm -C apps/backend lint --fix
```

### Mobile Development with ngrok

For testing mobile with Google OAuth (when IP changes):

```bash
# Start ngrok and auto-update env files
./start-dev-ngrok.sh

# This will:
# 1. Start ngrok on port 3000
# 2. Update apps/backend/.env with GOOGLE_MOBILE_CALLBACK_URL
# 3. Update apps/mobile/.env with EXPO_PUBLIC_API_BASE_URL
# 4. Show you the URL to add to Google Cloud Console

# Stop ngrok and optionally restore local IPs
./stop-dev-ngrok.sh
```

## Testing Strategy

### Backend Testing (Jest)
- **Config**: `apps/backend/jest.config.js`
- **Pattern**: `.spec.ts` files co-located with source
- **Coverage Thresholds**:
  - Branches: 75%
  - Functions: 80%
  - Lines: 80%
  - Statements: 80%
- **Test Types**: Unit tests for services, controllers, guards, strategies
- **Mocking**: Use NestJS testing utilities for dependency injection

**Example**:
```typescript
// apps/backend/src/profile/profile.service.spec.ts
describe('ProfileService', () => {
  let service: ProfileService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProfileService, PrismaService],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return user profile', async () => {
    // Test implementation
  });
});
```

### MDI Algorithm Testing (Vitest)
- **Config**: `packages/mdi-insulin-algorithm/vitest.config.ts`
- **Test Files**: `tests/` directory
  - `iob.test.ts` - Insulin on Board calculations
  - `cob.test.ts` - Carbs on Board calculations
  - `dose.test.ts` - Dose calculation tests
  - `safety.test.ts` - Safety validation tests
  - `schema.test.ts` - Zod schema validation
  - `validation.test.ts` - Input validation

### Mobile Testing
- **Framework**: Jest (configured in package.json)
- **Location**: `__tests__` directories for hooks
- **Coverage**: Limited (focus on critical hooks)

## Important Files and Locations

### Configuration Files
- **Root**: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`
- **Linting**: `.eslintrc.cjs`, `.prettierrc`, `.editorconfig`
- **Git**: `.gitignore`, `.nvmrc`, `.husky/`
- **Docker**: `docker-compose.yml`, `apps/backend/Dockerfile`
- **CI/CD**: `.github/workflows/ci.yml`, `.github/workflows/branch-protection.yml`
- **AI Guidelines**: `.cursorrules` (comprehensive coding rules for AI assistants)

### Environment Files (Not in Repo)
- `apps/backend/.env` - Backend secrets (JWT, database, SMTP, Google OAuth)
- `apps/web/.env.local` - Web API URL
- `apps/mobile/.env` - Mobile API URL and Google Client ID

**NEVER commit `.env` files!**

### Database Schema
- **Location**: `apps/backend/prisma/schema.prisma`
- **Migrations**: `apps/backend/prisma/migrations/`
- **Models**: User, GlucoseEntry, InsulinDose, Meal, LogEntry, and more

### API Documentation
- **Swagger**: http://localhost:3000/docs (when backend is running)
- **Health Check**: http://localhost:3000/v1/health

### Documentation
- **Root README**: `README.md` (setup and usage in Spanish)
- **Backend README**: `apps/backend/README.md`
- **Web README**: `apps/web/README.md`
- **Mobile README**: `apps/mobile/README.md`

## Common Tasks

### Adding a New Backend Module

```bash
cd apps/backend/src

# Create module directory
mkdir my-feature
cd my-feature

# Create files
touch my-feature.module.ts
touch my-feature.controller.ts
touch my-feature.service.ts
touch my-feature.controller.spec.ts
touch my-feature.service.spec.ts
mkdir dto

# Add to app.module.ts imports
# Add tests
# Generate Prisma client if schema changed
```

### Adding a New Prisma Model

```bash
cd apps/backend

# 1. Edit prisma/schema.prisma
# Add your model

# 2. Create migration
pnpm prisma migrate dev --name add_my_model

# 3. Generate Prisma Client
pnpm prisma:generate

# 4. Restart backend
pnpm dev
```

### Adding a New Shared Type

```bash
cd packages/types/src

# 1. Edit index.ts to add your type/enum
export enum MyNewEnum {
  VALUE1 = 'VALUE1',
  VALUE2 = 'VALUE2',
}

# 2. Build the package
pnpm build

# 3. Use in apps
import { MyNewEnum } from '@glucosapp/types';
```

### Adding a New Web Page

```bash
cd apps/web/src/app

# 1. Create route directory
mkdir my-page

# 2. Create page.tsx
echo "export default function MyPage() { return <div>My Page</div>; }" > my-page/page.tsx

# 3. Add to navigation if needed
# Edit src/components/dashboard/Sidebar.tsx or similar
```

### Adding a New Mobile Screen

```bash
cd apps/mobile/src

# 1. Create screen
echo "import { View, Text } from 'react-native';\nexport default function MyScreen() { return <View><Text>My Screen</Text></View>; }" > screens/MyScreen.tsx

# 2. Add to navigation
# Edit src/navigation/AppNavigator.tsx or StackNavigator.tsx
```

### Updating Dependencies

```bash
# Update all dependencies (interactive)
pnpm update -i -r

# Update specific package
pnpm update -r package-name

# Rebuild after updates
pnpm build
```

## Pitfalls and Gotchas

### 1. Shared Packages Must Be Built First
**Problem**: Import errors like "Cannot find module '@glucosapp/types'"
**Solution**: Run `pnpm -r --filter "@glucosapp/*" build` before starting apps

### 2. Prisma Client Out of Sync
**Problem**: TypeScript errors about missing Prisma types
**Solution**: Run `pnpm -C apps/backend prisma:generate` after schema changes

### 3. Environment Variables Not Loaded
**Problem**: Backend crashes with "undefined" for env vars
**Solution**:
- Ensure `.env` files exist in the correct locations
- Check variable names match exactly (case-sensitive)
- Restart the app after changing `.env`

### 4. Port Already in Use
**Problem**: "EADDRINUSE: address already in use :::3000"
**Solution**:
```bash
# Kill processes on ports 3000, 3001, 8082
lsof -ti:3000,3001,8082 | xargs kill -9
```

### 5. Database Connection Fails (P1001)
**Problem**: "Can't reach database server at localhost:5432"
**Solution**:
```bash
# Start PostgreSQL
docker compose up -d db

# Verify it's running
docker compose ps
```

### 6. Google OAuth Fails on Mobile
**Problem**: OAuth redirect doesn't work
**Solution**:
- Use ngrok for stable HTTPS URL
- Update Google Cloud Console with exact callback URL
- Restart backend after updating `GOOGLE_MOBILE_CALLBACK_URL`
- Check that `EXPO_PUBLIC_GOOGLE_CLIENT_ID` matches Google Console

### 7. Type Errors After Updating Shared Package
**Problem**: Old types cached by TypeScript
**Solution**:
```bash
# Rebuild the package
pnpm -C packages/types build

# Restart TypeScript server in your editor
# VSCode: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### 8. NFC Doesn't Work on iOS Simulator
**Problem**: NFC is only available on physical devices
**Solution**: Test NFC features on a real iPhone (iPhone 7 or later)

### 9. Turbo Cache Issues
**Problem**: Stale builds or test results
**Solution**:
```bash
# Clear Turbo cache
pnpm turbo run build --force

# Or clear all caches
rm -rf node_modules/.cache
rm -rf apps/*/node_modules/.cache
```

### 10. Migration Conflicts
**Problem**: Multiple developers creating migrations simultaneously
**Solution**:
```bash
# Pull latest migrations
git pull

# Reset database and reapply all migrations
pnpm -C apps/backend prisma migrate reset

# Or resolve conflicts manually in prisma/migrations/
```

## Best Practices for AI Assistants

### 1. Always Check Current State First
Before making changes:
- Read the file you're modifying
- Check related files for context
- Search for similar patterns in the codebase
- Verify that shared packages are built

### 2. Follow Existing Patterns
- Backend: Follow the module structure (controller → service → Prisma)
- Frontend: Use React Query hooks for data fetching
- DTOs: Use class-validator decorators
- Types: Add to shared `@glucosapp/types` package, not inline

### 3. Maintain Type Safety
- Never use `any` without justification
- Export types from shared packages
- Update shared types when backend DTOs change
- Run `pnpm typecheck` before committing

### 4. Write Tests for Backend Changes
- Add unit tests for new services and controllers
- Maintain coverage thresholds (80% lines/functions)
- Mock Prisma service in tests
- Test edge cases and error handling

### 5. Update Documentation
- Update README.md if setup process changes
- Add JSDoc comments for complex functions
- Document breaking changes
- Update this CLAUDE.md if new patterns emerge

### 6. Handle Environment Variables Properly
- Define new env vars in all relevant `.env.example` files
- Add validation to `@glucosapp/env` if needed
- Document required vs. optional env vars in README
- Never commit secrets

### 7. Database Changes Require Migrations
- Always create a migration for schema changes
- Use descriptive migration names
- Test migrations on clean database
- Update seed data if needed

### 8. Coordinate Cross-App Changes
When changing shared packages:
1. Update the shared package (`packages/types`, etc.)
2. Build the package (`pnpm -C packages/types build`)
3. Update all consuming apps (backend, web, mobile)
4. Test all affected apps
5. Commit everything together

### 9. Security Considerations
- Validate all user input with class-validator
- Use parameterized queries (Prisma handles this)
- Encrypt sensitive data (glucose values use pgcrypto)
- Never log sensitive data (passwords, tokens)
- Use JWT guards for protected endpoints
- Sanitize user-generated content

### 10. Performance Considerations
- Use Prisma's `select` to fetch only needed fields
- Implement pagination for list endpoints
- Use React Query's caching effectively
- Optimize images before uploading
- Use database indexes for frequently queried fields

## Quick Reference Commands

```bash
# Setup
pnpm install
pnpm -r --filter "@glucosapp/*" build
docker compose up -d db
pnpm -C apps/backend prisma:generate && pnpm -C apps/backend prisma:migrate

# Development
pnpm dev                              # All apps
pnpm -C apps/backend dev              # Backend only
pnpm -C apps/web dev                  # Web only
pnpm -C apps/mobile dev               # Mobile only

# Database
pnpm -C apps/backend prisma:generate  # Generate Prisma client
pnpm -C apps/backend prisma:migrate   # Run migrations
pnpm -C apps/backend prisma studio    # Open Prisma Studio

# Testing
pnpm test                             # All tests
pnpm -C apps/backend test:coverage    # Backend with coverage

# Building
pnpm build                            # Build all
pnpm -C packages/types build          # Build shared package

# Linting
pnpm lint                             # Lint all
pnpm typecheck                        # Type check all

# Utilities
lsof -ti:3000,3001,8082 | xargs kill -9  # Kill all dev servers
docker compose up -d                     # Start all services
docker compose down                      # Stop all services
```

## Key URLs

- **Backend API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/v1/health
- **Web App**: http://localhost:3001
- **Expo Dev Server**: http://localhost:8082
- **Ngrok Dashboard**: http://localhost:4040 (when using ngrok)

## Additional Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **NestJS Docs**: https://docs.nestjs.com
- **Next.js Docs**: https://nextjs.org/docs
- **Expo Docs**: https://docs.expo.dev
- **React Query Docs**: https://tanstack.com/query/latest
- **Material-UI Docs**: https://mui.com/material-ui

---

**Last Updated**: 2026-02-07
**Codebase Version**: Latest
**Maintainer**: Glucosapp Development Team

For questions or clarifications, refer to the main README.md or individual app READMEs.
