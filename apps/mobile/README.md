Glucosapp Mobile (Expo + React Query)

Overview

- Expo (SDK 51) app using @tanstack/react-query to query the backend health endpoint via @glucosapp/api-client.
- Dev server uses Metro; configured to prefer port 8082 in this repo.

Requirements

- Node 20.x, pnpm 9.12.2
- iOS Simulator / Android Emulator or a device with Expo Go
- Backend reachable at EXPO_PUBLIC_API_BASE_URL (defaults to http://localhost:3000)

Setup

1. Install dependencies at the repository root:
   pnpm install

2. Environment
   EXPO_PUBLIC_API_BASE_URL (optional). If you run on a real device, use your machine LAN IP:
   EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:3000

Development

- Start Expo (tries port 8082, clears Metro cache):
  pnpm -C apps/mobile dev
- The screen renders the JSON from GET ${EXPO_PUBLIC_API_BASE_URL}/v1/health.

Scripts (package.json)

- dev: CI=1 EXPO_DEV_SERVER_PORT=8082 expo start --clear
- start: expo start --non-interactive
- android: expo run:android --non-interactive
- ios: expo run:ios --non-interactive
- web: expo start --web --non-interactive

Key files

- App.tsx: sets up QueryClientProvider and queries "/health" using makeApiClient(`${baseUrl}/v1`).

Troubleshooting

- Port 8081 in use: this repo uses 8082 by default. Free ports with:
  lsof -ti:8081,8082 | xargs kill -9
- Device cannot reach localhost: set EXPO_PUBLIC_API_BASE_URL to your machine LAN IP.
