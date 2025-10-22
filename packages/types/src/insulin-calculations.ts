import { CARB_GLUCOSE_IMPACT, CRITICAL_MIN_GLUCOSE, CRITICAL_MAX_GLUCOSE } from "./constants";

/**
 * Alert level for glucose projections
 */
export type AlertLevel = "none" | "warning" | "danger";

/**
 * Result of glucose alert evaluation
 */
export interface GlucoseAlert {
  level: AlertLevel;
  message: string;
  projectedGlucose: number;
}

/**
 * Calculate projected glucose after applying insulin
 * Useful for UI to show estimated glucose outcome
 */
export function calculateProjectedGlucose(
  currentGlucose: number,
  carbohydrates: number,
  insulinUnits: number,
  insulinSensitivityFactor: number,
  carbGlucoseImpact = CARB_GLUCOSE_IMPACT,
): number {
  const carbImpact = carbohydrates * carbGlucoseImpact;
  const insulinImpact = insulinUnits * insulinSensitivityFactor;
  return Math.round(currentGlucose + carbImpact - insulinImpact);
}

/**
 * Validate glucose reading
 * Useful for input validation in forms
 */
export function isValidGlucoseReading(glucose: number | undefined): boolean {
  if (glucose === undefined) return false;
  return glucose >= 20 && glucose <= 600;
}

/**
 * Validate insulin dose
 * Useful for input validation in forms
 */
export function isValidInsulinDose(insulin: number | undefined): boolean {
  if (insulin === undefined) return false;
  return insulin >= 0.5 && insulin <= 100;
}
