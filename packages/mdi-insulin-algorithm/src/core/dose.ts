import type {
  DoseCalculationInput,
  InsulinProfile,
  DoseResult,
  DoseBreakdown,
} from "../models/types.js";
import { calculateIOB } from "./iob.js";
import { applySafetyFactor, generateWarnings } from "./safety.js";
import { roundDose, roundDecimals } from "../utils/math.js";
import { t } from "../i18n/i18n.js";

/**
 * Calculates recommended insulin dose
 *
 * Fundamental formula:
 * TOTAL_DOSE = PRANDIAL_INSULIN + CORRECTION_INSULIN - ACTIVE_IOB
 *
 * Where:
 * - PRANDIAL_INSULIN = CARBOHYDRATES / IC_RATIO
 * - CORRECTION_INSULIN = (CURRENT_GLUCOSE - TARGET_GLUCOSE) / ISF
 * - ACTIVE_IOB = Remaining insulin from previous doses
 *
 * Applies safety factors based on context:
 * - Recent exercise: -20%
 * - Nocturnal (dinner): -5%
 * - Between-meals correction: -50%
 *
 * Rounds to 0.5U (typical insulin pen increment)
 *
 * @param profile - User's insulin profile (ISF, IC Ratios, DIA, target)
 * @param data - Current data (glucose, carbohydrates, timeOfDay, previous injections, context)
 * @returns Result with recommended dose, breakdown, and warnings
 *
 * @example
 * const profile = {
 *   isf: 50,
 *   icRatio: { breakfast: 15, lunch: 12, dinner: 10 },
 *   diaHours: 4,
 *   target: 100
 * };
 *
 * const result = calculateDose(profile, {
 *   timeOfDay: 'lunch',
 *   glucose: 180,
 *   carbohydrates: 70,
 *   previousInjections: [{ timestamp: Date.now() - 3*3600000, units: 6 }]
 * });
 *
 * // result.dose: 8.0
 * // result.breakdown: { prandial: 5.8, correction: 2.2, iob: 0.5 }
 */
export const calculateDose = (profile: InsulinProfile, data: DoseCalculationInput): DoseResult => {
  const { isf, icRatio, diaHours, target } = profile;
  const { timeOfDay, glucose, carbohydrates = 0, previousInjections = [], context } = data;

  // 1. Calculate IOB (Active Insulin)
  const iob = calculateIOB(previousInjections, Date.now(), diaHours);

  // 2. Calculate prandial insulin (for carbohydrates)
  // Use IC Ratio corresponding to time of day
  const icRatioTimeOfDay = icRatio[timeOfDay === "correction" ? "lunch" : timeOfDay];
  const prandialInsulin = carbohydrates > 0 ? carbohydrates / icRatioTimeOfDay : 0;

  // 3. Calculate correction insulin
  const glucoseDifference = glucose - target;
  let correctionInsulin = glucoseDifference / isf;

  // 4. Subtract IOB from correction
  // If IOB is high, it can reduce or eliminate the need for correction
  correctionInsulin -= iob;

  // Don't allow large negative corrections (maximum -1.0U)
  // This prevents negative doses due to excessive IOB
  if (correctionInsulin < -1.0) {
    correctionInsulin = 0;
  }

  // 5. Sum components
  // Only use positive correction in total
  let totalDose = prandialInsulin + Math.max(0, correctionInsulin);

  // 6. Apply safety factors based on context
  const doseBeforeAdjustment = totalDose;

  // For between-meals corrections, apply 50% rule before other adjustments
  if (timeOfDay === "correction") {
    totalDose *= 0.5;
  }

  totalDose = applySafetyFactor(totalDose, context);

  // Calculate applied adjustments for breakdown
  const adjustments: DoseBreakdown["adjustments"] = {};
  if (context?.recentExercise) {
    adjustments.exercise = -20;
  }
  const isNocturnal = timeOfDay === "dinner" || (context?.hourOfDay && context.hourOfDay >= 19);
  if (isNocturnal) {
    adjustments.nocturnal = -5;
  }
  if (timeOfDay === "correction") {
    adjustments.betweenMeals = -50;
  }

  // 7. Round to pen increment (0.5U)
  totalDose = roundDose(totalDose, 0.5);

  // 8. Safety limit: no negative doses
  totalDose = Math.max(0, totalDose);

  // 9. Generate warnings
  const warnings = generateWarnings(glucose, iob, totalDose, carbohydrates, context);

  // Additional warning if dose was greatly reduced by adjustments
  if (doseBeforeAdjustment > 0 && totalDose / doseBeforeAdjustment < 0.7 && totalDose > 0) {
    warnings.push(
      t("dose.reducedByFactors", {
        reduction: Math.round((1 - totalDose / doseBeforeAdjustment) * 100),
      }),
    );
  }

  // 10. Prepare breakdown
  const breakdown: DoseBreakdown = {
    prandial: roundDecimals(prandialInsulin, 1),
    correction: roundDecimals(Math.max(0, correctionInsulin + iob), 1), // Gross correction
    iob: roundDecimals(iob, 1),
    ...(Object.keys(adjustments).length > 0 && { adjustments }),
  };

  return {
    dose: totalDose,
    breakdown,
    warnings,
  };
};

/**
 * Calculates dose for breakfast
 * Considers dawn phenomenon (morning resistance) if applicable
 *
 * @param profile - User's insulin profile
 * @param data - Current data
 * @returns Result with recommended dose
 */
export const calculateBreakfastDose = (
  profile: InsulinProfile,
  data: Omit<DoseCalculationInput, "timeOfDay">,
): DoseResult => {
  return calculateDose(profile, {
    ...data,
    timeOfDay: "breakfast",
  });
};

/**
 * Calculates dose for lunch
 * Considers morning physical activity if applicable
 *
 * @param profile - User's insulin profile
 * @param data - Current data
 * @returns Result with recommended dose
 */
export const calculateLunchDose = (
  profile: InsulinProfile,
  data: Omit<DoseCalculationInput, "timeOfDay">,
): DoseResult => {
  return calculateDose(profile, {
    ...data,
    timeOfDay: "lunch",
  });
};

/**
 * Calculates dose for dinner
 * Applies nocturnal safety factor (-5%) automatically
 *
 * @param profile - User's insulin profile
 * @param data - Current data
 * @returns Result with recommended dose
 */
export const calculateDinnerDose = (
  profile: InsulinProfile,
  data: Omit<DoseCalculationInput, "timeOfDay">,
): DoseResult => {
  // Ensure nocturnal adjustment is applied
  const dinnerContext = {
    ...data.context,
    hourOfDay: data.context?.hourOfDay ?? 19, // Default 19:00 if not specified
  };

  return calculateDose(profile, {
    ...data,
    timeOfDay: "dinner",
    context: dinnerContext,
  });
};

/**
 * Calculates correction dose between meals
 * Applies 50% rule automatically
 *
 * @param profile - User's insulin profile
 * @param data - Current data (without carbohydrates)
 * @returns Result with recommended dose
 */
export const calculateCorrectionDose = (
  profile: InsulinProfile,
  data: Omit<DoseCalculationInput, "timeOfDay" | "carbohydrates">,
): DoseResult => {
  return calculateDose(profile, {
    ...data,
    timeOfDay: "correction",
    carbohydrates: 0,
  });
};
