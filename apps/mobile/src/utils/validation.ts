/**
 * Mobile-specific validation utilities
 * Re-exports shared validation functions and adds mobile-specific validators
 */

import {
  validateGlucose,
  validateCarbohydrates,
  validateTargetGlucose,
  validateDate,
  type ValidationResult,
} from "@glucosapp/utils";

// Re-export shared validation functions
export { validateGlucose, validateCarbohydrates, validateTargetGlucose, validateDate };
export type { ValidationResult };

/**
 * Validate if glucose level is suitable for dose calculation
 * This prevents backend calls that will fail due to algorithm requirements
 */
export const validateGlucoseForDoseCalculation = (value: number | undefined): ValidationResult => {
  if (value === undefined || isNaN(value)) {
    return { isValid: true }; // Don't block if no value
  }

  // Backend algorithm requires minimum 40 mg/dL for dose calculation
  if (value < 40) {
    return {
      isValid: false,
      message: "La glucosa debe ser al menos 40 mg/dL para calcular la dosis de insulina",
      severity: "error",
    };
  }

  return { isValid: true };
};

/**
 * Validate all form fields at once
 */
export const validateForm = (formData: {
  glucoseLevel?: number;
  carbohydrates?: number;
  targetGlucose?: number;
  appliedInsulin?: number;
  recordedAt?: Date;
  isFasting?: boolean;
}) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate glucose
  const glucoseValidation = validateGlucose(formData.glucoseLevel);
  if (!glucoseValidation.isValid) {
    errors.push(glucoseValidation.message || "");
  } else if (glucoseValidation.message && glucoseValidation.severity === "warning") {
    warnings.push(glucoseValidation.message);
  }

  // Additional validation for dose calculation (both meal and fasting modes)
  if (formData.glucoseLevel !== undefined) {
    const doseValidation = validateGlucoseForDoseCalculation(formData.glucoseLevel);
    if (!doseValidation.isValid) {
      errors.push(doseValidation.message || "");
    }
  }

  // Validate carbohydrates (only if not fasting)
  if (formData.carbohydrates !== undefined) {
    const carbValidation = validateCarbohydrates(formData.carbohydrates);
    if (!carbValidation.isValid) {
      errors.push(carbValidation.message || "");
    } else if (carbValidation.message && carbValidation.severity === "warning") {
      warnings.push(carbValidation.message);
    }
  }

  // Validate target glucose (only if provided)
  if (formData.targetGlucose !== undefined) {
    const targetValidation = validateTargetGlucose(formData.targetGlucose, formData.glucoseLevel);
    if (!targetValidation.isValid) {
      errors.push(targetValidation.message || "");
    }
  }

  // Validate insulin units (basic validation)
  if (formData.appliedInsulin !== undefined) {
    if (formData.appliedInsulin < 0) {
      errors.push("La dosis de insulina no puede ser negativa");
    } else if (formData.appliedInsulin > 100) {
      errors.push("La dosis de insulina no puede exceder 100 unidades");
    }
  }

  // Validate date (only if provided)
  if (formData.recordedAt) {
    const dateValidation = validateDate(formData.recordedAt);
    if (!dateValidation.isValid) {
      errors.push(dateValidation.message || "");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};
