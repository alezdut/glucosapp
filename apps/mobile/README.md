Glucosapp Mobile (Expo + React Query)

Overview

- Expo (SDK 54) app with Google Sign-In authentication
- Uses @tanstack/react-query for data fetching and @glucosapp/api-client for API calls
- Native Google OAuth integration via expo-auth-session
- Secure token storage with expo-secure-store
- Dev server uses Metro; configured to prefer port 8082 in this repo

Features

- ✅ Google Sign-In (OAuth 2.0)
- ✅ Welcome and Onboarding screens
- ✅ Secure token management
- ✅ Automatic token refresh
- ✅ Persistent authentication
- ✅ User profile management

Requirements

- Node 20.x, pnpm 9.12.2
- iOS Simulator / Android Emulator or a device with Expo Go
- Backend reachable at EXPO_PUBLIC_API_BASE_URL (defaults to http://localhost:3000)
- Google OAuth credentials configured in Google Cloud Console

Setup

1. Install dependencies at the repository root:
   pnpm install

2. Configure Google OAuth

   Go to [Google Cloud Console](https://console.cloud.google.com/):

   a) Create a new project or select an existing one
   b) Navigate to "APIs & Services" > "Credentials"
   c) Create OAuth 2.0 credentials:
   - For iOS: OAuth 2.0 Client ID with bundle identifier `com.glucosapp.mobile`
   - For Android: OAuth 2.0 Client ID with package name `com.glucosapp.mobile`
     d) Copy your Client IDs

3. Environment Variables

   Set the following environment variables (or add to .env file):

   ```bash
   # API Base URL (use your machine's LAN IP for real devices)
   EXPO_PUBLIC_API_BASE_URL=http://localhost:3000

   # Google OAuth Client ID (from Google Cloud Console)
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   ```

   For real devices, use your machine's LAN IP:

   ```bash
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.XXX:3000
   ```

4. Backend Configuration

   Ensure your backend at `apps/backend` has Google OAuth configured:
   - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend .env
   - Backend should be running on the configured API_BASE_URL
   - See `apps/backend/AUTH_SETUP.md` for backend setup

Development

- Start Expo (tries port 8082, clears Metro cache):
  pnpm -C apps/mobile dev

- Start with environment variables:
  EXPO_PUBLIC_API_BASE_URL=http://192.168.1.XXX:3000 EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id pnpm -C apps/mobile dev

Scripts (package.json)

- dev: expo start --port 8082 --clear
- start: expo start --non-interactive
- android: expo run:android --non-interactive
- ios: expo run:ios --non-interactive
- web: expo start --web --non-interactive
- build: echo 'Expo app is managed; no build step'
- lint: eslint . --ext .ts,.tsx

Key Files and Structure

```
src/
├── contexts/
│   └── AuthContext.tsx         # Authentication state management
├── lib/
│   └── api.ts                  # API client with token management
├── navigation/
│   ├── AuthNavigator.tsx       # Auth flow navigation (Welcome, Onboarding)
│   ├── TabNavigator.tsx        # Main app navigation
│   └── index.ts
├── screens/
│   ├── WelcomeScreen.tsx       # Google Sign-In screen
│   ├── OnboardingScreen.tsx    # User profile setup
│   ├── HomeScreen.tsx          # Main home screen
│   ├── ProfileScreen.tsx       # User profile
│   └── ...
└── theme.ts                    # App theme (uses @glucosapp/theme)
```

Authentication Flow

1. **Welcome Screen**: User taps "Continuar con Google"
2. **Google OAuth**: Opens Google sign-in in browser
3. **Callback**: App receives tokens from backend
4. **Onboarding**: If first-time user, completes profile
5. **Home Screen**: User accesses main app

How Authentication Works

- **Token Storage**: Access and refresh tokens stored securely with expo-secure-store
- **Auto-Refresh**: Tokens refreshed automatically when expired
- **Persistent Sessions**: User stays logged in across app restarts
- **Secure API Calls**: All API requests include Bearer token automatically

Troubleshooting

**Port 8081 in use**

```bash
lsof -ti:8081,8082 | xargs kill -9
```

**Device cannot reach localhost**
Set EXPO_PUBLIC_API_BASE_URL to your machine's LAN IP:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.XXX:3000
```

**Google Sign-In fails**

- Verify EXPO_PUBLIC_GOOGLE_CLIENT_ID is set correctly
- Check Google Cloud Console OAuth credentials
- Ensure bundle identifier (iOS) or package name (Android) matches
- For iOS: `com.glucosapp.mobile`
- For Android: `com.glucosapp.mobile`

**"Invalid redirect URI" error**
The redirect URI should be: `glucosapp://auth/callback`

- Ensure this is added to Google Cloud Console OAuth settings
- Check app.json has scheme: "glucosapp" configured

**Backend connection issues**

- Ensure backend is running on configured API_BASE_URL
- Check backend has CORS configured for mobile
- Verify backend has Google OAuth endpoints enabled

Testing Authentication

1. Start backend: `pnpm -C apps/backend dev`
2. Start mobile app: `pnpm -C apps/mobile dev`
3. Press "Continuar con Google" on Welcome screen
4. Sign in with Google account
5. Complete onboarding with name
6. Access main app

Production Deployment

For production builds:

1. Configure OAuth redirect URIs in Google Cloud Console
2. Build with EAS: `eas build --platform ios` or `eas build --platform android`
3. Set production environment variables
4. Update backend CORS to allow production domains
