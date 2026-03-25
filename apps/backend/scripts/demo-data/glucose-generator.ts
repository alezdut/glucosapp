/**
 * Glucose reading generation logic for demo data
 */

import { gaussianRandom, clamp, getHourOfDay, randomFloat } from "./utils";
import { PatientProfile } from "./patient-profiles";
import { GeneratedMeal } from "./meal-generator";

export interface GeneratedReading {
  glucose: number;
  timestamp: Date;
  source: "MANUAL" | "LIBRE_NFC" | "DEXCOM";
}

/**
 * Apply diurnal variation (dawn phenomenon and circadian rhythm)
 * Returns a multiplier to apply to base glucose value
 */
function getDiurnalMultiplier(hour: number): number {
  // Dawn phenomenon (4am-8am): slight increase
  if (hour >= 4 && hour < 8) {
    return 1 + 0.05 * Math.sin(((hour - 4) / 4) * Math.PI);
  }

  // Morning peak (8am-10am): normal
  if (hour >= 8 && hour < 10) {
    return 1.0;
  }

  // Midday (10am-4pm): slightly lower
  if (hour >= 10 && hour < 16) {
    return 0.98;
  }

  // Evening (4pm-8pm): normal
  if (hour >= 16 && hour < 20) {
    return 1.0;
  }

  // Night (8pm-4am): slightly lower
  return 0.96;
}

/**
 * Apply meal spike effect based on proximity to meals
 * Returns glucose increase in mg/dL
 */
function getMealSpikeEffect(timestamp: Date, meals: GeneratedMeal[]): number {
  let maxSpike = 0;

  for (const meal of meals) {
    const timeDiff = (timestamp.getTime() - meal.timestamp.getTime()) / (1000 * 60); // minutes

    // Spike starts 15 min after meal, peaks at 60-90 min, returns to baseline by 3 hours
    if (timeDiff >= 0 && timeDiff <= 180) {
      // Spike magnitude based on carbs
      const peakSpike = meal.carbs * 1.5; // ~1.5 mg/dL per gram of carb at peak

      // Time-based spike curve (rises quickly, falls slowly)
      let spikeMultiplier = 0;
      if (timeDiff < 75) {
        // Rising phase (0-75 min)
        spikeMultiplier = Math.sin((timeDiff / 75) * (Math.PI / 2));
      } else {
        // Falling phase (75-180 min)
        spikeMultiplier = Math.cos(((timeDiff - 75) / 105) * (Math.PI / 2));
      }

      const spike = peakSpike * spikeMultiplier;
      maxSpike = Math.max(maxSpike, spike);
    }
  }

  return maxSpike;
}

/**
 * Generate a single glucose reading based on patient profile
 */
export function generateGlucoseReading(
  timestamp: Date,
  profile: PatientProfile,
  meals: GeneratedMeal[],
): GeneratedReading {
  const hour = getHourOfDay(timestamp);

  // 1. Generate base value from Gaussian distribution
  let glucose = gaussianRandom(profile.meanGlucose, profile.stdDev);

  // 2. Apply diurnal variation
  const diurnalMultiplier = getDiurnalMultiplier(hour);
  glucose *= diurnalMultiplier;

  // 3. Apply meal spike effect
  const mealSpike = getMealSpikeEffect(timestamp, meals);
  glucose += mealSpike;

  // 4. Inject events based on profile percentages
  // This ensures we hit the target percentages for hypos and hypers
  const rand = Math.random() * 100;

  // Severe hypoglycemia (<54 mg/dL)
  if (rand < profile.severeHypoglycemiaPercentage) {
    glucose = randomFloat(40, 54);
  }
  // Regular hypoglycemia (<70 mg/dL) - excluding severe
  else if (rand < profile.severeHypoglycemiaPercentage + profile.hypoglycemiaPercentage) {
    glucose = randomFloat(54, 70);
  }
  // Hyperglycemia (>180 mg/dL)
  else if (rand > 100 - profile.hyperglycemiaPercentage) {
    // For high hyperglycemia percentage, ensure some very high values
    if (profile.hyperglycemiaPercentage > 50) {
      glucose = randomFloat(180, 350);
    } else {
      glucose = randomFloat(180, 280);
    }
  }

  // 5. Clamp to valid physiological range
  glucose = clamp(glucose, 20, 600);

  // 6. Round to whole number
  glucose = Math.round(glucose);

  return {
    glucose,
    timestamp,
    source: profile.readingSource,
  };
}

