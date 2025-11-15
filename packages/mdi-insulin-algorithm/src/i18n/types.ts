/**
 * Supported languages for internationalization
 */
export type SupportedLanguage = "en" | "es";

/**
 * Configuration for internationalization
 */
export interface I18nConfig {
  /** Current language */
  language: SupportedLanguage;
  /** Fallback language if translation is missing */
  fallbackLanguage?: SupportedLanguage;
}

/**
 * Message key types for type safety
 */
export type MessageKey =
  // Warnings from generateWarnings()
  | "warnings.hypoglycemia"
  | "warnings.highIobLowGlucose"
  | "warnings.veryHighGlucose"
  | "warnings.carbsWithoutInsulin"
  | "warnings.highNocturnalDose"
  | "warnings.veryHighDose"
  | "warnings.recentExercise"
  | "warnings.alcohol"
  | "warnings.highFatMeal"
  | "warnings.illness"
  | "warnings.stress"
  | "warnings.menstruation"

  // Pre-sleep evaluation messages
  | "preSleep.riskNocturnalHypo"
  | "preSleep.veryHighGlucose"
  | "preSleep.monitorTrend"

  // Correction messages
  | "correction.wait3Hours"
  | "correction.conservativeCorrection"
  | "correction.checkGlucose"
  | "correction.noCorrectionNeeded"

  // Validation recommendations
  | "validation.urgentAdjustment"
  | "validation.caution"
  | "validation.reviewPoorControl"
  | "validation.reviewPoorControlHyper"
  | "validation.optimize"
  | "validation.continue"
  | "validation.excellent"
  | "validation.modelWorking"
  | "validation.continueMonitoring"

  // Pattern analysis
  | "patterns.recurringHypos"
  | "patterns.suggestReduceDose"
  | "patterns.consistentHyper"
  | "patterns.suggestIncreaseDose"
  | "patterns.highVariability"
  | "patterns.suggestConsistency"
  | "patterns.noPatterns"

  // Dose calculations
  | "dose.reducedByFactors";

/**
 * Parameters for message interpolation
 */
export interface MessageParams {
  [key: string]: string | number;
}
