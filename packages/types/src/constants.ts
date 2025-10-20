/**
 * Shared constants for glucose and insulin calculations
 */

/**
 * Critical safety range for glucose levels (mg/dL)
 * These are absolute limits that indicate severe risk
 */
export const CRITICAL_MIN_GLUCOSE = 30; // Below this is severe hypoglycemia
export const CRITICAL_MAX_GLUCOSE = 350; // Above this is severe hyperglycemia

/**
 * Default target glucose range (mg/dL)
 * These are personalized per user but these are the defaults
 */
export const DEFAULT_MIN_TARGET_GLUCOSE = 80;
export const DEFAULT_MAX_TARGET_GLUCOSE = 140;

/**
 * Default insulin parameters
 */
export const DEFAULT_CARB_RATIO = 10; // grams of carbs per 1 unit of insulin
export const DEFAULT_INSULIN_SENSITIVITY_FACTOR = 50; // mg/dL drop per 1 unit of insulin

/**
 * Carbohydrate impact on glucose
 * Approximate: 1g carb raises glucose by ~3 mg/dL
 */
export const CARB_GLUCOSE_IMPACT = 3;

/**
 * Validation ranges
 */
export const MIN_GLUCOSE_READING = 20; // mg/dL
export const MAX_GLUCOSE_READING = 600; // mg/dL
export const MIN_INSULIN_DOSE = 0.5; // units
export const MAX_INSULIN_DOSE = 100; // units
