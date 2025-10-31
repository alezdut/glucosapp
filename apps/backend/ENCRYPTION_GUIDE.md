# Encryption & Key Management Guide

## Overview

Glucosapp implements defense-in-depth encryption for sensitive glucose data:

1. **Client-side encryption** (mobile app)
2. **Transport encryption** (HTTPS/TLS)
3. **Application-level encryption** (backend service)
4. **Database-level encryption** (PostgreSQL pgcrypto)

This guide covers backend encryption implementation and key management.

## Architecture

### Data Flow

```
Mobile App (Client)
    ↓ [Encrypt with device key]
HTTPS/TLS
    ↓ [JWT Authentication]
Backend Service
    ↓ [Re-encrypt with server key]
PostgreSQL Database
    ↓ [pgcrypto column encryption]
Encrypted at Rest
```

## Encryption Service

### Implementation

Location: `src/common/services/encryption.service.ts`

The `EncryptionService` provides:

- AES-256-GCM encryption/decryption
- Secure key management
- Glucose value specific methods
- Hashing and token generation

### Algorithm Details

**Encryption**: AES-256-GCM

- **Key size**: 256 bits (32 bytes)
- **IV size**: 128 bits (16 bytes)
- **Authentication**: GCM mode provides built-in authentication
- **Salt**: 64 bytes of random data per encryption
- **Tag**: 16 bytes authentication tag

**Why GCM?**

- Authenticated encryption (prevents tampering)
- Parallelizable (good performance)
- Industry standard for data at rest
- NIST recommended

### Encrypted Data Structure

Each encrypted value is stored as a hex string containing:

```
[Salt (64 bytes)] + [IV (16 bytes)] + [Auth Tag (16 bytes)] + [Ciphertext (variable)]
```

Total overhead: ~96 bytes + ciphertext length

## Key Management

### Environment Variables

Required environment variable:

```bash
ENCRYPTION_KEY=<64-character hex string>
```

**Generate a new key:**

```typescript
import { EncryptionService } from "./src/common/services/encryption.service";

const newKey = EncryptionService.generateEncryptionKey();
console.log(`ENCRYPTION_KEY=${newKey}`);
```

Or use OpenSSL:

```bash
openssl rand -hex 32
```

### Key Storage

**Development:**

- Store in `.env` file (never commit to git!)
- Add to `.gitignore`

**Production:**

- Use AWS Secrets Manager, Google Secret Manager, or Azure Key Vault
- Environment variable injection via container orchestration
- Automatic rotation support

**Staging:**

- Use separate key from production
- Same security practices as production

### Key Rotation Strategy

**Recommended rotation interval**: Every 90 days

**Rotation process:**

1. **Generate new key**

   ```bash
   NEW_KEY=$(openssl rand -hex 32)
   ```

2. **Deploy new key as `ENCRYPTION_KEY_NEW`**
   - Update environment configuration
   - Deploy without downtime

3. **Migration script** (pseudo-code)

   ```typescript
   const oldKey = process.env.ENCRYPTION_KEY;
   const newKey = process.env.ENCRYPTION_KEY_NEW;

   // Decrypt with old key, re-encrypt with new key
   const readings = await prisma.glucoseReading.findMany();

   for (const reading of readings) {
     const decrypted = decryptWithKey(reading.glucoseEncrypted, oldKey);
     const reencrypted = encryptWithKey(decrypted, newKey);

     await prisma.glucoseReading.update({
       where: { id: reading.id },
       data: { glucoseEncrypted: reencrypted },
     });
   }
   ```

4. **Swap keys**
   - Set `ENCRYPTION_KEY = ENCRYPTION_KEY_NEW`
   - Remove `ENCRYPTION_KEY_NEW`
   - Deploy

5. **Verify**
   - Test decryption of sample records
   - Monitor for errors
   - Keep old key backed up for 30 days

### Key Backup

**Critical**: Always maintain secure backups of encryption keys

**Backup locations:**

