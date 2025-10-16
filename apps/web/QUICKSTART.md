# Web App Authentication - Quick Start Guide

## Prerequisites

1. Backend running at http://localhost:3000 with auth configured
2. Node 20.x and pnpm 9.12.2 installed

## Setup (First Time)

```bash
# From project root
cd apps/web

# Create environment file
cat > .env.local << EOF
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
EOF

# Install dependencies (if not already done)
cd ../..
pnpm install
```

## Running the App

```bash
# From project root
pnpm dev

# Or from apps/web
cd apps/web
pnpm dev
```

Open http://localhost:3001

## Testing the Auth Flow

### 1. Register a New User

1. Go to http://localhost:3001/register
2. Enter:
   - Name: Test User (optional)
   - Email: test@example.com
   - Password: password123
3. Click "Registrarse"
4. You'll see success message

### 2. Verify Email

**Option A: Using Backend Logs (Development)**

- Check backend console for verification token
- Go to: http://localhost:3001/verify-email?token=YOUR_TOKEN

**Option B: Using Email (Production)**

- Check your email inbox
- Click the verification link

### 3. Login

1. Go to http://localhost:3001/login
2. Enter:
   - Email: test@example.com
   - Password: password123
3. Click "Iniciar Sesión"
4. You'll be redirected to dashboard

### 4. View Dashboard

- You should now be at http://localhost:3001/dashboard
- You'll see your user information
- Click "Cerrar Sesión" to logout

### 5. Test Password Reset

1. Go to http://localhost:3001/forgot-password
2. Enter your email
3. Check backend logs or email for reset token
4. Go to: http://localhost:3001/reset-password?token=YOUR_TOKEN
5. Enter new password
6. Login with new password

## Key URLs

- **Home**: http://localhost:3001/
- **Login**: http://localhost:3001/login
- **Register**: http://localhost:3001/register
- **Dashboard**: http://localhost:3001/dashboard
- **Forgot Password**: http://localhost:3001/forgot-password

## Common Issues

### "Cannot find module '@glucosapp/types'"

```bash
cd /path/to/glucosapp
pnpm install
```

### "Network Error" when logging in

- Ensure backend is running at http://localhost:3000
- Check `.env.local` has correct `NEXT_PUBLIC_API_BASE_URL`

### "Email not verified"

- Check backend logs for verification token
- Or use the resend verification option on the verify-email page

### Logout doesn't work

- Check browser console for errors
- Try clearing localStorage: `localStorage.clear()`
- Refresh and try again

### Port 3001 already in use

```bash
lsof -ti:3001 | xargs kill -9
pnpm dev
```

## Developer Tips

### Clear Auth State

Open browser console:

```javascript
localStorage.clear();
location.reload();
```

### Check Current Tokens

```javascript
console.log("Access:", localStorage.getItem("accessToken"));
console.log("Refresh:", localStorage.getItem("refreshToken"));
```

### Decode JWT Token

```javascript
const token = localStorage.getItem("accessToken");
const payload = JSON.parse(atob(token.split(".")[1]));
console.log(payload);
```

### Force Token Refresh

```javascript
// Wait until token is about to expire, or manually trigger
// The app automatically refreshes 1 minute before expiration
```

## File Structure for Reference

```
src/
├── app/
│   ├── login/page.tsx          # Login form
│   ├── register/page.tsx       # Registration form
│   ├── verify-email/page.tsx   # Email verification
│   ├── forgot-password/page.tsx # Request reset
│   ├── reset-password/page.tsx # Reset with token
│   └── dashboard/page.tsx      # User dashboard
├── contexts/
│   └── auth-context.tsx        # Auth state & hooks
├── lib/
│   └── auth-api.ts             # API client
└── components/
    ├── protected-route.tsx     # Route protection
    └── auth-form.module.css    # Styling
```

## Next Steps

1. Customize the styling in `auth-form.module.css`
2. Add more user profile fields
3. Implement additional protected pages
4. Add password strength indicator
5. Improve error messages
6. Add loading skeletons

## Support

- Backend Setup: See `apps/backend/AUTH_SETUP.md`
- Implementation Details: See `WEB_AUTH_IMPLEMENTATION.md`
- General Web Info: See `apps/web/README.md`
