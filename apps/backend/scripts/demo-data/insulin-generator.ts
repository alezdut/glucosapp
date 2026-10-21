/**
 * Insulin dose calculation logic for demo data
 */

import { PatientProfile } from "./patient-profiles";
import { GeneratedMeal, MealType } from "./meal-generator";
import { round } from "./utils";

export interface GeneratedInsulinDose {
  units: number;
  calculatedUnits: number;
  recordedAt: Date;
  type: "BOLUS" | "BASAL";
  carbInsulin: number;
  correctionInsulin: number;
  wasManuallyEdited: boolean;
}

/**
 * Get IC ratio for specific meal type based on patient profile
 */
function getICRatio(mealType: MealType, profile: PatientProfile): number {
  switch (mealType) {
    case "BREAKFAST":
      return profile.icRatioBreakfast;
    case "LUNCH":
      return profile.icRatioLunch;
    case "DINNER":
      return profile.icRatioDinner;
    case "SNACK":
      // Use average of lunch and dinner for snacks
      return (profile.icRatioLunch + profile.icRatioDinner) / 2;
    default:
      return profile.icRatioLunch;
  }
}

/**
 * Calculate bolus insulin dose for a meal
 */
export function calculateBolusDose(
  meal: GeneratedMeal,
  preMealGlucose: number,
  profile: PatientProfile,
): GeneratedInsulinDose {
  const icRatio = getICRatio(meal.type, profile);
  const targetGlucose = (profile.minTarget + profile.maxTarget) / 2;

  // Carb insulin (carbs / IC ratio)
  const carbInsulin = meal.carbs / icRatio;

  // Correction insulin (only if above target)
  const glucoseDelta = preMealGlucose - targetGlucose;
  const correctionInsulin = Math.max(0, glucoseDelta / profile.insulinSensitivityFactor);

  // Total calculated dose
  const calculatedUnits = carbInsulin + correctionInsulin;

  // Simulate real-world: 80% of the time users accept the calculated dose
  // 20% of the time they adjust it slightly (±1-2 units)
  let actualUnits = calculatedUnits;
  let wasManuallyEdited = false;

  if (Math.random() < 0.2) {
    wasManuallyEdited = true;
    const adjustment = (Math.random() - 0.5) * 4; // ±2 units
    actualUnits = Math.max(0.5, calculatedUnits + adjustment);
  }

  return {
    units: round(actualUnits, 1),
    calculatedUnits: round(calculatedUnits, 1),
    recordedAt: meal.timestamp,
    type: "BOLUS",
    carbInsulin: round(carbInsulin, 1),
    correctionInsulin: round(correctionInsulin, 1),
    wasManuallyEdited,
  };
}

/**
 * Generate insulin doses for all meals in a day
 * Note: This requires the glucose readings to already be generated
 */
export function generateInsulinDosesForMeals(
  meals: GeneratedMeal[],
  glucoseReadings: { glucose: number; timestamp: Date }[],
  profile: PatientProfile,
): GeneratedInsulinDose[] {
  const doses: GeneratedInsulinDose[] = [];

  for (const meal of meals) {
    // Find the closest glucose reading before the meal (within 30 minutes)
    const preMealReading = findPreMealGlucose(meal.timestamp, glucoseReadings);

    if (preMealReading) {
      const dose = calculateBolusDose(meal, preMealReading.glucose, profile);
      doses.push(dose);
    }
  }

  return doses;
}

/**
 * Find glucose reading closest to (but before) a meal time
 */
function findPreMealGlucose(
  mealTime: Date,
  readings: { glucose: number; timestamp: Date }[],
): { glucose: number; timestamp: Date } | null {
  // Look for readings within 30 minutes before the meal
  const thirtyMinutesBefore = new Date(mealTime.getTime() - 30 * 60 * 1000);

  const preMealReadings = readings.filter(
    (r) => r.timestamp >= thirtyMinutesBefore && r.timestamp <= mealTime,
  );

  if (preMealReadings.length === 0) {
    return null;
  }

  // Return the closest reading to meal time
  return preMealReadings.reduce((closest, current) => {
    const closestDiff = Math.abs(mealTime.getTime() - closest.timestamp.getTime());
    const currentDiff = Math.abs(mealTime.getTime() - current.timestamp.getTime());
    return currentDiff < closestDiff ? current : closest;
  });
}

/**
 * Generate basal insulin doses (for Type 1 patients)
 * Most modern regimens use once or twice daily basal
 */
export function generateBasalDoses(date: Date, profile: PatientProfile): GeneratedInsulinDose[] {
  // Only Type 1 patients typically use basal insulin
  if (profile.diabetesType !== "TYPE_1") {
    return [];
  }

  // Estimate basal dose: roughly 40-50% of total daily insulin
  // Total daily insulin ≈ weight in kg / 2 (rough estimate)
  const estimatedTotalDaily = profile.weight / 2;
  const basalTotal = estimatedTotalDaily * 0.45;

  // Split into morning dose (60%) and evening dose (40%)
  const morningDose = round(basalTotal * 0.6, 1);
  const eveningDose = round(basalTotal * 0.4, 1);

  const doses: GeneratedInsulinDose[] = [];

  // Morning basal (7am)
  const morningTime = new Date(date);
  morningTime.setHours(7, 0, 0, 0);
  doses.push({
    units: morningDose,
    calculatedUnits: morningDose,
    recordedAt: morningTime,
    type: "BASAL",
    carbInsulin: 0,
    correctionInsulin: 0,
    wasManuallyEdited: false,
  });

  // Evening basal (10pm)
  const eveningTime = new Date(date);
  eveningTime.setHours(22, 0, 0, 0);
  doses.push({
    units: eveningDose,
    calculatedUnits: eveningDose,
    recordedAt: eveningTime,
    type: "BASAL",
    carbInsulin: 0,
    correctionInsulin: 0,
    wasManuallyEdited: false,
  });

  return doses;
}
