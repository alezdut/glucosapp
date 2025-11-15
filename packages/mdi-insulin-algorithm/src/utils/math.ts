import type { MealType } from "../models/types.js";

/**
 * Rounds an insulin dose to the specified increment
 * Typically 0.5U for standard insulin pens
 *
 * @param value - Value to round
 * @param increment - Rounding increment (default: 0.5)
 * @returns Rounded value
 *
 * @example
 * roundDose(3.7, 0.5) // 3.5
 * roundDose(3.8, 0.5) // 4.0
 */
export const roundDose = (value: number, increment: number = 0.5): number => {
  return Math.round(value / increment) * increment;
};

/**
 * Determines carbohydrate absorption duration by meal type
 * Based on absorption speed:
 * - Fast: 3 hours (juices, candy)
 * - Normal: 4 hours (balanced meal)
 * - Slow: 5 hours (high in fat/protein)
 * - Very slow: 6 hours (pizza, very fatty meal)
 *
 * @param type - Meal type
 * @returns Absorption duration in hours
 */
export const determineAbsorptionDuration = (type: MealType): number => {
  const durations: Record<MealType, number> = {
    fast: 3,
    normal: 4,
    slow: 5,
    very_slow: 6,
  };
  return durations[type];
};

/**
 * Rounds a number to N decimal places
 *
 * @param value - Value to round
 * @param decimals - Number of decimals (default: 1)
 * @returns Rounded value
 */
export const roundDecimals = (value: number, decimals: number = 1): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/**
 * Limits a value between a minimum and maximum
 *
 * @param value - Value to limit
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Limited value
 */
export const clampValue = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};
