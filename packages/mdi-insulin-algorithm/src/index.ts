/**
 * mdi-insulin-algorithm
 *
 * oref0-adapted algorithm for insulin dose calculation
 * in MDI (Multiple Daily Injections) regimen
 *
 * @packageDocumentation
 */

// ============================================================================
// TYPES AND SCHEMAS
// ============================================================================

export type {
  MealType,
  TimeOfDay,
  Injection,
  Meal,
  ICRatio,
  InsulinProfile,
  DoseContext,
  DoseCalculationInput,
  DoseBreakdown,
  DoseResult,
  GlucoseMeasurement,
  DayRecord,
  ValidationResult,
  PreSleepEvaluation,
  CorrectionResult,
} from "./models/types.js";

export {
  mealTypeSchema,
  timeOfDaySchema,
  injectionSchema,
  mealSchema,
  icRatioSchema,
  insulinProfileSchema,
  doseContextSchema,
  doseCalculationInputSchema,
  glucoseMeasurementSchema,
  dayRecordSchema,
  weeklyRecordSchema,
  validateInsulinProfile,
  validateDoseCalculationInput,
  validateWeeklyRecord,
} from "./models/schema.js";

// ============================================================================
// MAIN FUNCTIONS - DOSE CALCULATION
// ============================================================================

export {
  calculateDose,
  calculateBreakfastDose,
  calculateLunchDose,
  calculateDinnerDose,
  calculateCorrectionDose,
} from "./core/dose.js";

// ============================================================================
// IOB (INSULIN ON BOARD)
// ============================================================================

export { calculateIOB, calculateRemainingIOB, isSafeForNewDose } from "./core/iob.js";

// ============================================================================
// COB (CARBS ON BOARD)
// ============================================================================

export { calculateCOB, calculateRemainingCOB, percentageAbsorbed } from "./core/cob.js";

// ============================================================================
// SAFETY FUNCTIONS
// ============================================================================

export {
  check3HourRule,
  applySafetyFactor,
  evaluatePreSleep,
  calculateBetweenMealCorrection,
  generateWarnings,
} from "./core/safety.js";

// ============================================================================
// VALIDATION AND ANALYSIS
// ============================================================================

export {
  validateWeeklyModel,
  generateAdjustmentRecommendation,
  analyzePatterns,
} from "./core/validation.js";

// ============================================================================
// UTILITIES
// ============================================================================

export { roundDose, determineAbsorptionDuration, roundDecimals, clampValue } from "./utils/math.js";

// ============================================================================
// INTERNATIONALIZATION
// ============================================================================

export { configure, getLanguage, t } from "./i18n/i18n.js";
export type { SupportedLanguage, I18nConfig, MessageKey, MessageParams } from "./i18n/types.js";
