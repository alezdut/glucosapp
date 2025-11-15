/**
 * Meal types based on carbohydrate absorption speed
 */
export type MealType = "fast" | "normal" | "slow" | "very_slow";

/**
 * Times of day for dose calculation
 */
export type TimeOfDay = "breakfast" | "lunch" | "dinner" | "correction";

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
 * Meal record
 */
export interface Meal {
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Grams of carbohydrates */
  carbohydrates: number;
  /** Meal type by absorption speed */
  type: MealType;
}

/**
 * Insulin to carbohydrate ratios by time of day
 */
export interface ICRatio {
  /** Grams of carbohydrates covered by 1U of insulin at breakfast */
  breakfast: number;
  /** Grams of carbohydrates covered by 1U of insulin at lunch */
  lunch: number;
  /** Grams of carbohydrates covered by 1U of insulin at dinner */
  dinner: number;
}

/**
 * User's insulin profile
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
 * Additional context for dose calculation
 */
export interface DoseContext {
  /** Exercise performed in the last 4-6 hours */
  recentExercise?: boolean;
  /** Recent alcohol consumption */
  alcohol?: boolean;
  /** User is sick */
  illness?: boolean;
  /** Elevated stress level */
  stress?: boolean;
  /** Menstrual phase (for users who menstruate) */
  menstruation?: boolean;
  /** High-fat meal */
  highFatMeal?: boolean;
  /** Hour of day (0-23) to determine nocturnal adjustments */
  hourOfDay?: number;
}

/**
 * Input for dose calculation
 */
export interface DoseCalculationInput {
  /** Time of day */
  timeOfDay: TimeOfDay;
  /** Current glucose in mg/dL */
  glucose: number;
  /** Grams of carbohydrates to consume (0 for corrections without meal) */
  carbohydrates?: number;
  /** Previous injections for IOB calculation */
  previousInjections?: Injection[];
  /** Additional context */
  context?: DoseContext;
}

/**
 * Detailed breakdown of calculated dose
 */
export interface DoseBreakdown {
  /** Insulin to cover carbohydrates (prandial) */
  prandial: number;
  /** Correction insulin (glucose adjustment) */
  correction: number;
  /** Insulin On Board (IOB) subtracted */
  iob: number;
  /** Applied adjustments (exercise, nocturnal, etc.) in percentage */
  adjustments?: {
    exercise?: number;
    nocturnal?: number;
    betweenMeals?: number;
  };
}

/**
 * Dose calculation result
 */
export interface DoseResult {
  /** Total recommended dose in units, rounded */
  dose: number;
  /** Detailed calculation breakdown */
  breakdown: DoseBreakdown;
  /** Warnings or precautions */
  warnings: string[];
}

/**
 * Glucose measurement with context
 */
export interface GlucoseMeasurement {
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Glucose in mg/dL */
  glucose: number;
  /** Glucose measured 3 hours later (for validation) */
  glucose3hLater?: number;
  /** Insulin administered */
  insulin?: number;
  /** Carbohydrates consumed */
  carbs?: number;
}

/**
 * Daily record for validation
 */
export interface DayRecord {
  /** Date of record */
  date: string;
  /** Measurements of the day */
  measurements: GlucoseMeasurement[];
}

/**
 * Model validation result
 */
export interface ValidationResult {
  /** Percentage of days with good control (70%+ in range) */
  daysInRange: number;
  /** Hypoglycemia rate (<70 mg/dL) */
  hypoglycemiaRate: number;
  /** Hyperglycemia rate (>180 mg/dL) */
  hyperglycemiaRate: number;
  /** Textual adjustment recommendation */
  recommendation: string;
}

/**
 * Pre-sleep evaluation
 */
export interface PreSleepEvaluation {
  /** Recommended action */
  action: "sleep" | "eat_snack" | "small_correction" | "monitor";
  /** Correction dose if applicable */
  correctionDose: number;
  /** Indicates if snack is required */
  snack: boolean;
  /** Grams of carbohydrates in snack if applicable */
  carbohydrates?: number;
  /** Warning or precaution */
  warning: string | null;
}

/**
 * Between-meals correction result
 */
export interface CorrectionResult {
  /** Recommended dose */
  dose: number;
  /** Reason for decision */
  reason: string;
  /** Recommended action if dose should not be applied */
  recommendedAction?: string;
  /** Current IOB */
  iob?: number;
  /** Additional precaution */
  precaution?: string;
}
