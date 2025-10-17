# Google SSO Local Development: Caveats and Limitations

## Overview

This document outlines the limitations and challenges when using Google OAuth 2.0 authentication during local development, particularly when testing with physical mobile devices.

**Last Updated**: October 16, 2025

---

## Summary of Limitations

| Environment                 | Works?     | Notes                                                          |
| --------------------------- | ---------- | -------------------------------------------------------------- |
| **Web (localhost)**         | ✅ Yes     | Google accepts `http://localhost:*` redirect URIs              |
| **iOS Simulator**           | ✅ Yes     | Can connect to backend via `localhost` or host machine         |
| **Android Emulator**        | ✅ Yes     | Can connect to backend via `10.0.2.2` (special alias for host) |
| **Physical iOS Device**     | ⚠️ Limited | Requires workaround (see below)                                |
| **Physical Android Device** | ⚠️ Limited | Requires workaround (see below)                                |

---

## Core Issue: Google OAuth Redirect URI Restrictions

### The Problem

Google OAuth 2.0 has strict requirements for authorized redirect URIs:

✅ **Allowed**:

- `http://localhost:*` (any port)
- `http://127.0.0.1:*` (any port)
- `https://*` (any valid domain with HTTPS)

❌ **Not Allowed**:

- `http://192.168.1.x:*` (private network IPs)
- `http://10.0.0.x:*` (private network IPs)
- `http://*:*` (wildcard IPs)

### Why This Matters

When testing on **physical devices**:

1. Device needs to connect to your dev machine's backend
2. Device connects via LAN IP (e.g., `192.168.1.37:3000`)
3. OAuth callback tries to redirect to `http://192.168.1.37:3000/v1/auth/google/callback`
4. **Google rejects this URI** because it's a private IP address
5. Authentication fails

---

## Detailed Scenarios

### ✅ Scenario 1: Web App (Localhost)

**Works perfectly** because:

- Browser and backend both run on same machine
- Uses `http://localhost:3000`
- Google OAuth accepts `localhost` redirect URIs

**Configuration**:

```env
# apps/web/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

**Google Console Authorized Redirect URIs**:

```
http://localhost:3000/v1/auth/google/callback
```

---

### ✅ Scenario 2: iOS Simulator / Android Emulator

**Works well** with minor configuration:

#### iOS Simulator

- Can access host machine via `localhost` or `127.0.0.1`
- Backend callback uses `localhost`

```env
# apps/mobile/.env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

#### Android Emulator

- Uses special alias `10.0.2.2` to reach host machine
- But backend still receives callback as `localhost` from Google's perspective

```env
# apps/mobile/.env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

**Why it works**: The OAuth flow happens server-side on the backend, which is still accessible via `localhost` from Google's perspective.

---

### ⚠️ Scenario 3: Physical Devices (The Challenge)

**Does NOT work out of the box** because:

1. Device must connect to dev machine via LAN IP:

   ```env
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.37:3000
   ```

2. When initiating OAuth:
   - Mobile app opens: `http://192.168.1.37:3000/v1/auth/google/mobile`
   - Backend redirects to Google OAuth
   - Google needs to redirect back to: `http://192.168.1.37:3000/v1/auth/google/mobile/callback`
   - **Google rejects this** ❌

3. User sees error: "Invalid redirect URI" or similar

---

## Solutions for Physical Device Testing

### Solution 1: Use ngrok (Quick, Temporary)

Expose your local backend with a public HTTPS URL.

#### Pros:

- ✅ Quick setup (5 minutes)
- ✅ HTTPS included
- ✅ Works immediately

#### Cons:

- ❌ Free URL changes on every restart
- ❌ Must update Google Console each time
- ❌ Must update mobile `.env` each time
- ❌ Slower than direct LAN connection

#### Setup:

1. **Install ngrok**:

   ```bash
   brew install ngrok/ngrok/ngrok
   ```

2. **Sign up** at https://dashboard.ngrok.com/signup

3. **Get auth token** from https://dashboard.ngrok.com/get-started/your-authtoken

4. **Authenticate**:

   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

5. **Start backend**:

   ```bash
   cd /Users/alejandrozdut/Documents/glucosapp
   pnpm --filter backend dev
   ```

6. **Start ngrok tunnel**:

   ```bash
   ngrok http 3000
   ```

   Output will show:

   ```
   Forwarding   https://abc123xyz.ngrok.io -> http://localhost:3000
   ```

7. **Update Google Console**:
   - Go to Google Cloud Console > Credentials
   - Edit OAuth 2.0 Client ID
   - Add to Authorized Redirect URIs:
     ```
     https://abc123xyz.ngrok.io/v1/auth/google/callback
     https://abc123xyz.ngrok.io/v1/auth/google-mobile/callback
     ```

