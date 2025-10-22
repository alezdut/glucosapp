# Migration Guide: MDI Insulin Algorithm Integration

## Overview

This guide walks you through deploying the new insulin calculation system to production.

---

## 📋 Pre-Deployment Checklist

- [ ] Review all changes in `MDI_ALGORITHM_INTEGRATION_SUMMARY.md`
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Update API documentation
- [ ] Prepare user communication

---

## 🚀 Deployment Steps

### 1. Database Migration

#### Option A: Development/Staging

```bash
cd /Users/alejandrozdut/Documents/glucosapp/apps/backend

# Generate Prisma client with new schema
npx prisma generate

# Apply migration (development)
npx prisma migrate dev --name add_mdi_insulin_algorithm_support
```

#### Option B: Production

```bash
cd /Users/alejandrozdut/Documents/glucosapp/apps/backend

# Generate Prisma client
npx prisma generate

# Apply migration (production)
npx prisma migrate deploy
```

#### Verify Migration

```bash
# Check migration status
npx prisma migrate status

# Inspect database
npx prisma studio
```

### 2. Rebuild Packages

The types package has been updated, so rebuild it:

```bash
cd /Users/alejandrozdut/Documents/glucosapp

# Rebuild all packages
pnpm build

# Or rebuild just types
cd packages/types
pnpm build
```

### 3. Restart Backend

```bash
cd /Users/alejandrozdut/Documents/glucosapp/apps/backend

# Development
pnpm dev

# Production (with PM2 or similar)
pm2 restart glucosapp-backend
```

### 4. Test Endpoints

Test the new endpoints to ensure they're working:

```bash
# Get profile (should include new fields)
curl -X GET http://localhost:3000/v1/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Calculate meal dose
curl -X POST http://localhost:3000/v1/insulin-calculation/calculate-meal-dose \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "glucose": 150,
    "carbohydrates": 45,
    "mealType": "LUNCH"
  }'

# Get current IOB
curl -X GET http://localhost:3000/v1/insulin-calculation/current-iob \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Data Migration (Optional)

If you have existing users, you may want to set their initial IC ratios based on their old `carbRatio`:

### Create Migration Script

```typescript
// scripts/migrate-user-insulin-profiles.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting user profile migration...");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      icRatioBreakfast: true,
      icRatioLunch: true,
      icRatioDinner: true,
    },
  });

  let updated = 0;

  for (const user of users) {
    // Users already have default values (15, 12, 10)
    // If you want to adjust based on other factors, do it here

    // For example, if user has history data:
    // const avgRatio = await calculateAverageRatioFromHistory(user.id);

    console.log(
      `User ${user.email}: Breakfast=${user.icRatioBreakfast}, Lunch=${user.icRatioLunch}, Dinner=${user.icRatioDinner}`,
    );
    updated++;
  }

  console.log(`✅ Migration complete. ${updated} users processed.`);
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Run Migration Script

```bash
cd /Users/alejandrozdut/Documents/glucosapp/apps/backend

# Compile TypeScript
npx tsx scripts/migrate-user-insulin-profiles.ts
```

---

## 🔍 Verification

### 1. Check Database Schema

```sql
-- Connect to your database and verify:

-- Check User table has new columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'User'
AND column_name IN ('icRatioBreakfast', 'icRatioLunch', 'icRatioDinner', 'diaHours');

-- Check MealType enum exists
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'MealType');

-- Check InsulinDose has new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'InsulinDose'
AND column_name IN ('mealType', 'isCorrection', 'carbInsulin', 'correctionInsulin', 'iobSubtracted');
```

### 2. Test User Profile

Create a test user or update an existing one:

```typescript
// Test in Prisma Studio or via API
await prisma.user.update({
  where: { email: "test@example.com" },
  data: {
    icRatioBreakfast: 18,
    icRatioLunch: 14,
    icRatioDinner: 12,
    insulinSensitivityFactor: 45,
    diaHours: 4.5,
    targetGlucose: 100,
  },
});
```

### 3. Test Calculations

Test with realistic scenarios:

```typescript
// Scenario 1: High glucose, moderate carbs at breakfast
POST /v1/insulin-calculation/calculate-meal-dose
{
  "glucose": 200,
  "carbohydrates": 50,
  "mealType": "BREAKFAST"
}

// Expected: Higher dose due to correction + lower IC ratio at breakfast

// Scenario 2: Normal glucose at lunch
POST /v1/insulin-calculation/calculate-meal-dose
{
  "glucose": 100,
  "carbohydrates": 60,
  "mealType": "LUNCH"
}

// Expected: Only carb dose (no correction needed)

// Scenario 3: Between-meal correction
POST /v1/insulin-calculation/calculate-correction
{
  "glucose": 250
}

// Expected: Reduced dose (50% rule applied)

// Scenario 4: Pre-sleep with IOB
// First, add some recent insulin doses, then:
POST /v1/insulin-calculation/evaluate-pre-sleep
{
  "glucose": 110
}

// Expected: Recommendation to eat snack if IOB is high
```

---

## 🎨 Frontend Updates (Future)

### Mobile App Changes Needed

1. **Profile Screen**: Add fields for IC ratios and DIA

   ```typescript
   // Update ProfileScreen.tsx
   <Input label="Breakfast IC Ratio" value={icRatioBreakfast} />
   <Input label="Lunch IC Ratio" value={icRatioLunch} />
   <Input label="Dinner IC Ratio" value={icRatioDinner} />
   <Input label="DIA (hours)" value={diaHours} />
   ```

2. **Log Entry Screen**: Add meal type picker

   ```typescript
   <Select label="Meal Type">
     <Option value="BREAKFAST">Breakfast</Option>
     <Option value="LUNCH">Lunch</Option>
     <Option value="DINNER">Dinner</Option>
     <Option value="SNACK">Snack</Option>
   </Select>
   ```

