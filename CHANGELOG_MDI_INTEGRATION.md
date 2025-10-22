# Changelog - MDI Insulin Algorithm Integration

## [1.1.0] - 2025-10-20 - Deprecated Code Removal

### Removed ❌

**packages/types/src/insulin-calculations.ts**:

- Removed `InsulinCalculationParams` interface (deprecated)
- Removed `InsulinCalculationResult` interface (deprecated)
- Removed `computeIOB()` function (deprecated)
- Removed `calculateInsulinDose()` function (deprecated)

### Kept ✅

**packages/types/src/insulin-calculations.ts**:

- `calculateProjectedGlucose()` - UI utility for showing glucose projections
- `evaluateGlucoseAlert()` - UI utility for showing warnings
- `isValidGlucoseReading()` - Form validation
- `isValidInsulinDose()` - Form validation
- `AlertLevel` type
- `GlucoseAlert` interface

### Impact ⚠️

- **Backend**: No changes needed - already uses new API exclusively
- **Mobile/Web Apps**: May need updates if using deprecated functions
  - Replace `calculateInsulinDose()` with API calls to `/v1/insulin-calculation/calculate-meal-dose`
  - See `DEPRECATED_CODE_REMOVAL.md` for migration guide

### Build

- ✅ Types package rebuilt successfully
- ✅ No breaking changes in backend
- ✅ All deprecated code removed

---

## [1.0.0] - 2025-10-20 - Initial MDI Integration

### Added ✨

**Database Schema**:

- New `MealType` enum (BREAKFAST, LUNCH, DINNER, SNACK, CORRECTION)
- `icRatioBreakfast`, `icRatioLunch`, `icRatioDinner` fields in User model
- `diaHours` field in User model
- `mealType`, `isCorrection`, `carbInsulin`, `correctionInsulin`, `iobSubtracted` fields in InsulinDose model
- `mealType` field in Meal model
- Migration: `add_mdi_insulin_algorithm_support`

**Type System**:

- New `packages/types/src/insulin-profile.ts` with:
  - `ICRatio` interface
  - `InsulinProfile` interface
  - `DoseContext` interface
  - `DoseBreakdown` interface
  - `DoseResult` interface
  - `Injection` interface
  - `PreSleepEvaluation` interface
  - `BetweenMealCorrectionResult` interface
- Updated `UserProfile` type with new insulin fields
- Updated `InsulinDose` type with breakdown fields
- Updated `Meal` type with meal type
- New `MealType` enum

**Backend Module**: `insulin-calculation/`

- `InsulinCalculationService` with:
  - `calculateMealDose()` - Calculate dose for meals
  - `calculateCorrection()` - Between-meal corrections
  - `evaluateBeforeSleep()` - Pre-sleep safety check
  - `getCurrentIOB()` - Active insulin tracking
  - `getRecentInjections()` - Helper for IOB calculation
- `InsulinCalculationController` with endpoints:
  - `POST /v1/insulin-calculation/calculate-meal-dose`
  - `POST /v1/insulin-calculation/calculate-correction`
  - `POST /v1/insulin-calculation/evaluate-pre-sleep`
  - `GET /v1/insulin-calculation/current-iob`
- DTOs:
  - `CalculateDoseDto`
  - `CalculateCorrectionDto`
  - `PreSleepEvaluationDto`
  - `DoseContextDto`

**Profile Module Updates**:

- Updated `UpdateProfileDto` with IC ratios and DIA fields
- Updated `ProfileService` to handle new insulin parameters
- Profile API returns full insulin profile data

**Log Entries Updates**:

- `CreateLogEntryDto` accepts `mealType`
- Service tracks meal type in InsulinDose and Meal records
- Sets `isCorrection` flag automatically

### Changed 🔄

**User Model**:

- Removed `carbRatio` field (replaced by time-specific ratios)
- Added time-of-day specific IC ratios

### Dependencies 📦

- Added `mdi-insulin-algorithm` from local path

### Documentation 📚

- `MDI_ALGORITHM_INTEGRATION_PLAN.md` - Technical architecture
- `MDI_ALGORITHM_INTEGRATION_SUMMARY.md` - Implementation details
- `MIGRATION_GUIDE.md` - Deployment instructions
- `README_MDI_INTEGRATION.md` - Quick reference

### Algorithm Features 🧮

- **Time-of-day IC ratios**: Different ratios for breakfast/lunch/dinner
- **Advanced IOB calculation**: Bilinear decay model
- **Safety features**:
  - 50% rule for between-meal corrections
  - Pre-sleep safety evaluation
  - Exercise adjustments (-20%)
  - Nocturnal adjustments (-5%)
- **Context awareness**: Exercise, illness, stress, menstruation, high-fat meals
- **Full transparency**: Detailed breakdown of all calculations
- **Warnings system**: Alerts for unusual situations

---

## Migration Notes

### From 0.x to 1.0.0

1. Apply database migration:

   ```bash
   npx prisma migrate deploy
   ```

2. Update user profiles with IC ratios (default: 15, 12, 10)

3. Rebuild types package:
   ```bash
   cd packages/types && pnpm build
   ```

### From 1.0.0 to 1.1.0

1. Rebuild types package:

   ```bash
   cd packages/types && pnpm build
   ```

2. Update mobile/web apps if using deprecated functions (see `DEPRECATED_CODE_REMOVAL.md`)

---

## Breaking Changes

### Version 1.1.0

- **Removed**: `calculateInsulinDose()` function from types package
- **Impact**: Mobile/Web apps using this function must migrate to API calls
- **Migration**: See `DEPRECATED_CODE_REMOVAL.md`

### Version 1.0.0

- **Removed**: `carbRatio` field from User model (database)
- **Added**: `icRatioBreakfast`, `icRatioLunch`, `icRatioDinner` fields
- **Impact**: Apps must use time-specific ratios instead of single ratio
- **Migration**: See `MIGRATION_GUIDE.md`

---

## Links

- [Integration Plan](./MDI_ALGORITHM_INTEGRATION_PLAN.md)
- [Implementation Summary](./MDI_ALGORITHM_INTEGRATION_SUMMARY.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Quick Reference](./README_MDI_INTEGRATION.md)
- [Deprecated Code Removal](./DEPRECATED_CODE_REMOVAL.md)
- [Algorithm Guide](../mdi-insulin-algorithm/AI_AGENTS_GUIDE.md)