8. **Update mobile app**:

   ```env
   # apps/mobile/.env
   EXPO_PUBLIC_API_BASE_URL=https://abc123xyz.ngrok.io
   ```

9. **Restart mobile app**:
   ```bash
   pnpm --filter mobile dev
   # Press 'r' in Expo CLI to reload
   ```

#### Important Notes:

- ⚠️ **Free ngrok URLs change every time you restart ngrok**
- ⚠️ You must update Google Console and mobile `.env` each time
- ⚠️ Paid ngrok ($8/month) provides fixed subdomain

---

### Solution 2: Cloudflare Tunnel (Free, Stable URL)

Cloudflare Tunnel (formerly Argo Tunnel) provides a **free, stable subdomain**.

#### Pros:

- ✅ Free forever
- ✅ Fixed subdomain (one-time setup)
- ✅ HTTPS included
- ✅ Better performance than ngrok
- ✅ No auth token expiration

#### Cons:

- ❌ Slightly more complex initial setup
- ❌ Requires Cloudflare account

#### Setup:

1. **Install cloudflared**:

   ```bash
   brew install cloudflare/cloudflare/cloudflared
   ```

2. **Login to Cloudflare**:

   ```bash
   cloudflared tunnel login
   ```

3. **Create a tunnel**:

   ```bash
   cloudflared tunnel create glucosapp-dev
   ```

4. **Create config file** at `~/.cloudflared/config.yml`:

   ```yaml
   tunnel: glucosapp-dev
   credentials-file: /Users/YOUR_USERNAME/.cloudflared/TUNNEL_ID.json

   ingress:
     - hostname: glucosapp-dev.YOUR_DOMAIN.com
       service: http://localhost:3000
     - service: http_status:404
   ```

5. **Create DNS record** (via Cloudflare dashboard or CLI)

6. **Run tunnel**:

   ```bash
   cloudflared tunnel run glucosapp-dev
   ```

7. **Update Google Console** with your stable URL:

   ```
   https://glucosapp-dev.YOUR_DOMAIN.com/v1/auth/google/callback
   https://glucosapp-dev.YOUR_DOMAIN.com/v1/auth/google-mobile/callback
   ```

8. **Update mobile `.env`** (one-time):
   ```env
   EXPO_PUBLIC_API_BASE_URL=https://glucosapp-dev.YOUR_DOMAIN.com
   ```

---

### Solution 3: Local Network Testing (Limited)

Test everything **except Google OAuth** on physical devices using LAN IP.

#### Setup:

```env
# apps/mobile/.env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.37:3000
```

#### What Works:

- ✅ All API endpoints (glucose entries, profile, etc.)
- ✅ JWT authentication (if tokens obtained elsewhere)
- ✅ App navigation and UI
- ✅ Local data persistence

#### What Doesn't Work:

- ❌ Google Sign-In button
- ❌ Initial authentication flow
- ❌ Testing OAuth callback handling

#### Workaround:

1. Login via web app or simulator first
2. Extract `accessToken` and `refreshToken` from secure storage
3. Manually inject tokens into physical device app
4. Test authenticated features

**This is NOT recommended for production testing**, only for UI/UX development.

---

## Recommended Development Workflow

### For Daily Development

**Use simulators/emulators** for authentication testing:

- iOS Simulator (macOS)
- Android Emulator (all platforms)

```bash
# Start backend
pnpm --filter backend dev

# Start mobile with localhost
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000 \
pnpm --filter mobile dev

# Press 'i' for iOS Simulator
# Press 'a' for Android Emulator
```

### For Physical Device Testing (UI/UX)

**Use LAN IP** for non-auth features:

```bash
# Get your machine's IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Start mobile with LAN IP
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.37:3000 \
pnpm --filter mobile dev
```

Test: navigation, glucose entry, charts, profile (without sign-in).

### For Full E2E Testing on Physical Devices

**Use ngrok or Cloudflare Tunnel**:

1. Set up tunnel (one-time or per session)
2. Update Google Console with tunnel URL
3. Test complete authentication flow
4. Verify deep linking
5. Test token refresh
6. Test session persistence

---

## Production Deployment

In production, these limitations **do not apply** because:

1. Backend has a real domain with HTTPS:

   ```
   https://api.glucosapp.com/v1/auth/google/callback
   ```

2. Google Console uses production redirect URIs

3. Mobile app uses production API URL:

   ```env
   EXPO_PUBLIC_API_BASE_URL=https://api.glucosapp.com
   ```

4. OAuth flow works seamlessly on all devices

---

## Comparison of Solutions

