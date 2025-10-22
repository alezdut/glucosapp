/**
 * Insulin profile types matching mdi-insulin-algorithm
 * These types align with the mdi-insulin-algorithm library for accurate dose calculations
 */

/**
 * Insulin to Carbohydrate Ratios by time of day
 * Represents grams of carbohydrates per 1 unit of insulin
 * Example: breakfast: 15 means 1U covers 15g of carbs at breakfast
 */
export interface ICRatio {
  breakfast: number;
  lunch: number;
  dinner: number;
}

/**
 * Complete insulin profile for a user
 * This matches the InsulinProfile from mdi-insulin-algorithm
 */
export interface InsulinProfile {
  /** Insulin Sensitivity Factor: mg/dL that 1U of insulin lowers */
  isf: number;
  /** Insulin to carbohydrate ratios by time of day */
  icRatio: ICRatio;
  /** Duration of Insulin Action in hours (typically 3-5 hours) */
  diaHours: number;
  /** Target glucose in mg/dL */
  target: number;
}

/**
 * Meal type classification
 */
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

/**
 * Time of day for dose calculation (includes correction)
 */
export type TimeOfDay = "breakfast" | "lunch" | "dinner" | "correction";

/**
 * Additional context for dose calculation
 */
export interface DoseContext {
  /** Exercise performed in the last 4-6 hours */
  recentExercise?: boolean;
  /** Alcohol consumption (reduces insulin sensitivity) */
  alcohol?: boolean;
  /** Current illness (affects insulin needs) */
  illness?: boolean;
  /** High stress levels */
  stress?: boolean;
  /** Menstruation (for people who menstruate) */
  menstruation?: boolean;
  /** High-fat meal (delays carb absorption) */
  highFatMeal?: boolean;
  /** Hour of day (0-23) for time-based adjustments */
  hourOfDay?: number;
}

/**
 * Breakdown of dose calculation components
 */
export interface DoseBreakdown {
  /** Insulin for carbohydrates */
  carbDose: number;
  /** Insulin for glucose correction */
  correctionDose: number;
  /** Active insulin on board (subtracted) */
  iob: number;
  /** Total carbohydrates */
  carbohydrates: number;
  /** Current glucose */
  glucose: number;
  /** Target glucose */
  targetGlucose: number;
  /** Safety reduction applied (in units) */
  safetyReduction: number;
  /** Percentage adjustments applied */
  adjustments?: {
    exercise?: number;
    nocturnal?: number;
    betweenMeals?: number;
  };
}

/**
 * Result of dose calculation
 */
export interface DoseResult {
  /** Recommended dose in units (rounded to 0.5U) */
  dose: number;
  /** Detailed breakdown of calculation */
  breakdown: DoseBreakdown;
  /** Warnings or precautions */
  warnings: string[];
}

/**
 * Insulin injection record
 */
export interface Injection {
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Units of insulin administered */
  units: number;
}

/**
 * Parameters for dose calculation
 */
export interface CalculateDoseParams {
  glucose: number;
  carbohydrates: number;
  mealType: MealType;
  context?: DoseContext;
}

/**
 * Pre-sleep evaluation result
 */
export interface PreSleepEvaluation {
  /** Recommended action */
  action: "eat_snack" | "small_correction" | "sleep";
  /** Remaining insulin on board */
  remainingIOB: number;
  /** Reason for recommendation */
  reason: string;
  /** Carbohydrates to consume if action is eat_snack */
  carbohydrates?: number;
  /** Correction dose if action is small_correction */
  correctionDose?: number;
}

/**
 * Between-meal correction result
 */
export interface BetweenMealCorrectionResult {
  /** Recommended correction dose (with 50% rule applied) */
  dose: number;
  /** Reason for dose or no dose */
  reason: string;
  /** Any warnings */
  warnings: string[];
}
