# Demo Data Population Script

This directory contains scripts for populating the GlucosApp database with realistic demo data for testing and demonstration purposes.

## Overview

The demo data population script creates 10 diverse patient profiles with 6 months of historical glucose data, meals, insulin doses, and alerts. The data is generated to be realistic enough to trigger the app's clinical status calculations and alert systems correctly.

## Usage

### Populate Demo Data

Run this command to create or update demo data:

```bash
cd apps/backend
npm run demo:populate
```

**Behavior:**

- **First run**: Creates all 10 patients with 6 months of historical data
- **Subsequent runs**: Detects existing patients and adds incremental data from the last recorded date to present
- Safe to run multiple times (idempotent)

### Reset Demo Data

To delete all existing demo data and recreate from scratch:

```bash
npm run demo:reset
```

**⚠️ Warning**: This will permanently delete all demo patient data and cannot be undone.

## Demo Patient Profiles

The script creates 10 patients with diverse profiles:

### Manual Readers (5 patients)

1. **Ana Martínez** (25F, TYPE_1)
   - Excellent control, 6 readings/day
   - Expected status: **ESTABLE**

2. **María López** (45F, TYPE_2)
   - Excellent control, 5 readings/day
   - Expected status: **ESTABLE**

3. **Elena Rodríguez** (60F, TYPE_2)
   - Persistent hyperglycemia, 4 readings/day
   - Expected status: **RIESGO** (<50% in range)

4. **Pedro Ramírez** (73M, TYPE_2)
   - Stable control, 5 readings/day
   - Expected status: **ESTABLE**

5. **Miguel Morales** (51M, TYPE_2)
   - INACTIVE patient (no data in last 90 days)
   - Expected status: **INACTIVO**

### CGM Users (5 patients)

6. **Carlos González** (26M, TYPE_1, Libre NFC)
   - Poor control, high variability
   - Expected status: **RIESGO** (CV 40%, severe hypos)

7. **Roberto Fernández** (40M, TYPE_1, Libre NFC)
   - Borderline with hypoglycemia issues
   - Expected status: **RIESGO** (≥4% hypos)

8. **Jorge Sánchez** (58M, TYPE_2, Dexcom)
   - Good control
   - Expected status: **ESTABLE**

9. **Isabel Torres** (77F, TYPE_1, Libre NFC)
   - Hypoglycemia issues, high variability
   - Expected status: **RIESGO** (CV 44%, severe hypos)

10. **Laura Díaz** (33F, TYPE_1, Dexcom)
    - Moderate control, high variability
    - Expected status: **RIESGO** (CV 40%)

## Demo Credentials

All demo patients use the same password for easy testing:

- **Email pattern**: `demo-patient-[1-10]@glucosapp.demo`
- **Password**: `Demo123!`

Examples:

- `demo-patient-1@glucosapp.demo` / `Demo123!`
- `demo-patient-2@glucosapp.demo` / `Demo123!`
- etc.

## Data Generated

For each patient, the script generates:

- **User profile**: Personal info, diabetes type, insulin parameters
- **Log entries** (ALL patients): Manual app entries where user records glucose + carbs + insulin
  - 3 main meals per day
  - Each entry contains: GlucoseEntry (encrypted) + InsulinDose + meal context
  - **This is what shows in the "registros" (records) tab**
- **Sensor readings** (CGM patients ONLY): Continuous glucose monitoring data
  - 288 readings per day (every 5 minutes)
  - Used for detailed glucose charts and trend analysis
- **Alerts**: Auto-generated for hypoglycemia, severe hypoglycemia, and hyperglycemia events
- **Alert settings**: Default alert thresholds configured

## Generated Data Statistics

Approximate totals for 6 months of data:

- **Total log entries** (manual app records): ~5,400 (all 10 patients, 3/day)
- **Total sensor readings** (CGM data): ~259,200 (5 CGM patients, 288/day)
- **Total alerts**: ~3,000-4,000 (varies by patient control)

## Architecture

The script is organized into modular components:

```
scripts/
├── README.md                     # This file
├── populate-demo-data.ts         # Main entry point
└── demo-data/
    ├── patient-profiles.ts       # 10 patient profile definitions
    ├── glucose-generator.ts      # Glucose pattern generation (Gaussian + diurnal)
    ├── insulin-generator.ts      # Insulin dose calculations
    ├── meal-generator.ts         # Meal templates and generation
    └── utils.ts                  # Helper functions (random, date utilities)
```

## Key Features

### Realistic Glucose Patterns

- **Gaussian distribution**: Base values centered on target mean with appropriate standard deviation
- **Diurnal variation**: Dawn phenomenon and circadian rhythm effects
- **Meal spikes**: Post-prandial glucose increases based on carb content
- **Event injection**: Ensures target percentages for hypos and hypers are met

### Clinical Status Triggers

