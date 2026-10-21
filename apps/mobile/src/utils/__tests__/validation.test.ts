import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  validateCarbohydrates,
  validateDate,
  validateForm,
  validateGlucose,
  validateGlucoseForDoseCalculation,
  validateTargetGlucose,
} from "../validation";
import { CARB_LIMITS, DATE_LIMITS, GLUCOSE_LIMITS } from "@glucosapp/utils";

describe("mobile validation utils", () => {
  it("validates glucose suitability for dose calculation", () => {
    expect(validateGlucoseForDoseCalculation(undefined)).toEqual({ isValid: true });
    expect(validateGlucoseForDoseCalculation(Number.NaN)).toEqual({ isValid: true });
    expect(validateGlucoseForDoseCalculation(39)).toMatchObject({ isValid: false });
    expect(validateGlucoseForDoseCalculation(110)).toEqual({ isValid: true });
  });

  it("validates individual mobile field helpers", () => {
    expect(validateGlucose(undefined)).toMatchObject({ isValid: false });
    expect(validateGlucose(GLUCOSE_LIMITS.MIN - 1)).toMatchObject({ isValid: false });
    expect(validateGlucose(GLUCOSE_LIMITS.MAX + 1)).toMatchObject({ isValid: false });
    expect(validateGlucose(GLUCOSE_LIMITS.CRITICAL_MIN - 1)).toMatchObject({
      isValid: true,
      severity: "warning",
    });
    expect(validateGlucose(GLUCOSE_LIMITS.CRITICAL_MAX + 1)).toMatchObject({
      isValid: true,
      severity: "warning",
    });
    expect(validateGlucose(120)).toEqual({ isValid: true });

    expect(validateCarbohydrates(undefined)).toMatchObject({ isValid: false });
    expect(validateCarbohydrates(CARB_LIMITS.MIN - 1)).toMatchObject({ isValid: false });
    expect(validateCarbohydrates(CARB_LIMITS.MAX + 1)).toMatchObject({ isValid: false });
    expect(validateCarbohydrates(CARB_LIMITS.PRACTICAL_MAX + 1)).toMatchObject({
      isValid: true,
      severity: "warning",
    });
    expect(validateCarbohydrates(60)).toEqual({ isValid: true });

    expect(validateTargetGlucose(undefined)).toEqual({ isValid: true });
    expect(validateTargetGlucose(GLUCOSE_LIMITS.TARGET_MIN - 1)).toMatchObject({ isValid: false });
    expect(validateTargetGlucose(GLUCOSE_LIMITS.TARGET_MAX + 1)).toMatchObject({ isValid: false });
    expect(validateTargetGlucose(150, 120)).toMatchObject({ isValid: false });
    expect(validateTargetGlucose(100, 120)).toEqual({ isValid: true });

    expect(validateDate(new Date(DATE_LIMITS.MIN_YEAR - 1, 0, 1))).toMatchObject({
      isValid: false,
    });
    expect(validateDate(new Date(Date.now() + 60_000))).toMatchObject({ isValid: false });
    expect(validateDate(new Date())).toEqual({ isValid: true });
  });

  it("aggregates errors and warnings for form data", () => {
    const invalid = validateForm({
      glucoseLevel: 39,
      carbohydrates: -1,
      targetGlucose: 250,
      appliedInsulin: -1,
      recordedAt: new Date(Date.now() + 60_000),
    });

    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);

    const valid = validateForm({
      glucoseLevel: 120,
      carbohydrates: 45,
      targetGlucose: 100,
      appliedInsulin: 4.5,
      recordedAt: new Date(),
    });

    expect(valid).toEqual({
      isValid: true,
      errors: [],
      warnings: [],
    });
  });

  it("collects warnings from valid-but-high readings and optional fields", () => {
    const withWarnings = validateForm({
      glucoseLevel: 39,
      carbohydrates: 301,
      targetGlucose: 100,
      appliedInsulin: 101,
      recordedAt: new Date(),
    });

    expect(withWarnings.isValid).toBe(false);
    expect(withWarnings.errors).toContain(
      "La glucosa debe ser al menos 40 mg/dL para calcular la dosis de insulina",
    );
    expect(withWarnings.warnings).toContain("⚠️ Nivel muy bajo - considera atención médica");
    expect(withWarnings.warnings).toContain("⚠️ Cantidad muy alta - verifica que sea correcta");
    expect(withWarnings.errors).toContain("La dosis de insulina no puede exceder 100 unidades");
  });

  it("handles an empty form by reporting only required glucose validation", () => {
    const result = validateForm({});

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(["Ingresa un nivel de glucosa válido"]);
    expect(result.warnings).toEqual([]);
  });
});
