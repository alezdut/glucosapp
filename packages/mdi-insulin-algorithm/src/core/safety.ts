import type {
  DoseContext,
  PreSleepEvaluation,
  Injection,
  CorrectionResult,
} from "../models/types.js";
import { calculateIOB, isSafeForNewDose } from "./iob.js";
import { t } from "../i18n/i18n.js";

/**
 * Checks the "3-Hour Rule"
 * NEVER administer correction if less than 3 hours have passed since last dose
 *
 * Reason: Prevent "insulin stacking"
 *
 * @param previousInjections - Array of previous injections
 * @param now - Current timestamp in milliseconds
 * @returns true if at least 3 hours have passed
 */
export const check3HourRule = (
  previousInjections: Injection[],
  now: number = Date.now(),
): boolean => {
  return isSafeForNewDose(previousInjections, now, 3);
};

/**
 * Applies safety factors based on user context
 *
 * Adjustments:
 * - Recent exercise: -20% (increased sensitivity)
 * - Alcohol: -30% (increased delayed sensitivity)
 * - Illness: +20% (decreased sensitivity)
 * - Stress: +10% (decreased sensitivity)
 * - Menstruation: +10% (decreased sensitivity in luteal phase)
 * - Nocturnal (22:00-06:00): -5% (more conservative)
 *
 * @param calculatedDose - Base calculated dose
 * @param context - Additional user context
 * @returns Adjusted dose with safety factors
 */
export const applySafetyFactor = (calculatedDose: number, context?: DoseContext): number => {
  if (!context) {
    return calculatedDose;
  }

  let safetyFactor = 1.0;

  // Reduce dose if there is increased sensitivity
  if (context.recentExercise) {
    safetyFactor *= 0.8; // -20%
  }

  if (context.alcohol) {
    safetyFactor *= 0.7; // -30%
  }

  // Increase dose if there is decreased sensitivity
  if (context.illness) {
    safetyFactor *= 1.2; // +20%
  }

  if (context.stress) {
    safetyFactor *= 1.1; // +10%
  }

  if (context.menstruation) {
    safetyFactor *= 1.1; // +10%
  }

  // More conservative at night (22:00-06:00)
  const hour = context.hourOfDay;
  if (hour !== undefined && (hour >= 22 || hour <= 6)) {
    safetyFactor *= 0.95; // -5%
  }

  // Also apply during dinner time (19:00-21:59)
  if (hour !== undefined && hour >= 19 && hour < 22) {
    safetyFactor *= 0.95; // -5%
  }

  // Adjustment for high-fat meal
  if (context.highFatMeal) {
    safetyFactor *= 0.85; // -15%
  }

  return calculatedDose * safetyFactor;
};

/**
 * Evaluates safety before sleep
 *
 * Rules:
 * - Glucose < 100 OR (glucose < 120 AND IOB > 1.0): Snack needed
 * - Glucose > 250: Conservative correction
 * - Glucose 180-250: Monitor
 * - Safe target for sleep: 140 mg/dL (higher than daytime)
 *
 * @param glucose - Current glucose in mg/dL
 * @param previousInjections - Injections from recent hours
 * @param diaHours - Duration of insulin action
 * @param isf - Insulin sensitivity factor
 * @returns Evaluation with recommendation
 */
export const evaluatePreSleep = (
  glucose: number,
  previousInjections: Injection[],
  diaHours: number,
  isf: number,
): PreSleepEvaluation => {
  const iob = calculateIOB(previousInjections, Date.now(), diaHours);
  const safeTarget = 140;

  // Risk of nocturnal hypoglycemia
  if (glucose < 100 || (glucose < 120 && iob > 1.0)) {
    return {
      action: "eat_snack",
      correctionDose: 0,
      snack: true,
      carbohydrates: 15, // 15g without insulin
      warning: t("preSleep.riskNocturnalHypo"),
    };
  }

  // Very high glucose
  if (glucose > 250) {
    const correction = (glucose - safeTarget) / isf - iob;
    if (correction > 0.5) {
      return {
        action: "small_correction",
        correctionDose: Math.round(correction * 0.7 * 2) / 2, // 70% of correction
        snack: false,
        warning: t("preSleep.veryHighGlucose"),
      };
    }
  }

  // Moderately high glucose
  if (glucose >= 180 && glucose <= 250) {
    return {
      action: "monitor",
      correctionDose: 0,
      snack: false,
      warning: t("preSleep.monitorTrend"),
    };
  }

  // Safe range
  return {
    action: "sleep",
    correctionDose: 0,
    snack: false,
    warning: null,
  };
};

