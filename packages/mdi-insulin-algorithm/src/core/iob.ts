import type { Injection } from "../models/types.js";

/**
 * Calculates Insulin On Board (IOB) at a given moment
 *
 * Uses a simple linear decay model:
 * - IOB = units × (1 - hoursSince / DIA)
 * - Only considers injections within the DIA window
 *
 * This calculation is fundamental to prevent "insulin stacking"
 * and avoid excessive corrections.
 *
 * @param injections - Array of previous injections
 * @param now - Current timestamp in milliseconds (default: Date.now())
 * @param diaHours - Duration of Insulin Action in hours (typically 3-5h)
 * @returns Total active insulin in units
 *
 * @example
 * const injections = [
 *   { timestamp: Date.now() - 2 * 3600000, units: 6 }, // 2 hours ago
 *   { timestamp: Date.now() - 5 * 3600000, units: 4 }, // 5 hours ago (outside DIA)
 * ];
 * const iob = calculateIOB(injections, Date.now(), 4);
 * // iob ≈ 3.0 (50% of 6U remaining)
 */
export const calculateIOB = (
  injections: Injection[],
  now: number = Date.now(),
  diaHours: number,
): number => {
  let totalIOB = 0;

  for (const injection of injections) {
    const minutesSince = (now - injection.timestamp) / 60000;
    const hoursSince = minutesSince / 60;

    // Only consider injections within the DIA window
    if (hoursSince < diaHours && hoursSince >= 0) {
      // Simple linear decay model
      // remainingFraction = 1 at t=0, to 0 at t=DIA
      const remainingFraction = 1 - hoursSince / diaHours;
      const remainingIOB = injection.units * Math.max(0, remainingFraction);
      totalIOB += remainingIOB;
    }
  }

  return totalIOB;
};

/**
 * Calculates remaining IOB from a single injection
 * Useful for detailed analysis or debugging
 *
 * @param units - Units of insulin from the injection
 * @param hoursSince - Hours elapsed since the injection
 * @param diaHours - Duration of Insulin Action in hours
 * @returns Remaining insulin from this injection
 */
export const calculateRemainingIOB = (
  units: number,
  hoursSince: number,
  diaHours: number,
): number => {
  if (hoursSince >= diaHours || hoursSince < 0) {
    return 0;
  }

  const remainingFraction = 1 - hoursSince / diaHours;
  return units * Math.max(0, remainingFraction);
};

/**
 * Checks if enough time has passed since the last injection
 * Safety rule: wait at least 3 hours between doses
 *
 * @param injections - Array of previous injections
 * @param now - Current timestamp in milliseconds
 * @param minimumHours - Minimum hours to wait (default: 3)
 * @returns true if it's safe to administer another dose
 */
export const isSafeForNewDose = (
  injections: Injection[],
  now: number = Date.now(),
  minimumHours: number = 3,
): boolean => {
  if (injections.length === 0) {
    return true;
  }

  // Find the most recent injection
  const lastInjection = injections.reduce((max, inj) =>
    inj.timestamp > max.timestamp ? inj : max,
  );

  const hoursSinceLast = (now - lastInjection.timestamp) / 3600000;
  return hoursSinceLast >= minimumHours;
};