3. **New Calculator Screen**: Use calculation API
   ```typescript
   const calculateDose = async () => {
     const response = await apiClient.post("/insulin-calculation/calculate-meal-dose", {
       glucose,
       carbohydrates,
       mealType,
       context: { recentExercise },
     });

     // Show breakdown to user
     setDose(response.dose);
     setBreakdown(response.breakdown);
     setWarnings(response.warnings);
   };
   ```

### Web App Changes

Similar updates to mobile app:

- Profile settings page
- Meal logging form
- Calculation tool with breakdown display

---

## 🧪 Testing Checklist

### Backend Tests

- [ ] Profile GET returns new fields
- [ ] Profile PATCH updates new fields
- [ ] Meal dose calculation with all meal types
- [ ] Correction dose calculation
- [ ] Pre-sleep evaluation
- [ ] IOB calculation
- [ ] Log entry creation with meal type
- [ ] Authentication on all new endpoints

### Integration Tests

- [ ] Create user → Set profile → Calculate dose
- [ ] Add insulin dose → Check IOB → Calculate with IOB
- [ ] Pre-sleep scenarios (safe, need snack, need correction)
- [ ] Between-meal corrections
- [ ] Context adjustments (exercise, illness, etc.)

### Edge Cases

- [ ] Very low glucose (< 70)
- [ ] Very high glucose (> 300)
- [ ] Zero carbohydrates (correction only)
- [ ] High IOB scenarios
- [ ] Recent injections within 3 hours
- [ ] Missing profile fields

---

## 📱 User Communication

### Email Template

```
Subject: Important Update: Enhanced Insulin Calculations

Dear [User],

We're excited to announce a major upgrade to our insulin calculation system!

What's New:
✅ Time-of-day specific insulin ratios (breakfast, lunch, dinner)
✅ More accurate active insulin tracking (IOB)
✅ Pre-sleep safety checks
✅ Detailed calculation breakdowns
✅ Context-aware adjustments (exercise, illness, etc.)

Action Required:
Please visit your Profile settings and review your insulin parameters:
- Breakfast IC Ratio
- Lunch IC Ratio
- Dinner IC Ratio
- Duration of Insulin Action (DIA)

These values should be set by your healthcare provider. We've set conservative defaults, but please verify them with your medical team.

Questions?
Contact support@glucosapp.com

Stay healthy,
The Glucosapp Team
```

### In-App Notification

```
🎉 New Feature: Advanced Insulin Calculator

We've upgraded our calculation system with:
• Time-of-day ratios
• Better IOB tracking
• Pre-sleep safety checks

👉 Update your profile settings with your IC ratios for breakfast, lunch, and dinner.

Tap here to learn more
```

---

## 🔧 Troubleshooting

### Issue: Migration fails with "column already exists"

**Solution**: The migration has already been applied. Check with `npx prisma migrate status`

### Issue: "mdi-insulin-algorithm not found"

**Solution**:

```bash
cd /Users/alejandrozdut/Documents/glucosapp/apps/backend
pnpm install
```

### Issue: TypeScript errors about missing fields

**Solution**: Regenerate Prisma client

```bash
npx prisma generate
```

### Issue: Old calculations still being used

**Solution**: Ensure frontend is calling the new endpoints:

- `/v1/insulin-calculation/calculate-meal-dose` (NEW)
- NOT the old client-side `calculateInsulinDose` function

### Issue: Calculations seem wrong

**Checklist**:

1. Verify user's IC ratios are set correctly
2. Check DIA value (should be 3-5 hours)
3. Verify ISF is correct
4. Check for recent injections (IOB might be high)
5. Review warnings in calculation result

---

## 📊 Monitoring

### Metrics to Track

1. **API Metrics**:
   - Calculation endpoint response times
   - Error rates on new endpoints
   - Usage frequency per endpoint

2. **Data Metrics**:
   - % of users with updated profiles
   - Average IOB per user
   - Frequency of pre-sleep checks

3. **Business Metrics**:
   - User engagement with new features
   - Calculation accuracy (compare to manual logs)
   - Support ticket volume

### Logging

Ensure these are logged:

```typescript
logger.info("Dose calculated", {
  userId,
  glucose,
  carbs,
  mealType,
  calculatedDose: result.dose,
  iob: result.breakdown.iob,
});

logger.warn("Unusual calculation", {
  userId,
  reason: "High dose calculated",
  dose: result.dose,
  warnings: result.warnings,
});
```

---

## ✅ Post-Deployment Checklist

- [ ] Database migration applied successfully
- [ ] Backend restarted and healthy
- [ ] All new endpoints responding correctly
- [ ] Existing functionality still works
- [ ] User profiles have default values
- [ ] Monitoring dashboards updated
- [ ] User communication sent
- [ ] Documentation updated
- [ ] Team trained on new features
- [ ] Support team briefed

---

## 🆘 Rollback Plan

If issues arise:

1. **Immediate**: Restart backend to previous version
2. **Database**: Rollback migration
   ```bash
   npx prisma migrate resolve --rolled-back add_mdi_insulin_algorithm_support
   ```
3. **Code**: Revert Git commits
   ```bash
   git revert <commit-hash>
   ```
4. **Notify**: Alert users of temporary issues

---

## 📞 Support

For issues or questions:

- **Technical**: Review `MDI_ALGORITHM_INTEGRATION_SUMMARY.md`
- **Algorithm**: See `mdi-insulin-algorithm/AI_AGENTS_GUIDE.md`
- **Database**: Check Prisma documentation

---

**Good luck with your deployment!** 🚀
