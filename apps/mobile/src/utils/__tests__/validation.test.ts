import { validateForm, validateGlucoseForDoseCalculation } from "../validation";

describe("mobile validation utils", () => {
  it("validates glucose suitability for dose calculation", () => {
    expect(validateGlucoseForDoseCalculation(undefined)).toEqual({ isValid: true });
    expect(validateGlucoseForDoseCalculation(39)).toMatchObject({ isValid: false });
    expect(validateGlucoseForDoseCalculation(110)).toEqual({ isValid: true });
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
});
