import {
  CARB_LIMITS,
  DATE_LIMITS,
  GLUCOSE_LIMITS,
  formatNumber,
  roundInsulinUnits,
  validateCarbohydrates,
  validateDate,
  validateGlucose,
  validateGlucoseForDoseCalculation,
  validateTargetGlucose,
} from "./validation-utils";

describe("validation-utils", () => {
  it("validates glucose limits and warnings", () => {
    expect(validateGlucose(undefined)).toEqual({
      isValid: false,
      message: "Ingresa un nivel de glucosa válido",
    });
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
  });

  it("validates carbohydrates and target glucose rules", () => {
    expect(validateCarbohydrates(undefined)).toMatchObject({ isValid: false });
    expect(validateCarbohydrates(-1)).toMatchObject({ isValid: false });
    expect(validateCarbohydrates(CARB_LIMITS.MAX + 1)).toMatchObject({ isValid: false });
    expect(validateCarbohydrates(CARB_LIMITS.PRACTICAL_MAX + 1)).toMatchObject({
      isValid: true,
      severity: "warning",
    });
    expect(validateCarbohydrates(60)).toEqual({ isValid: true });

    expect(validateTargetGlucose(undefined)).toEqual({ isValid: true });
    expect(validateTargetGlucose(GLUCOSE_LIMITS.TARGET_MIN - 1)).toMatchObject({ isValid: false });
    expect(validateTargetGlucose(GLUCOSE_LIMITS.TARGET_MAX + 1)).toMatchObject({ isValid: false });
    expect(validateTargetGlucose(140, 100)).toMatchObject({ isValid: false });
    expect(validateTargetGlucose(100, 140)).toEqual({ isValid: true });
  });

  it("validates dates and insulin formatting helpers", () => {
    expect(validateDate(new Date(DATE_LIMITS.MIN_YEAR - 1, 0, 1))).toMatchObject({
      isValid: false,
    });
    expect(validateDate(new Date(Date.now() + 60_000))).toMatchObject({ isValid: false });
    expect(validateDate(new Date())).toEqual({ isValid: true });
    expect(validateGlucoseForDoseCalculation(GLUCOSE_LIMITS.CRITICAL_MIN - 1)).toMatchObject({
      isValid: false,
    });
    expect(validateGlucoseForDoseCalculation(90)).toEqual({ isValid: true });
    expect(formatNumber(12.345, 2)).toBe("12.35");
    expect(roundInsulinUnits(1.26)).toBe(1.3);
  });
});
