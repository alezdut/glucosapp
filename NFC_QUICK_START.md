# FreeStyle Libre NFC Integration - Quick Start Guide

## Prerequisites

- Node.js 18+ and pnpm installed
- iOS device with NFC (iPhone 7+) for testing
- FreeStyle Libre 1 sensor (optional - mock data available)
- PostgreSQL database running

## Setup (5 minutes)

### 1. Install Dependencies

```bash
# From project root
pnpm install

# Mobile dependencies
cd apps/mobile
pnpm install

# Backend dependencies
cd ../backend
pnpm install
```

### 2. Configure Backend

**Generate encryption key:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Create/update `.env` file:**

```bash
cd apps/backend
cat >> .env << EOF
ENCRYPTION_KEY=<paste-key-from-above>
DATABASE_URL=postgresql://user:password@localhost:5432/glucosapp
JWT_SECRET=your-jwt-secret
EOF
```

### 3. Run Database Migration

```bash
cd apps/backend
npx prisma migrate deploy

# Or for development
npx prisma migrate dev
```

**Verify pgcrypto extension:**

```sql
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
```

### 4. Start Backend

```bash
cd apps/backend
pnpm dev

# Should see:
# ✓ NestJS application successfully started
# 📚 API Documentation: http://localhost:3000/api/docs
```

### 5. Start Mobile App

```bash
cd apps/mobile
pnpm dev

# Or for iOS
pnpm ios
```

### 6. Test NFC Integration

**Option A: With Real Sensor**

1. Open app on physical iOS device
2. Navigate to "Escanear Sensor"
3. Tap scan button
4. Hold phone near FreeStyle Libre sensor
5. View results and save

**Option B: With Mock Data (Development)**

1. In development build (`__DEV__ = true`)
2. Navigate to "Escanear Sensor"
3. Tap scan button
4. Tap "Usar datos simulados" in alert
5. View mock data and save

## API Testing

### Using curl

**1. Login (get token):**

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Save the accessToken from response
TOKEN="<your-token>"
```

**2. Create single reading:**

```bash
curl -X POST http://localhost:3000/v1/sensor-readings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "glucoseEncrypted": "abc123...",
    "recordedAt": "2025-10-28T10:00:00Z",
    "source": "LIBRE_NFC",
    "isHistorical": false
  }'
```

**3. Batch create readings:**

```bash
curl -X POST http://localhost:3000/v1/sensor-readings/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "readings": [
      {
        "glucoseEncrypted": "abc123...",
        "recordedAt": "2025-10-28T10:00:00Z",
        "source": "LIBRE_NFC",
        "isHistorical": true
      }
    ]
  }'
```

**4. Export as JSON:**

```bash
curl -X GET "http://localhost:3000/v1/sensor-readings/export?format=json" \
  -H "Authorization: Bearer $TOKEN"
```

**5. Export as CSV:**

```bash
curl -X GET "http://localhost:3000/v1/sensor-readings/export?format=csv" \
  -H "Authorization: Bearer $TOKEN" \
  -o readings.csv
```

**6. Get statistics:**

```bash
curl -X GET "http://localhost:3000/v1/sensor-readings/statistics?days=30" \
  -H "Authorization: Bearer $TOKEN"
```

## Swagger API Docs

Open in browser:

```
http://localhost:3000/api/docs
```

Interactive API testing with:

- Authentication
- Request/response examples
- Schema validation

## Testing Encryption

### Backend (Node.js)

```typescript
import { EncryptionService } from "./src/common/services/encryption.service";

// Generate key
const key = EncryptionService.generateEncryptionKey();
console.log(`ENCRYPTION_KEY=${key}`);

// Test encryption (after setting ENCRYPTION_KEY)
const service = new EncryptionService(configService);
const encrypted = service.encryptGlucoseValue(120);
console.log("Encrypted:", encrypted);

const decrypted = service.decryptGlucoseValue(encrypted);
console.log("Decrypted:", decrypted); // Should be 120
```

### Mobile (TypeScript)

```typescript
import { encryptGlucoseValue, decryptGlucoseValue } from "./src/utils/encryption";

// Test encryption
const encrypted = await encryptGlucoseValue(120);
console.log("Encrypted:", encrypted);

const decrypted = await decryptGlucoseValue(encrypted);
console.log("Decrypted:", decrypted); // Should be 120
```

## Common Issues

### "NFC no disponible"

**Problem:** Device doesn't support NFC

**Solution:**

- Use iPhone 7 or newer
- Test on physical device (not simulator)
- Use mock data for development

### "ENCRYPTION_KEY environment variable is required"

**Problem:** Backend missing encryption key

**Solution:**

```bash
cd apps/backend
echo "ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
```

### "Failed to decrypt data"

**Problem:** Key mismatch or corrupted data

**Solution:**

1. Check ENCRYPTION_KEY is set correctly
2. Verify data format (hex string)
3. Check recent key changes
4. Review application logs

### Database Migration Fails

**Problem:** Prisma migration error

**Solution:**

```bash
# Reset database (development only!)
npx prisma migrate reset

# Or manually apply
npx prisma db push
```

### NFC Scan Timeout

**Problem:** Sensor not detected

**Solution:**

1. Remove phone case
2. Position top of phone directly over sensor
3. Hold steady for 2-3 seconds
4. Check sensor is not expired
5. Try different angle/position

## Development Workflow

### 1. Mobile Development

```bash
# Terminal 1: Metro bundler
cd apps/mobile
pnpm dev

# Terminal 2: iOS build (if needed)
pnpm ios

# Hot reload enabled
# Save files to see changes
```

### 2. Backend Development

```bash
cd apps/backend
pnpm dev

# Auto-restart on file changes
# API docs at http://localhost:3000/api/docs
```

### 3. Database Changes

```bash
# Edit schema
nano apps/backend/prisma/schema.prisma

# Create migration
npx prisma migrate dev --name description_of_change

# Apply to production
npx prisma migrate deploy
```

## Next Steps

1. ✅ Complete quick start setup
2. ✅ Test with mock data
3. ✅ Test with real sensor
4. 📖 Read [NFC_INTEGRATION.md](apps/mobile/NFC_INTEGRATION.md)
5. 🔒 Read [ENCRYPTION_GUIDE.md](apps/backend/ENCRYPTION_GUIDE.md)
6. 🎨 Customize UI/UX as needed
7. 🧪 Add unit/integration tests
8. 🚀 Deploy to staging environment

## Useful Commands

```bash
# Build mobile app for production
cd apps/mobile
expo build:ios

# Run backend tests
cd apps/backend
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format

# Generate Prisma client
cd apps/backend
npx prisma generate

# View database
npx prisma studio
```

## Resources

- **Documentation**: See `NFC_INTEGRATION_SUMMARY.md`
- **User Guide**: `apps/mobile/NFC_INTEGRATION.md`
- **Security**: `apps/backend/ENCRYPTION_GUIDE.md`
- **API Docs**: http://localhost:3000/api/docs
- **Prisma Studio**: http://localhost:5555 (after `npx prisma studio`)

## Support

**Questions?**

- Check documentation files
- Review Swagger API docs
- Check application logs
- Contact: support@glucosapp.com

---

**Ready to go!** 🚀

Start scanning sensors and building awesome glucose tracking features!