| Solution              | Setup Time | Cost   | URL Stability | Speed  | Best For              |
| --------------------- | ---------- | ------ | ------------- | ------ | --------------------- |
| **iOS Simulator**     | 0 min      | Free   | N/A           | Fast   | Daily dev             |
| **Android Emulator**  | 0 min      | Free   | N/A           | Fast   | Daily dev             |
| **LAN IP (Limited)**  | 1 min      | Free   | Stable        | Fast   | UI testing            |
| **ngrok Free**        | 5 min      | Free   | Changes       | Slow   | Quick tests           |
| **ngrok Paid**        | 5 min      | $8/mo  | Stable        | Slow   | Frequent device tests |
| **Cloudflare Tunnel** | 15 min     | Free   | Stable        | Medium | Serious dev           |
| **Production Deploy** | Varies     | Varies | Stable        | Fast   | Production            |

---

## Common Errors and Solutions

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI in OAuth request doesn't match Google Console configuration.

**Solution**:

1. Check Google Console > Credentials > OAuth 2.0 Client IDs
2. Ensure redirect URI exactly matches (including protocol, domain, port, path)
3. Wait 5 minutes after updating Google Console (changes need to propagate)

### Error: "Network request failed"

**Cause**: Mobile app can't reach backend.

**Solution**:

1. Ensure backend is running: `curl http://localhost:3000/v1/health`
2. Check `EXPO_PUBLIC_API_BASE_URL` in mobile `.env`
3. Verify device and dev machine are on same network (for LAN IP)
4. Check firewall settings (allow incoming on port 3000)

### Error: "Invalid authentication credentials"

**Cause**: Google OAuth credentials mismatch.

**Solution**:

1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend `.env`
2. Ensure `EXPO_PUBLIC_GOOGLE_CLIENT_ID` matches the Web client ID
3. Check OAuth consent screen is configured in Google Console

### Deep Link Not Working

**Cause**: App not registered to handle `glucosapp://` scheme.

**Solution**:

1. Check `apps/mobile/app.json` has correct `scheme: "glucosapp"`
2. Rebuild app: `expo prebuild --clean`
3. Reinstall app on device/simulator
4. Test deep link: `xcrun simctl openurl booted "glucosapp://auth/callback?test=1"`

---

## Security Considerations

### Development

- ⚠️ **ngrok URLs are public**: Anyone with the URL can access your local backend
- ⚠️ **Don't commit ngrok URLs** to git (they're temporary anyway)
- ⚠️ **Use separate Google OAuth credentials** for development vs production
- ⚠️ **Disable debug logging** in production builds

### Recommendations

1. **Use environment-specific OAuth clients**:
   - Development: localhost + ngrok/tunnel URLs
   - Staging: staging domain
   - Production: production domain

2. **Never share ngrok URLs publicly** (Discord, GitHub issues, etc.)

3. **Rotate Google OAuth secrets** if accidentally exposed

4. **Monitor Google OAuth usage** in Google Console

5. **Use .env files** and never commit them (already in .gitignore)

---

## Checklist for Physical Device Testing

- [ ] Backend running locally
- [ ] ngrok or Cloudflare Tunnel running and stable
- [ ] Google Console updated with tunnel redirect URIs
- [ ] Mobile `.env` updated with tunnel URL
- [ ] Mobile app restarted with new env
- [ ] Device connected to Expo dev server
- [ ] Deep link scheme working (test with simple URL)
- [ ] Google Sign-In button works
- [ ] OAuth flow completes successfully
- [ ] Tokens stored and app navigates correctly
- [ ] Session persists after app restart

---

## Future Improvements

### Short-term

- [ ] Document testing with EAS Development Builds
- [ ] Add script to automate ngrok + Google Console updates
- [ ] Create docker-compose service for Cloudflare Tunnel

### Long-term

- [ ] Implement multiple OAuth providers (Apple Sign-In, reduce Google dependency)
- [ ] Add email/password authentication (works without domain restrictions)
- [ ] Consider magic link authentication for development

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [ngrok Documentation](https://ngrok.com/docs)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication/)
- [React Native Deep Linking](https://reactnative.dev/docs/linking)

---

## Questions or Issues?

If you encounter issues not covered in this document:

1. Check backend logs for detailed error messages
2. Check Expo Metro bundler logs for mobile errors
3. Verify environment variables are loaded correctly
4. Test with simulator first to isolate physical device issues
5. Check Google Cloud Console audit logs for OAuth errors

---

## Summary

**For most development**: Use iOS Simulator or Android Emulator with `localhost`.

**For physical device authentication testing**: Use ngrok (quick) or Cloudflare Tunnel (better).

**For physical device UI testing**: Use LAN IP and skip authentication (use simulator for auth).

**In production**: None of these limitations apply.
