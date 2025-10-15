# Authentication Module

This module implements a complete authentication system with email/password and Google OAuth support.

## Structure

```
auth/
├── dto/                      # Data Transfer Objects
│   ├── auth-response.dto.ts  # Response DTOs for auth endpoints
│   ├── login.dto.ts          # Login request DTO
│   ├── register.dto.ts       # Registration request DTO
│   ├── refresh-token.dto.ts  # Refresh token request DTO
│   ├── resend-verification.dto.ts
│   └── verify-email.dto.ts   # Email verification DTO
├── guards/                   # Route guards
│   ├── google-auth.guard.ts  # Google OAuth guard
│   ├── jwt-auth.guard.ts     # JWT access token guard
│   ├── local-auth.guard.ts   # Local email/password guard
│   └── refresh-token.guard.ts
├── services/                 # Business logic
│   ├── auth.service.ts       # Main authentication service
│   ├── email.service.ts      # Email sending service
│   └── token.service.ts      # JWT token management
├── strategies/               # Passport strategies
│   ├── google.strategy.ts    # Google OAuth strategy
│   ├── jwt.strategy.ts       # JWT validation strategy
│   ├── local.strategy.ts     # Email/password strategy
│   └── refresh-token.strategy.ts
├── auth.controller.ts        # API endpoints
├── auth.module.ts            # Module configuration
└── README.md                 # This file
```

## Features

- **Email/Password Authentication**
  - Registration with email verification
  - Secure password hashing (bcrypt)
  - Email verification required before login

- **Google OAuth 2.0**
  - Single Sign-On with Google
  - Automatic account linking

- **JWT Tokens**
  - Short-lived access tokens (15 min)
  - Long-lived refresh tokens (7 days)
  - Token rotation on refresh

- **Security**
  - Refresh tokens hashed in database
  - Automatic cleanup of expired tokens
  - Email verification tokens expire after 24 hours

## Services

### AuthService

Main authentication business logic:

- `register()` - Create new user and send verification email
- `validateLocalUser()` - Validate email/password credentials
- `login()` - Generate access and refresh tokens
- `verifyEmail()` - Verify user email with token
- `refreshTokens()` - Refresh access and refresh tokens
- `logout()` - Revoke refresh token
- `validateGoogleUser()` - Handle Google OAuth user

### TokenService

JWT token management:

- `generateAccessToken()` - Create short-lived access token
- `generateRefreshToken()` - Create and store refresh token
- `validateRefreshToken()` - Validate refresh token against DB
- `revokeRefreshToken()` - Delete refresh token
- `generateVerificationToken()` - Create email verification token

### EmailService

Email sending (requires SMTP configuration):

- `sendVerificationEmail()` - Send verification link to user

## Guards

Use guards to protect routes:

```typescript
// Protect route with JWT
@UseGuards(JwtAuthGuard)
@Get('protected')
getProtected(@Req() req: Request) {
  const user = req.user; // UserResponseDto
  return user;
}

// Login with email/password
@UseGuards(LocalAuthGuard)
@Post('login')
login(@Req() req: Request) {
  const user = req.user;
  return this.authService.login(user);
}
```

## Environment Variables

Required:

- `JWT_ACCESS_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens

Optional:

- `JWT_ACCESS_EXPIRATION` - Access token duration (default: "15m")
- `JWT_REFRESH_EXPIRATION` - Refresh token duration (default: "7d")
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_CALLBACK_URL` - OAuth callback URL
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email config
- `FRONTEND_URL` - Frontend URL for redirects

See `AUTH_SETUP.md` in the backend root for complete setup instructions.

## Endpoints

All endpoints are versioned under `/v1/auth`:

| Method | Path                   | Auth      | Description               |
| ------ | ---------------------- | --------- | ------------------------- |
| POST   | `/register`            | Public    | Register new user         |
| POST   | `/login`               | Public    | Login with credentials    |
| POST   | `/verify-email`        | Public    | Verify email address      |
| POST   | `/resend-verification` | Public    | Resend verification email |
| POST   | `/refresh`             | Public    | Refresh access token      |
| POST   | `/logout`              | Protected | Logout user               |
| GET    | `/me`                  | Protected | Get current user          |
| GET    | `/google`              | Public    | Initiate Google OAuth     |
| GET    | `/google/callback`     | Public    | Google OAuth callback     |

## Database Models

### User

- `id` - Unique identifier
- `email` - User email (unique)
- `password` - Hashed password (nullable for OAuth users)
- `name` - User name
- `emailVerified` - Email verification status
- `verificationToken` - Email verification token
- `verificationTokenExpiry` - Token expiration date

### Account

- `id` - Unique identifier
- `userId` - Foreign key to User
- `provider` - OAuth provider (e.g., "google")
- `providerId` - Provider's user ID
- `accessToken` - OAuth access token
- `refreshToken` - OAuth refresh token

### RefreshToken

- `id` - Unique identifier
- `userId` - Foreign key to User
- `token` - Hashed refresh token
- `expiresAt` - Token expiration date

## Usage Examples

### Protecting Routes in Other Modules

```typescript
import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("glucose-entries")
export class GlucoseEntriesController {
  @Get()
  @UseGuards(JwtAuthGuard)
  getEntries(@Req() req: Request) {
    const userId = req.user.id;
    // Fetch entries for this user
  }
}
```

### Getting Current User

```typescript
import { Request } from 'express';
import { UserResponseDto } from '../auth/dto/auth-response.dto';

@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@Req() req: Request) {
  const user = req.user as UserResponseDto;
  return {
    message: `Hello ${user.name}!`,
    userId: user.id
  };
}
```

## Testing

Use Swagger UI at `/docs` to test endpoints interactively.

For protected routes:

1. Register a new user
2. Verify email (check logs for token if SMTP not configured)
3. Login to get access token
4. Click "Authorize" in Swagger and enter: `Bearer <accessToken>`
5. Try protected endpoints

## Common Issues

**Email not sending**: Check SMTP configuration. In development, verification token is logged to console.

**Google OAuth not working**: Ensure Google credentials are configured and redirect URI matches Google Console.

**Token expired**: Access tokens expire after 15 minutes. Use refresh token to get new access token.

**Email not verified**: Users must verify email before login. Use `/resend-verification` to send a new link.
