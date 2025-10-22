import type { DayRecord, ValidationResult } from "../models/types.js";
import { t } from "../i18n/i18n.js";

/**
 * Validates insulin model based on weekly record
 *
 * Analyzes:
 * - Percentage of time in range (70-180 mg/dL)
 * - Hypoglycemia rate (<70 mg/dL)
 * - Hyperglycemia rate (>180 mg/dL)
 *
 * Goal: >70% time in range, <10% hypoglycemias
 *
 * @param weeklyRecord - Array of daily records (minimum 3 days, maximum 14)
 * @returns Result with metrics and adjustment recommendation
 *
 * @example
 * const record = [
 *   {
 *     date: '2025-01-01',
 *     measurements: [
 *       { timestamp: ..., glucose: 120, glucose3hLater: 110, insulin: 5, carbs: 60 },
 *       { timestamp: ..., glucose: 95, glucose3hLater: 140, insulin: 8, carbs: 80 }
 *     ]
 *   },
 *   // ... more days
 * ];
 *
 * const validation = validateWeeklyModel(record);
 * // validation.daysInRange: 0.85 (85% days with good control)
 * // validation.hypoglycemiaRate: 0.03 (3% hypoglycemias)
 * // validation.recommendation: "✓ MODEL WORKING WELL..."
 */
export const validateWeeklyModel = (weeklyRecord: DayRecord[]): ValidationResult => {
  let daysInRange = 0;
  let totalHypos = 0;
  let totalHyper = 0;
  let totalMeasurements = 0;

  // Target ranges
  const GLUCOSE_MIN = 70;
  const GLUCOSE_MAX = 180;

  for (const day of weeklyRecord) {
    let measurementsInRangeDay = 0;
    let validMeasurementsDay = 0;

    for (const measurement of day.measurements) {
      // Analyze result 3h later if available
      // If not, use current glucose
      const glucoseToAnalyze = measurement.glucose3hLater ?? measurement.glucose;

      totalMeasurements++;
      validMeasurementsDay++;

      if (glucoseToAnalyze >= GLUCOSE_MIN && glucoseToAnalyze <= GLUCOSE_MAX) {
        measurementsInRangeDay++;
      } else if (glucoseToAnalyze < GLUCOSE_MIN) {
        totalHypos++;
      } else {
        totalHyper++;
      }
    }

    // A day is considered "in range" if ≥70% of measurements are in range
    if (validMeasurementsDay > 0 && measurementsInRangeDay / validMeasurementsDay >= 0.7) {
      daysInRange++;
    }
  }

  // Calculate metrics
  const percentageDaysInRange = daysInRange / weeklyRecord.length;
  const hypoglycemiaRate = totalMeasurements > 0 ? totalHypos / totalMeasurements : 0;
  const hyperglycemiaRate = totalMeasurements > 0 ? totalHyper / totalMeasurements : 0;

  // Generate recommendation
  const recommendation = generateAdjustmentRecommendation(
    percentageDaysInRange,
    hypoglycemiaRate,
    hyperglycemiaRate,
  );

  return {
    daysInRange: Math.round(percentageDaysInRange * 100) / 100,
    hypoglycemiaRate: Math.round(hypoglycemiaRate * 100) / 100,
    hyperglycemiaRate: Math.round(hyperglycemiaRate * 100) / 100,
    recommendation,
  };
};

/**
 * Generates adjustment recommendation based on metrics
 *
 * Priorities:
 * 1. Safety: Reduce hypoglycemias (critical if >10%)
 * 2. Control: Improve time in range (goal >70%)
 * 3. Optimization: Reduce hyperglycemias without increasing hypos
 *
 * @param percentageRange - Percentage of days in range (0-1)
 * @param hypoRate - Hypoglycemia rate (0-1)
 * @param hyperRate - Hyperglycemia rate (0-1)
 * @returns Textual adjustment recommendation
 */
