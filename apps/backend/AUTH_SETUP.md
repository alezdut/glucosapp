# Authentication Setup Guide

This guide explains how to set up and use the authentication system in the Glucosapp backend.

## Features

- ✅ Email/Password registration with email verification
- ✅ Google OAuth 2.0 authentication
- ✅ JWT access tokens (15 minutes)
- ✅ Refresh tokens (7 days)
- ✅ Secure password hashing with bcrypt
- ✅ Email verification before login
- ✅ Token rotation on refresh
- ✅ Swagger/OpenAPI documentation

## Prerequisites

1. **Database**: PostgreSQL running (via docker-compose)
2. **Node.js**: Version 20.19.5
3. **pnpm**: Version 9.12.2

## Environment Variables

Create a `.env` file in `apps/backend/` with the following variables:

```env
# Database (required)
DATABASE_URL="postgresql://user:password@localhost:5432/glucosapp?schema=public"

# JWT Configuration (required)
JWT_ACCESS_SECRET="your-secure-access-secret-at-least-32-chars"
JWT_REFRESH_SECRET="your-secure-refresh-secret-at-least-32-chars"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# Google OAuth (optional - only if using Google SSO)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/v1/auth/google/callback"

# Email Configuration (optional - required for email verification)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Frontend URL (required for redirects)
FRONTEND_URL="http://localhost:3001"

# Server
PORT=3000
NODE_ENV="development"
```

### Generating Secure Secrets

Generate secure JWT secrets using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this twice to generate both `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

### Setting up Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Create OAuth 2.0 credentials:
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: Web application
   - Add authorized redirect URIs: `http://localhost:3000/v1/auth/google/callback`
   - Configure OAuth consent screen if prompted (scopes: profile, email)
5. Copy Client ID and Client Secret to your `.env` file

**Note:** The OAuth 2.0 client uses Google's OpenID Connect userinfo endpoint (accessed via passport-google-oauth20) to retrieve user profile and email. No additional API enablement is required beyond the OAuth 2.0 setup.

### Setting up Email (Optional)

For Gmail:

1. Enable 2-factor authentication
2. Generate an App Password: [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Use the app password in `SMTP_PASS`

For other providers, configure SMTP settings accordingly.

## Database Migration

After setting up the environment variables, run the migration:

```bash
# Start the database
docker-compose up -d db

# Run Prisma migration
cd apps/backend
pnpm prisma:migrate

# The migration will create:
# - Updated User table with email verification fields
# - Account table for OAuth providers
# - RefreshToken table for token management
```

## Running the Server

```bash
# From project root
pnpm dev

# Or from backend directory
cd apps/backend
pnpm dev
```

The API will be available at:

- API: http://localhost:3000/v1
- Swagger Docs: http://localhost:3000/docs

## API Endpoints

### Public Endpoints

#### Register

```http
POST /v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

Response: Email verification sent

#### Login

```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

Response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Verify Email

```http
POST /v1/auth/verify-email
Content-Type: application/json

{
  "token": "abc123def456..."
}
```

#### Resend Verification

```http
POST /v1/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Refresh Token

```http
POST /v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Google OAuth

```http
GET /v1/auth/google
```

Redirects to Google OAuth consent screen. After authorization, redirects to frontend with tokens set as secure HTTP-only cookies.

### Protected Endpoints

All protected endpoints require the `Authorization` header:

```http
Authorization: Bearer <accessToken>
```

#### Get Current User

```http
GET /v1/auth/me
Authorization: Bearer <accessToken>
```

#### Logout

```http
POST /v1/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Security Features

1. **Password Hashing**: bcrypt with 10 salt rounds
2. **Token Expiration**: Short-lived access tokens, longer refresh tokens
3. **Token Rotation**: Refresh tokens are rotated on each refresh
4. **Email Verification**: Users must verify email before login
5. **Verification Token Expiry**: Email verification tokens expire after 24 hours
6. **Refresh Token Hashing**: Refresh tokens are hashed in database
7. **Token Cleanup**: Expired tokens are automatically cleaned up

## Error Handling

The API returns standard HTTP status codes:

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Invalid or expired credentials
- `404 Not Found`: Resource not found
- `409 Conflict`: Email already registered

## Testing with Swagger

1. Start the server
2. Open http://localhost:3000/docs
3. Try the endpoints interactively
4. Use "Authorize" button to set Bearer token for protected routes

## Frontend Integration

### Web (Next.js)

```typescript
import { makeApiClient } from "@glucosapp/api-client";

const client = makeApiClient(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1`);

// Register
const response = await client.POST("/auth/register", {
  body: {
    email: "user@example.com",
    password: "SecurePass123!",
    name: "John Doe",
  },
});

// Login
const authResponse = await client.POST("/auth/login", {
  body: {
    email: "user@example.com",
    password: "SecurePass123!",
  },
});

// Store tokens
localStorage.setItem("accessToken", authResponse.data.accessToken);
localStorage.setItem("refreshToken", authResponse.data.refreshToken);

// Use access token
const meResponse = await client.GET("/auth/me", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

### Mobile (Expo)

Same as web, but use `EXPO_PUBLIC_API_BASE_URL` and AsyncStorage instead of localStorage.

### Google OAuth Cookie Handling

After successful Google OAuth authentication, tokens are set as secure HTTP-only cookies:

**Backend sets cookies:**

- `accessToken` - httpOnly, secure (production), sameSite: lax, maxAge: 15 minutes
- `refreshToken` - httpOnly, secure (production), sameSite: lax, maxAge: 7 days

**Frontend callback page (`/auth/callback`):**

```typescript
// The tokens are automatically available in cookies
// No need to extract from URL or localStorage

// For API calls, cookies will be sent automatically if using credentials: 'include'
const meResponse = await fetch("/v1/auth/me", {
  credentials: "include", // Important: includes cookies
  headers: {
    "Content-Type": "application/json",
  },
});
```

**Note:** For cross-origin requests, ensure your frontend includes `credentials: 'include'` in fetch requests, and the backend CORS configuration allows credentials from your frontend origin.

## Troubleshooting

### Email verification not working

- Check SMTP configuration
- Look for verification token in server logs (development only)
- Ensure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS are set

### Google OAuth not working

- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Check redirect URI matches Google Console configuration
- Ensure GOOGLE_CALLBACK_URL is correct

### JWT errors

- Ensure JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are set
- Check token hasn't expired
- Verify token format (should be Bearer token)

### Database connection failed

- Ensure PostgreSQL is running: `docker-compose up -d db`
- Check DATABASE_URL is correct
- Run migrations: `pnpm prisma:migrate`

## Development Tips

1. **Skip email verification** (dev only): Manually update user in database:

   ```sql
   UPDATE "User" SET "emailVerified" = true WHERE email = 'user@example.com';
   ```

2. **View tokens**: Check server logs for verification tokens when SMTP is not configured

3. **Reset database**:

   ```bash
   pnpm prisma migrate reset
   ```

4. **View database**:
   ```bash
   pnpm prisma studio
   ```

## Production Considerations

1. Use strong, randomly generated secrets (at least 32 characters)
2. Enable HTTPS/TLS
3. Configure CORS to only allow your frontend domain
4. Set up proper SMTP service (e.g., SendGrid, AWS SES)
5. Set `NODE_ENV=production`
6. Consider rate limiting on auth endpoints
7. Monitor failed login attempts
8. Implement password strength requirements
9. Add password reset functionality
10. Consider adding 2FA

## Next Steps

- Implement password reset flow
- Add rate limiting
- Add 2FA (TOTP)
- Add account management endpoints
- Add admin roles and permissions
- Implement refresh token family tracking
