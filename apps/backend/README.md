# Glucosapp Backend

NestJS backend with Prisma ORM, JWT authentication, and Swagger documentation.

## Features

- ✅ RESTful API with URI versioning (v1)
- ✅ Authentication (Email/Password + Google OAuth)
- ✅ JWT access tokens + refresh tokens
- ✅ Email verification before login
- ✅ Password reset/recovery system
- ✅ HTML email templates in Spanish
- ✅ Prisma ORM with PostgreSQL
- ✅ Swagger/OpenAPI documentation at `/docs`
- ✅ Input validation with class-validator
- ✅ Health check endpoint

## Requirements

- Node 20.x (project uses nvm 20.19.5)
- pnpm 9.12.2 (corepack)
- PostgreSQL 16+ (via docker-compose or local installation)

## Quick Start

1. **Install dependencies** (from repository root):

   ```bash
   pnpm install
   ```

2. **Set up environment variables**:

   ```bash
   cd apps/backend
   # Create .env based on .env.example (see AUTH_SETUP.md for details)
   ```

   Minimum required:

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/glucosapp?schema=public"
   JWT_ACCESS_SECRET="your-secret-at-least-32-chars"
   JWT_REFRESH_SECRET="your-secret-at-least-32-chars"
   ```

3. **Start database**:

   ```bash
   docker-compose up -d db
   ```

4. **Run Prisma migrations**:

   ```bash
   pnpm -C apps/backend prisma:generate
   pnpm -C apps/backend prisma:migrate
   ```

5. **Start development server**:

   ```bash
   pnpm -C apps/backend dev
   # Or from root: pnpm dev (starts all apps)
   ```

6. **Visit Swagger docs**: http://localhost:3000/docs

## Authentication Setup

See [AUTH_SETUP.md](./AUTH_SETUP.md) for detailed authentication configuration:

- Generating secure JWT secrets
- Setting up Google OAuth 2.0
- Configuring email/SMTP for verification emails
- Security best practices for production

## Development

```bash
# Start dev server (from apps/backend)
pnpm dev

# Or from repository root
pnpm -C apps/backend dev
```

Server runs on http://localhost:3000

## API Endpoints

### Public Endpoints

- `GET /health` - Health check
- `GET /docs` - Swagger UI
- `POST /v1/auth/register` - Register with email/password
- `POST /v1/auth/login` - Login
- `POST /v1/auth/verify-email` - Verify email with token
- `POST /v1/auth/resend-verification` - Resend verification email
- `POST /v1/auth/forgot-password` - Request password reset
- `POST /v1/auth/reset-password` - Reset password with token
- `POST /v1/auth/refresh` - Refresh access token
- `GET /v1/auth/google` - Initiate Google OAuth
- `GET /v1/auth/google/callback` - Google OAuth callback

### Protected Endpoints (require Bearer token)

- `GET /v1/auth/me` - Get current user
- `POST /v1/auth/logout` - Logout (revoke refresh token)

## Database Management

```bash
# Generate Prisma Client after schema changes
pnpm prisma:generate

# Create and run a migration
pnpm prisma:migrate

# Open Prisma Studio (database GUI)
pnpm prisma studio

# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset
```

## Build & Deploy

```bash
# Build TypeScript to JavaScript
pnpm build

# Run production build
pnpm start:prod

# Or directly
node dist/main.js
```

## Docker

```bash
# Start only database
docker-compose up -d db

# Start database and API
docker-compose up -d db api

# Stop all services
docker-compose down
```

## Project Structure

```
apps/backend/
├── src/
│   ├── modules/
│   │   ├── auth/           # Authentication module
│   │   │   ├── dto/        # Data Transfer Objects
│   │   │   ├── guards/     # Route guards
│   │   │   ├── services/   # Business logic
│   │   │   ├── strategies/ # Passport strategies
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   └── README.md   # Auth module docs
│   │   └── health/         # Health check module
│   ├── prisma/
│   │   └── prisma.service.ts
│   ├── app.module.ts       # Root module
│   └── main.ts             # Application entry point
├── prisma/
│   └── schema.prisma       # Database schema
├── AUTH_SETUP.md           # Authentication setup guide
├── MIGRATION_PREVIEW.sql   # Preview of database changes
└── README.md               # This file
```

## Environment Variables

**Required:**

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - Secret for access tokens (32+ chars)
- `JWT_REFRESH_SECRET` - Secret for refresh tokens (32+ chars)

**Optional:**

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development, test, production)
- `JWT_ACCESS_EXPIRATION` - Access token duration (default: 15m)
- `JWT_REFRESH_EXPIRATION` - Refresh token duration (default: 7d)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_CALLBACK_URL` - OAuth callback URL
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email config
- `FRONTEND_URL` - Frontend URL for redirects (default: http://localhost:3001)

## Scripts (package.json)

- `dev` - Start development server with hot reload
- `build` - Compile TypeScript to JavaScript
- `start:prod` - Run production build
- `prisma:generate` - Generate Prisma Client
- `prisma:migrate` - Create and run database migration

## Troubleshooting

### Port already in use (EADDRINUSE)

```bash
lsof -ti:3000 | xargs kill -9
```

### Cannot reach database (P1001)

- Ensure PostgreSQL is running: `docker-compose up -d db`
- Check `DATABASE_URL` in `.env`
- Verify database is accessible: `psql $DATABASE_URL`

### Prisma errors

- Regenerate client: `pnpm prisma:generate`
- Run migrations: `pnpm prisma:migrate`

### Email verification not working

- Check SMTP configuration in `.env`
- In development, verification token is logged to console
- See AUTH_SETUP.md for email configuration

### Google OAuth not working

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Check redirect URI in Google Console matches `GOOGLE_CALLBACK_URL`
- Ensure OAuth 2.0 client credentials are properly configured in Google Cloud Console with required scopes (profile, email) and authorized redirect URI matching `GOOGLE_CALLBACK_URL`

## Testing with Swagger

1. Start server: `pnpm dev`
2. Open http://localhost:3000/docs
3. Register a new user via `POST /v1/auth/register`
4. Verify email (check console logs for token if SMTP not configured)
5. Login via `POST /v1/auth/login` to get tokens
6. Click "Authorize" button and enter: `Bearer <accessToken>`
7. Test protected endpoints like `GET /v1/auth/me`

## Security Notes

- Always use strong, randomly generated secrets in production
- Never commit `.env` file to git
- Enable HTTPS/TLS in production
- Configure CORS to only allow your frontend domain
- Consider implementing rate limiting on auth endpoints
- Monitor failed login attempts
- Set `NODE_ENV=production` in production

## Next Steps

- See [AUTH_SETUP.md](./AUTH_SETUP.md) for authentication configuration
- See [src/modules/auth/README.md](./src/modules/auth/README.md) for auth module details
- Implement additional features (password reset, 2FA, etc.)
- Add more modules (glucose entries, etc.)

## Support

For issues, questions, or contributions, please refer to the main repository documentation.