export const generateAdjustmentRecommendation = (
  percentageRange: number,
  hypoRate: number,
  hyperRate: number,
): string => {
  // PRIORITY 1: Too many hypoglycemias (>10%)
  if (hypoRate > 0.1) {
    return t("validation.urgentAdjustment", { hypoRate: (hypoRate * 100).toFixed(0) });
  }

  // PRIORITY 2: Moderate hypoglycemias (5-10%)
  if (hypoRate > 0.05) {
    return t("validation.caution", { hypoRate: (hypoRate * 100).toFixed(0) });
  }

  // PRIORITY 3: Poor control (<50% in range)
  if (percentageRange < 0.5) {
    if (hyperRate > 0.4) {
      return t("validation.reviewPoorControlHyper", {
        percentageRange: (percentageRange * 100).toFixed(0),
        hyperRate: (hyperRate * 100).toFixed(0),
      });
    }
    return t("validation.reviewPoorControl", {
      percentageRange: (percentageRange * 100).toFixed(0),
    });
  }

  // PRIORITY 4: Moderate control (50-70% in range)
  if (percentageRange < 0.7) {
    if (hyperRate > 0.3) {
      return t("validation.optimize", {
        percentageRange: (percentageRange * 100).toFixed(0),
        hyperRate: (hyperRate * 100).toFixed(0),
      });
    }
    return t("validation.continue", {
      percentageRange: (percentageRange * 100).toFixed(0),
    });
  }

  // PRIORITY 5: Good control (≥70% in range, <5% hypos)
  if (percentageRange >= 0.7 && hypoRate < 0.05) {
    if (hypoRate === 0 && hyperRate < 0.1) {
      return t("validation.excellent", {
        percentageRange: (percentageRange * 100).toFixed(0),
      });
    }
    return t("validation.modelWorking", {
      percentageRange: (percentageRange * 100).toFixed(0),
      hypoRate: (hypoRate * 100).toFixed(0),
    });
  }

  return t("validation.continueMonitoring");
};

/**
 * Analyzes glucose patterns to detect trends
 *
 * Identifies:
 * - Recurring hypoglycemias at certain times
 * - Consistent post-prandial hyperglycemias
 * - Excessive glucose variability
 *
 * @param weeklyRecord - Array of daily records
 * @returns Object with identified patterns and suggestions
 */
export const analyzePatterns = (
  weeklyRecord: DayRecord[],
): {
  identifiedPatterns: string[];
  suggestions: string[];
} => {
  const identifiedPatterns: string[] = [];
  const suggestions: string[] = [];

  // Group measurements by approximate time of day
  const measurementsByHour: Record<number, number[]> = {};

  for (const day of weeklyRecord) {
    for (const measurement of day.measurements) {
      const date = new Date(measurement.timestamp);
      const hour = date.getHours();

      if (!measurementsByHour[hour]) {
        measurementsByHour[hour] = [];
      }

      const glucoseToAnalyze = measurement.glucose3hLater ?? measurement.glucose;
      measurementsByHour[hour].push(glucoseToAnalyze);
    }
  }

  // Analyze each time slot
  for (const [hourStr, glucoses] of Object.entries(measurementsByHour)) {
    if (glucoses.length < 2) continue; // Need at least 2 measurements

    const hour = parseInt(hourStr);
    const average = glucoses.reduce((sum, g) => sum + g, 0) / glucoses.length;
    const hyposAtHour = glucoses.filter((g) => g < 70).length;
    const hyperAtHour = glucoses.filter((g) => g > 180).length;

    // Detect recurring hypoglycemias
    if (hyposAtHour >= 2 || hyposAtHour / glucoses.length > 0.4) {
      let timeDesc = "unknown time";
      if (hour >= 6 && hour < 10) timeDesc = "morning";
      else if (hour >= 10 && hour < 14) timeDesc = "midday";
      else if (hour >= 14 && hour < 20) timeDesc = "afternoon";
      else timeDesc = "night";

      identifiedPatterns.push(t("patterns.recurringHypos", { timeDesc, hour }));
      suggestions.push(t("patterns.suggestReduceDose", { hour }));
    }

    // Detect recurring hyperglycemias
    if (hyperAtHour >= 2 || hyperAtHour / glucoses.length > 0.5) {
      if (average > 200) {
        identifiedPatterns.push(
          t("patterns.consistentHyper", {
            hour,
            average: Math.round(average),
          }),
        );
        suggestions.push(t("patterns.suggestIncreaseDose", { hour }));
      }
    }
  }

  // General variability analysis
  const allGlucoses: number[] = [];
  for (const day of weeklyRecord) {
    for (const measurement of day.measurements) {
      allGlucoses.push(measurement.glucose3hLater ?? measurement.glucose);
    }
  }

  if (allGlucoses.length > 0) {
    const average = allGlucoses.reduce((sum, g) => sum + g, 0) / allGlucoses.length;
    const variance =
      allGlucoses.reduce((sum, g) => sum + Math.pow(g - average, 2), 0) / allGlucoses.length;
    const standardDeviation = Math.sqrt(variance);

    // High variability (SD > 50 mg/dL is high)
    if (standardDeviation > 50) {
      identifiedPatterns.push(
        t("patterns.highVariability", {
          standardDeviation: Math.round(standardDeviation),
        }),
      );
      suggestions.push(t("patterns.suggestConsistency"));
    }
  }

  if (identifiedPatterns.length === 0) {
    identifiedPatterns.push(t("patterns.noPatterns"));
  }

  return {
    identifiedPatterns,
    suggestions,
  };
};
