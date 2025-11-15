import { z } from "zod";

/**
 * Validation schema for meal types
 */
export const mealTypeSchema = z.enum(["fast", "normal", "slow", "very_slow"]);

/**
 * Validation schema for times of day
 */
export const timeOfDaySchema = z.enum(["breakfast", "lunch", "dinner", "correction"]);

/**
 * Validation schema for injection
 */
export const injectionSchema = z.object({
  timestamp: z.number().positive("Timestamp must be positive"),
  units: z.number().positive("Units must be positive").max(50, "Dose too high"),
});

/**
 * Validation schema for meal
 */
export const mealSchema = z.object({
  timestamp: z.number().positive("Timestamp must be positive"),
  carbohydrates: z
    .number()
    .nonnegative("Carbohydrates cannot be negative")
    .max(300, "Carbohydrate amount too high"),
  type: mealTypeSchema,
});

/**
 * Validation schema for IC Ratio
 */
export const icRatioSchema = z.object({
  breakfast: z
    .number()
    .positive("IC Ratio breakfast must be positive")
    .min(3, "IC Ratio too low")
    .max(30, "IC Ratio too high"),
  lunch: z
    .number()
    .positive("IC Ratio lunch must be positive")
    .min(3, "IC Ratio too low")
    .max(30, "IC Ratio too high"),
  dinner: z
    .number()
    .positive("IC Ratio dinner must be positive")
    .min(3, "IC Ratio too low")
    .max(30, "IC Ratio too high"),
});

/**
 * Validation schema for insulin profile
 */
export const insulinProfileSchema = z.object({
  isf: z.number().positive("ISF must be positive").min(10, "ISF too low").max(200, "ISF too high"),
  icRatio: icRatioSchema,
  diaHours: z
    .number()
    .positive("DIA must be positive")
    .min(2, "DIA too short")
    .max(8, "DIA too long"),
  target: z.number().min(70, "Target too low").max(180, "Target too high").default(100),
});

/**
 * Validation schema for dose context
 */
export const doseContextSchema = z.object({
  recentExercise: z.boolean().optional(),
  alcohol: z.boolean().optional(),
  illness: z.boolean().optional(),
  stress: z.boolean().optional(),
  menstruation: z.boolean().optional(),
  highFatMeal: z.boolean().optional(),
  hourOfDay: z.number().min(0).max(23).optional(),
});

/**
 * Validation schema for dose calculation input
 */
export const doseCalculationInputSchema = z.object({
  timeOfDay: timeOfDaySchema,
  glucose: z
    .number()
    .min(20, "Glucose too low - seek medical attention")
    .max(600, "Glucose too high - seek medical attention"),
  carbohydrates: z.number().nonnegative("Carbohydrates cannot be negative").optional(),
  previousInjections: z.array(injectionSchema).optional().default([]),
  context: doseContextSchema.optional(),
});

/**
 * Validation schema for glucose measurement
 */
export const glucoseMeasurementSchema = z.object({
  timestamp: z.number().positive("Timestamp must be positive"),
  glucose: z.number().min(20).max(600),
  glucose3hLater: z.number().min(20).max(600).optional(),
  insulin: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
});

/**
 * Validation schema for daily record
 */
export const dayRecordSchema = z.object({
  date: z.string(),
  measurements: z.array(glucoseMeasurementSchema).min(1, "Must have at least one measurement"),
});

/**
 * Validation schema for weekly record
 */
export const weeklyRecordSchema = z
  .array(dayRecordSchema)
  .min(3, "At least 3 days of data required")
  .max(14, "Maximum 14 days of data");

/**
 * Helper functions for validation
 */

/**
 * Validates an insulin profile
 * @param profile - Profile to validate
 * @returns Validated profile
 * @throws Error if validation fails
 */
export const validateInsulinProfile = (profile: unknown) => {
  return insulinProfileSchema.parse(profile);
};

/**
 * Validates a dose calculation input
 * @param input - Input to validate
 * @returns Validated input
 * @throws Error if validation fails
 */
export const validateDoseCalculationInput = (input: unknown) => {
  return doseCalculationInputSchema.parse(input);
};

/**
 * Validates a weekly record
 * @param record - Record to validate
 * @returns Validated record
 * @throws Error if validation fails
 */
export const validateWeeklyRecord = (record: unknown) => {
  return weeklyRecordSchema.parse(record);
};
