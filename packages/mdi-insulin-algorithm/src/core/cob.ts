import type { Meal } from "../models/types.js";
import { determineAbsorptionDuration } from "../utils/math.js";

/**
 * Calculates Carbs On Board (COB) at a given moment
 *
 * Uses a simple linear absorption model:
 * - COB = carbohydrates × (1 - hoursSince / absorptionDuration)
 * - Duration depends on meal type (3-6 hours)
 *
 * This calculation helps decide if additional insulin is needed and
 * avoid hypoglycemia from insulin without pending carbohydrates.
 *
 * Limitations:
 * - Does not detect real-time absorption (would require CGM)
 * - Assumes linear absorption (reality is more complex)
 * - Does not consider individual factors (gastroparesis, etc.)
 *
 * @param meals - Array of previous meals
 * @param now - Current timestamp in milliseconds (default: Date.now())
 * @returns Pending carbohydrates to be absorbed in grams
 *
 * @example
 * const meals = [
 *   { timestamp: Date.now() - 2 * 3600000, carbohydrates: 60, type: 'normal' },
 *   { timestamp: Date.now() - 5 * 3600000, carbohydrates: 40, type: 'fast' },
 * ];
 * const cob = calculateCOB(meals);
 * // First meal: ~30g pending (50% of 60g, 2h of 4h)
 * // Second meal: 0g (outside 3h window)
 * // Total: ~30g
 */
export const calculateCOB = (meals: Meal[], now: number = Date.now()): number => {
  let totalCOB = 0;

  for (const meal of meals) {
    const minutesSince = (now - meal.timestamp) / 60000;
    const hoursSince = minutesSince / 60;

    // Get absorption duration by meal type
    const absorptionDuration = determineAbsorptionDuration(meal.type);

    // Only consider meals within the absorption window
    if (hoursSince < absorptionDuration && hoursSince >= 0) {
      // Linear absorption model
      // absorbedFraction = 0 at t=0, to 1 at t=duration
      const absorbedFraction = hoursSince / absorptionDuration;
      const remainingCarbs = meal.carbohydrates * (1 - absorbedFraction);
      totalCOB += Math.max(0, remainingCarbs);
    }
  }

  // Round to integer (gram precision)
  return Math.round(totalCOB);
};

/**
 * Calculates remaining carbohydrates from a single meal
 * Useful for detailed analysis or debugging
 *
 * @param carbohydrates - Grams of carbohydrates from the meal
 * @param hoursSince - Hours elapsed since the meal
 * @param absorptionDuration - Absorption duration in hours
 * @returns Remaining carbohydrates from this meal
 */
export const calculateRemainingCOB = (
  carbohydrates: number,
  hoursSince: number,
  absorptionDuration: number,
): number => {
  if (hoursSince >= absorptionDuration || hoursSince < 0) {
    return 0;
  }

  const absorbedFraction = hoursSince / absorptionDuration;
  const remainingCarbs = carbohydrates * (1 - absorbedFraction);
  return Math.max(0, remainingCarbs);
};

/**
 * Estimates the percentage of carbohydrates absorbed
 *
 * @param meal - Meal to analyze
 * @param now - Current timestamp in milliseconds
 * @returns Percentage absorbed (0-100)
 */
export const percentageAbsorbed = (meal: Meal, now: number = Date.now()): number => {
  const hoursSince = (now - meal.timestamp) / 3600000;
  const absorptionDuration = determineAbsorptionDuration(meal.type);

  if (hoursSince >= absorptionDuration) {
    return 100;
  }

  if (hoursSince <= 0) {
    return 0;
  }

  return Math.round((hoursSince / absorptionDuration) * 100);
};