The data is designed to trigger GlucosApp's clinical status calculations:

- **RIESGO** criteria:
  - Severe hypoglycemia (<54 mg/dL) present
  - ≥1% severe hypoglycemia
  - ≥4% hypoglycemia (<70 mg/dL)
  - Coefficient of variation >36%
  - <50% time in range

- **INACTIVO** criteria:
  - No glucose data in last 24 hours

### Idempotency

The script is safe to run multiple times:

1. **Detection**: Queries for existing patients by email pattern
2. **Incremental mode**: If patients exist, adds data from last date to present
3. **Skip logic**: Skips patients already up-to-date
4. **Reset mode**: `--reset` flag deletes all demo data before recreating

### Data Encryption

All glucose values are encrypted before storage using the app's `EncryptionService` (AES-256-GCM).

### Transactions

Each patient's data is generated within a single database transaction for consistency. Transaction timeout is set to 5 minutes to handle large data volumes.

## Requirements

- **Environment**: `ENCRYPTION_KEY` must be set in `.env` file
- **Database**: PostgreSQL database must be accessible
- **Prisma**: Database schema must be migrated (`npm run prisma:migrate`)

## Troubleshooting

### Script fails with "ENCRYPTION_KEY not found"

Ensure your `.env` file contains:

```
ENCRYPTION_KEY=<64-character-hex-string>
```

### Transaction timeout errors

If generating data for CGM patients times out, the transaction timeout is set to 5 minutes. This should be sufficient for most systems.

### Out of memory errors

CGM patients generate ~50,000 readings for 6 months. If you encounter memory issues, consider:

- Increasing Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=4096 npm run demo:populate`
- Running the script on a machine with more RAM

### Incremental updates not working

The script detects the last `logEntry.recordedAt` date. If other data exists but no log entries, it will regenerate from scratch.

## Performance

Typical execution times on a modern machine:

- **First run** (all 10 patients, 6 months): ~2-3 minutes
- **Incremental update** (1 day per patient): ~5-10 seconds
- **CGM patients** take longer due to volume (288 readings/day)

## Verification

After running the script, verify the data:

### Database Query

```sql
-- Check patients created
SELECT email, "diabetesType", "birthDate"
FROM "User"
WHERE email LIKE '%glucosapp.demo';

-- Verify LogEntry records (ALL patients should have these)
SELECT COUNT(*)
FROM "LogEntry"
WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE '%glucosapp.demo');
-- Expected: ~5,400 (3/day * 180 days * 10 patients)

-- Verify GlucoseEntry records (linked to LogEntry)
SELECT COUNT(*)
FROM "GlucoseEntry"
WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE '%glucosapp.demo');
-- Expected: ~5,400 (same as LogEntry count)

-- Verify GlucoseReading records (CGM patients ONLY)
SELECT COUNT(*)
FROM "GlucoseReading"
WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE '%glucosapp.demo');
-- Expected: ~259,200 (288/day * 180 days * 5 CGM patients)

-- Verify LogEntry has proper relations
SELECT
  COUNT(*) as total_entries,
  COUNT("glucoseEntryId") as with_glucose,
  COUNT("insulinDoseId") as with_insulin
FROM "LogEntry"
WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE '%glucosapp.demo');
```

### Login Test

1. Login to GlucosApp with `demo-patient-1@glucosapp.demo` / `Demo123!`
2. **CRITICAL**: Navigate to "registros" (records) tab - verify LogEntry records are visible
   - Should show glucose readings with associated meals and insulin doses
   - Each entry should have timestamp, glucose value, carbs, and insulin units
3. Verify dashboard shows 6 months of data
4. Check status shows "Estable"
5. Verify alerts panel shows generated alerts

### CGM Patient Test

1. Login to app with `demo-patient-2@glucosapp.demo` / `Demo123!` (Carlos - CGM patient)
2. Verify "registros" tab shows manual LogEntry records
3. Verify continuous glucose chart shows CGM data (GlucoseReading)

### Clinical Status Validation

Expected statuses (based on last 14 days of data):

- Patient 1 (Ana): ESTABLE
- Patient 2 (Carlos): RIESGO
- Patient 3 (María): ESTABLE
- Patient 4 (Roberto): RIESGO
- Patient 5 (Elena): RIESGO
- Patient 6 (Jorge): ESTABLE
- Patient 7 (Isabel): RIESGO
- Patient 8 (Pedro): ESTABLE
- Patient 9 (Laura): RIESGO
- Patient 10 (Miguel): INACTIVO

## Future Enhancements

Potential improvements:

- [ ] Command-line options for custom date ranges
- [ ] Support for specific patient profiles (e.g., only create Type 1 patients)
- [ ] Configurable data density (e.g., 3 months vs 6 months)
- [ ] Export/import demo data as JSON
- [ ] Integration with doctor accounts (assign patients to demo doctors)