- Encrypted offline storage (USB drive in safe)
- Password manager (enterprise tier)
- Hardware security module (HSM)
- Split key storage (Shamir's Secret Sharing)

**Recovery procedure:**

1. Retrieve key from secure backup
2. Restore to environment variable
3. Restart services
4. Verify data access

## Database-Level Encryption (pgcrypto)

### Enable Extension

Migration file: `prisma/migrations/20251028_enable_pgcrypto/migration.sql`

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Usage

While we primarily use application-level encryption, pgcrypto provides an additional layer:

**Encrypt on insert:**

```sql
INSERT INTO glucose_reading (glucose_encrypted, ...)
VALUES (pgp_sym_encrypt('120', 'encryption_key'), ...);
```

**Decrypt on select:**

```sql
SELECT pgp_sym_decrypt(glucose_encrypted::bytea, 'encryption_key')
FROM glucose_reading;
```

**Note**: Current implementation uses application-level encryption only. pgcrypto is available for future enhancement or compliance requirements.

## Mobile Key Management

### iOS Keychain

Location: `expo-secure-store`

Mobile app generates and stores its own encryption key:

- Stored in iOS Keychain (hardware-backed when available)
- Never transmitted to server
- Used for client-side encryption before upload
- Automatic backup with iCloud Keychain (user choice)

### Key Generation

```typescript
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const key = await Crypto.getRandomBytesAsync(32);
const keyHex = Array.from(key)
  .map((byte) => byte.toString(16).padStart(2, "0"))
  .join("");

await SecureStore.setItemAsync("glucosapp_encryption_key", keyHex);
```

### Security Considerations

- Keys never leave the device
- Biometric protection (Face ID/Touch ID) recommended
- Lost device = lost key (data on server remains encrypted with server key)
- Device wipe = key deletion (intentional for security)

## Compliance

### HIPAA Requirements

✅ **Encryption at Rest** (§ 164.312(a)(2)(iv))

- AES-256-GCM for stored data
- pgcrypto extension available

✅ **Encryption in Transit** (§ 164.312(e)(1))

- HTTPS/TLS 1.3
- Certificate pinning (planned)

✅ **Access Controls** (§ 164.312(a)(1))

- JWT authentication
- User isolation in queries

✅ **Audit Controls** (§ 164.312(b))

- Logging framework in place
- Audit trail (planned)

### GDPR Requirements

✅ **Data Minimization** (Article 5(1)(c))

- Only essential glucose values stored
- No sensor identifiers

✅ **Security of Processing** (Article 32)

- State-of-the-art encryption
- Regular security testing
- Key rotation procedures

✅ **Data Portability** (Article 20)

- Export functionality (JSON/CSV)
- Decrypted export for user

✅ **Right to Erasure** (Article 17)

- Account deletion deletes all encrypted data
- No data recovery after deletion

## Security Best Practices

### Do's

✅ Generate keys with cryptographically secure random generators
✅ Store keys in environment variables or secret managers
✅ Rotate keys regularly (90 days recommended)
✅ Use different keys for dev/staging/production
✅ Enable TLS 1.3 for all connections
✅ Validate all inputs before encryption
✅ Log encryption failures (but never log keys or plaintext)
✅ Monitor for unusual decryption patterns

### Don'ts

❌ Never commit keys to version control
❌ Never log encryption keys
❌ Never transmit keys in plain text
❌ Never use the same key across environments
❌ Never hard-code encryption keys
❌ Never skip authentication tags (always use GCM/authenticated mode)
❌ Never decrypt data for unauthenticated users
❌ Never reuse IVs with the same key

## Monitoring & Alerts

### Metrics to Track

- Encryption/decryption success rate
- Average encryption time
- Failed decryption attempts per user
- Key rotation status

### Alert Triggers

- Decryption failure rate > 1%
- Encryption time > 100ms (p95)
- Unauthorized access attempts
- Key rotation overdue (> 120 days)
- Unusual patterns (mass decryption requests)

## Troubleshooting

### "Failed to decrypt data"

**Causes:**

- Wrong encryption key
- Corrupted data
- Key rotation in progress
- Invalid ciphertext format

**Resolution:**

1. Verify `ENCRYPTION_KEY` is set correctly
2. Check data format (hex string expected)
3. Review recent key changes
4. Check application logs for specific error

### "ENCRYPTION_KEY environment variable is required"

**Cause**: Missing environment variable

**Resolution:**

1. Generate a new key if needed
2. Add to `.env` file or environment config
3. Restart application

### Performance Issues

**Symptoms:**

- Slow API responses
- High CPU usage
- Timeout errors

**Resolution:**

1. Check encryption overhead (should be < 10ms per value)
2. Consider batch operations for large datasets
3. Review database query performance
4. Enable connection pooling
5. Consider caching frequently accessed decrypted values (with care)

## Testing

### Unit Tests

```typescript
import { EncryptionService } from "./encryption.service";

describe("EncryptionService", () => {
  let service: EncryptionService;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = EncryptionService.generateEncryptionKey();
    service = new EncryptionService(configService);
  });

  it("should encrypt and decrypt glucose values", () => {
    const original = 120;
    const encrypted = service.encryptGlucoseValue(original);
    const decrypted = service.decryptGlucoseValue(encrypted);

    expect(decrypted).toBe(original);
  });

  it("should produce different ciphertext for same value", () => {
    const value = 120;
    const encrypted1 = service.encryptGlucoseValue(value);
    const encrypted2 = service.encryptGlucoseValue(value);

    expect(encrypted1).not.toBe(encrypted2); // Different IVs and salts
  });
});
```

### Integration Tests

Test full data flow:

1. Mobile app encrypts with device key
2. Sends to backend via HTTPS
3. Backend re-encrypts with server key
4. Stores in database
5. Retrieves and decrypts for export

## References

- [NIST Special Publication 800-38D](https://csrc.nist.gov/publications/detail/sp/800-38d/final) - GCM Mode
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [GDPR Article 32](https://gdpr-info.eu/art-32-gdpr/) - Security of Processing

## Support

For security concerns or questions:

- **Security team**: security@glucosapp.com
- **Internal docs**: Confluence > Security > Encryption
- **Emergency**: On-call rotation via PagerDuty