/**
 * Generate glucose readings for a full day
 */
export function generateDailyReadings(
  date: Date,
  profile: PatientProfile,
  meals: GeneratedMeal[],
): GeneratedReading[] {
  const readings: GeneratedReading[] = [];

  if (profile.readingSource === "MANUAL") {
    // Manual readings: spread throughout the day
    // Typical times: fasting, pre-meals, 2hr post-meals, bedtime
    const readingTimes = generateManualReadingTimes(profile.readingsPerDay);

    for (const time of readingTimes) {
      const timestamp = new Date(date);
      timestamp.setHours(Math.floor(time), Math.round((time % 1) * 60), 0, 0);

      const reading = generateGlucoseReading(timestamp, profile, meals);
      readings.push(reading);
    }
  } else {
    // CGM readings: every 5 minutes (288 readings per day)
    for (let minute = 0; minute < 24 * 60; minute += 5) {
      const timestamp = new Date(date);
      timestamp.setHours(0, minute, 0, 0);

      const reading = generateGlucoseReading(timestamp, profile, meals);
      readings.push(reading);
    }
  }

  return readings;
}

/**
 * Generate times for manual readings
 * Returns array of hours (with decimal for minutes)
 */
function generateManualReadingTimes(readingsPerDay: number): number[] {
  const times: number[] = [];

  // Standard times
  const standardTimes = [
    7.0, // Fasting (7am)
    7.5, // Pre-breakfast (7:30am)
    9.5, // Post-breakfast (9:30am)
    12.5, // Pre-lunch (12:30pm)
    14.5, // Post-lunch (2:30pm)
    19.5, // Pre-dinner (7:30pm)
    21.5, // Post-dinner (9:30pm)
    23.0, // Bedtime (11pm)
  ];

  // Select subset based on readings per day
  for (let i = 0; i < Math.min(readingsPerDay, standardTimes.length); i++) {
    // Add small random variation (±15 minutes)
    times.push(standardTimes[i] + randomFloat(-0.25, 0.25));
  }

  return times.sort((a, b) => a - b);
}

/**
 * Verify generated readings meet target percentages
 * Returns statistics about the generated data
 */
export function verifyReadingStatistics(
  readings: GeneratedReading[],
  profile: PatientProfile,
): {
  meanGlucose: number;
  stdDev: number;
  cv: number;
  inRangePercentage: number;
  hypoPercentage: number;
  severeHypoPercentage: number;
  hyperPercentage: number;
} {
  const values = readings.map((r) => r.glucose);
  const n = values.length;

  // Mean
  const mean = values.reduce((sum, v) => sum + v, 0) / n;

  // Standard deviation
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation
  const cv = (stdDev / mean) * 100;

  // Percentages
  const inRange = values.filter((v) => v >= profile.minTarget && v <= profile.maxTarget).length;
  const hypo = values.filter((v) => v < 70).length;
  const severeHypo = values.filter((v) => v < 54).length;
  const hyper = values.filter((v) => v > 180).length;

  return {
    meanGlucose: Math.round(mean),
    stdDev: Math.round(stdDev),
    cv: Math.round(cv * 10) / 10,
    inRangePercentage: Math.round((inRange / n) * 100 * 10) / 10,
    hypoPercentage: Math.round((hypo / n) * 100 * 10) / 10,
    severeHypoPercentage: Math.round((severeHypo / n) * 100 * 10) / 10,
    hyperPercentage: Math.round((hyper / n) * 100 * 10) / 10,
  };
}