/**
 * Calculates correction between meals with "50% Rule"
 *
 * In between-meals corrections, use only 50% of calculated correction
 * Reason: Without carbohydrates, margin of error is smaller
 *
 * Additional rules:
 * - Wait at least 3 hours since last dose
 * - Higher target (120 mg/dL vs 100 mg/dL at meals)
 * - Minimum dose of 0.5U if correcting
 *
 * @param glucose - Current glucose in mg/dL
 * @param previousInjections - Previous injections
 * @param diaHours - Duration of insulin action
 * @param isf - Insulin sensitivity factor
 * @returns Result with dose and reason
 */
export const calculateBetweenMealCorrection = (
  glucose: number,
  targetGlucose: number,
  previousInjections: Injection[],
  diaHours: number,
  isf: number,
): CorrectionResult => {
  const now = Date.now();
  const iob = calculateIOB(previousInjections, now, diaHours);
  const target = targetGlucose * 1.2; // Higher target outside meals

  // Check 3-hour rule
  if (!check3HourRule(previousInjections, now)) {
    const minutesSinceLast = previousInjections.length
      ? (now - Math.max(...previousInjections.map((i) => i.timestamp))) / 60000
      : 0;

    return {
      dose: 0,
      reason: t("correction.wait3Hours", { hours: Math.round(minutesSinceLast / 60) }),
      recommendedAction: "monitor",
    };
  }

  // Calculate conservative correction
  let correction = (glucose - target) / isf - iob;

  // Apply 50% rule
  if (correction > 0) {
    correction *= 0.5;
    const roundedDose = Math.max(0.5, Math.round(correction * 2) / 2);

    return {
      dose: roundedDose,
      reason: t("correction.conservativeCorrection", { iob: iob.toFixed(1) }),
      precaution: t("correction.checkGlucose"),
      iob: iob,
    };
  }

  return {
    dose: 0,
    reason: t("correction.noCorrectionNeeded"),
    iob: iob,
  };
};

/**
 * Generates warnings based on context and values
 *
 * @param glucose - Current glucose
 * @param iob - Active insulin
 * @param dose - Calculated dose
 * @param carbohydrates - Carbohydrates to consume
 * @param context - Additional context
 * @returns Array of warnings
 */
export const generateWarnings = (
  glucose: number,
  iob: number,
  dose: number,
  carbohydrates: number,
  context?: DoseContext,
): string[] => {
  const warnings: string[] = [];

  // Hypoglycemia
  if (glucose < 70) {
    warnings.push(t("warnings.hypoglycemia"));
  }

  // High IOB with low glucose
  if (glucose < 100 && iob > 1.0) {
    warnings.push(t("warnings.highIobLowGlucose"));
  }

  // Very high glucose
  if (glucose > 300) {
    warnings.push(t("warnings.veryHighGlucose"));
  }

  // Carbohydrates without insulin
  if (dose === 0 && carbohydrates > 0) {
    warnings.push(t("warnings.carbsWithoutInsulin"));
  }

  // High nocturnal dose
  if (context?.hourOfDay !== undefined && context.hourOfDay >= 22 && dose > 5) {
    warnings.push(t("warnings.highNocturnalDose"));
  }

  // Very high dose in general
  if (dose > 15) {
    warnings.push(t("warnings.veryHighDose"));
  }

  // Recent exercise
  if (context?.recentExercise) {
    warnings.push(t("warnings.recentExercise"));
  }

  // Alcohol
  if (context?.alcohol) {
    warnings.push(t("warnings.alcohol"));
  }

  // High-fat meal
  if (context?.highFatMeal) {
    warnings.push(t("warnings.highFatMeal"));
  }

  // Illness
  if (context?.illness) {
    warnings.push(t("warnings.illness"));
  }

  // Stress
  if (context?.stress) {
    warnings.push(t("warnings.stress"));
  }

  // Menstruation
  if (context?.menstruation) {
    warnings.push(t("warnings.menstruation"));
  }

  return warnings;
};
