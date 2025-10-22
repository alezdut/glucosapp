/**
 * Validation constants and utilities for form inputs
 * Based on backend validation rules and medical best practices
 */

// Glucose level validation
export const GLUCOSE_LIMITS = {
  MIN: 20, // mg/dL - absolute minimum
  MAX: 600, // mg/dL - absolute maximum
  CRITICAL_MIN: 40, // mg/dL - severe hypoglycemia
  CRITICAL_MAX: 350, // mg/dL - severe hyperglycemia
  TARGET_MIN: 70, // mg/dL - minimum for target glucose
  TARGET_MAX: 200, // mg/dL - maximum for target glucose
} as const;

// Carbohydrates validation
export const CARB_LIMITS = {
  MIN: 0, // g - cannot be negative
  MAX: 500, // g - backend maximum
  PRACTICAL_MAX: 300, // g - practical maximum for dose calculation
  NORMAL_MAX: 200, // g - normal meal range
} as const;

// Insulin units validation
export const INSULIN_LIMITS = {
  MIN: 0.5, // units - minimum dose
  MAX: 100, // units - maximum dose
  PRECISION: 0.1, // units - decimal precision
} as const;

// Weight validation (for profile)
export const WEIGHT_LIMITS = {
  MIN: 20, // kg
  MAX: 300, // kg
} as const;

// IC Ratio validation (for profile)
export const IC_RATIO_LIMITS = {
  MIN: 1, // g per unit
  MAX: 30, // g per unit
} as const;

// Insulin Sensitivity Factor validation
export const ISF_LIMITS = {
  MIN: 10, // mg/dL per unit
  MAX: 200, // mg/dL per unit
} as const;

// Date validation
export const DATE_LIMITS = {
  MIN_YEAR: 2020,
  MAX_YEAR: new Date().getFullYear(),
} as const;

/**
 * Validation result type
 */
export type ValidationResult = {
  isValid: boolean;
  message?: string;
  severity?: "error" | "warning" | "info";
};

/**
 * Validate glucose level
 */
export const validateGlucose = (value: number | undefined): ValidationResult => {
  if (value === undefined || isNaN(value)) {
    return { isValid: false, message: "Ingresa un nivel de glucosa válido" };
  }

  if (value < GLUCOSE_LIMITS.MIN) {
    return {
      isValid: false,
      message: `La glucosa debe ser al menos ${GLUCOSE_LIMITS.MIN} mg/dL`,
      severity: "error",
    };
  }

  if (value > GLUCOSE_LIMITS.MAX) {
    return {
      isValid: false,
      message: `La glucosa no puede exceder ${GLUCOSE_LIMITS.MAX} mg/dL`,
      severity: "error",
    };
  }

  if (value < GLUCOSE_LIMITS.CRITICAL_MIN) {
    return {
      isValid: true,
      message: "⚠️ Nivel muy bajo - considera atención médica",
      severity: "warning",
    };
  }

  if (value > GLUCOSE_LIMITS.CRITICAL_MAX) {
    return {
      isValid: true,
      message: "⚠️ Nivel muy alto - considera atención médica",
      severity: "warning",
    };
  }

  return { isValid: true };
};

/**
 * Validate carbohydrates
 */
export const validateCarbohydrates = (value: number | undefined): ValidationResult => {
  if (value === undefined || isNaN(value)) {
    return { isValid: false, message: "Ingresa una cantidad de carbohidratos válida" };
  }

  if (value < CARB_LIMITS.MIN) {
    return {
      isValid: false,
      message: "Los carbohidratos no pueden ser negativos",
      severity: "error",
    };
  }

  if (value > CARB_LIMITS.MAX) {
    return {
      isValid: false,
      message: `Los carbohidratos no pueden exceder ${CARB_LIMITS.MAX}g`,
      severity: "error",
    };
  }

  if (value > CARB_LIMITS.PRACTICAL_MAX) {
    return {
      isValid: true,
      message: "⚠️ Cantidad muy alta - verifica que sea correcta",
      severity: "warning",
    };
  }

  return { isValid: true };
};

/**
 * Validate target glucose
 */
export const validateTargetGlucose = (
  value: number | undefined,
  currentGlucose?: number,
): ValidationResult => {
  if (value === undefined || isNaN(value)) {
    return { isValid: true }; // Target glucose is optional
  }

  if (value < GLUCOSE_LIMITS.TARGET_MIN) {
    return {
      isValid: false,
      message: `La glucosa objetivo debe ser al menos ${GLUCOSE_LIMITS.TARGET_MIN} mg/dL`,
      severity: "error",
    };
  }

  if (value > GLUCOSE_LIMITS.TARGET_MAX) {
    return {
      isValid: false,
      message: `La glucosa objetivo no puede exceder ${GLUCOSE_LIMITS.TARGET_MAX} mg/dL`,
      severity: "error",
    };
  }

  // Check if target is higher than current glucose
  if (currentGlucose !== undefined && value > currentGlucose) {
    return {
      isValid: false,
      message: "La glucosa objetivo no puede ser superior a la glucosa actual",
      severity: "error",
    };
  }

  return { isValid: true };
};

/**
 * Validate date
 */
export const validateDate = (date: Date): ValidationResult => {
  const now = new Date();
  const minDate = new Date(DATE_LIMITS.MIN_YEAR, 0, 1);

  if (date < minDate) {
    return {
      isValid: false,
      message: `La fecha no puede ser anterior a ${DATE_LIMITS.MIN_YEAR}`,
      severity: "error",
    };
  }

  if (date > now) {
    return {
      isValid: false,
      message: "No se pueden registrar fechas futuras",
      severity: "error",
    };
  }

  return { isValid: true };
};

/**
 * Format number with appropriate decimal places
 */
export const formatNumber = (value: number, decimalPlaces: number = 1): string => {
  return value.toFixed(decimalPlaces);
};

/**
 * Round to nearest 0.1 for insulin units
 */
export const roundInsulinUnits = (value: number): number => {
  return Math.round(value * 10) / 10;
};

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
