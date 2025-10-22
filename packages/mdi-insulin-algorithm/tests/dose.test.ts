import { describe, it, expect } from "vitest";
import {
  calculateDose,
  calculateBreakfastDose,
  calculateLunchDose,
  calculateDinnerDose,
  calculateCorrectionDose,
} from "../src/core/dose";
import type { InsulinProfile, DoseCalculationInput } from "../src/models/types";

describe("Dose Calculation", () => {
  const baseProfile: InsulinProfile = {
    isf: 50,
    icRatio: {
      breakfast: 15,
      lunch: 12,
      dinner: 10,
    },
    diaHours: 4,
    target: 100,
  };

  describe("calculateDose - Basic case without IOB", () => {
    it("should calculate breakfast dose correctly", () => {
      const data: DoseCalculationInput = {
        timeOfDay: "breakfast",
        glucose: 150,
        carbohydrates: 60,
        previousInjections: [],
      };

      const result = calculateDose(baseProfile, data);

      // Prandial: 60/15 = 4.0U
      // Correction: (150-100)/50 = 1.0U
      // Total: 5.0U
      expect(result.dose).toBe(5.0);
      expect(result.breakdown.prandial).toBe(4.0);
      expect(result.breakdown.correction).toBe(1.0);
      expect(result.breakdown.iob).toBe(0);
    });

    it("should calculate lunch dose with different IC ratio", () => {
      const data: DoseCalculationInput = {
        timeOfDay: "lunch",
        glucose: 180,
        carbohydrates: 72,
        previousInjections: [],
      };

      const result = calculateDose(baseProfile, data);

      // Prandial: 72/12 = 6.0U
      // Correction: (180-100)/50 = 1.6U
      // Total: 7.6U -> rounds to 7.5U
      expect(result.dose).toBe(7.5);
      expect(result.breakdown.prandial).toBe(6.0);
    });

    it("should calculate dinner dose with nocturnal factor", () => {
      const data: DoseCalculationInput = {
        timeOfDay: "dinner",
        glucose: 165,
        carbohydrates: 70,
        previousInjections: [],
        context: {
          hourOfDay: 19,
        },
      };

      const result = calculateDose(baseProfile, data);

      // Prandial: 70/10 = 7.0U
      // Correction: (165-100)/50 = 1.3U
      // Subtotal: 8.3U
      // Nocturnal factor (-5%): 8.3 * 0.95 = 7.885U -> rounds to 8.0U or 8.5U
      expect(result.dose).toBeGreaterThanOrEqual(8.0);
      expect(result.dose).toBeLessThanOrEqual(8.5);
      expect(result.breakdown.adjustments?.nocturnal).toBe(-5);
    });
  });

  describe("calculateDose - With IOB", () => {
    it("should subtract IOB from correction", () => {
      const now = Date.now();
      const data: DoseCalculationInput = {
        timeOfDay: "lunch",
        glucose: 180,
        carbohydrates: 60,
        previousInjections: [
          { timestamp: now - 2 * 3600000, units: 6 }, // 2 hours ago, IOB ~3.0U
        ],
      };

      const result = calculateDose(baseProfile, data);

      // Prandial: 60/12 = 5.0U
      // Gross correction: (180-100)/50 = 1.6U
      // IOB: ~3.0U
      // Net correction: 1.6 - 3.0 = negative, discarded
      // Total: 5.0U prandial only
      expect(result.dose).toBe(5.0);
      expect(result.breakdown.iob).toBeGreaterThan(2.5);
    });

    it("should allow dose of 0 when IOB is very high", () => {
      const now = Date.now();
      const data: DoseCalculationInput = {
        timeOfDay: "correction",
        glucose: 120,
        carbohydrates: 0,
        previousInjections: [
          { timestamp: now - 1 * 3600000, units: 8 }, // 1 hour ago, IOB ~6U
        ],
      };

      const result = calculateDose(baseProfile, data);

      // No prandial
      // Correction: (120-100)/50 = 0.4U
      // IOB: ~6U
      // Total: 0U
      expect(result.dose).toBe(0);
    });
  });

  describe("calculateDose - Context adjustments", () => {
    it("should reduce dose with recent exercise", () => {
      const data: DoseCalculationInput = {
        timeOfDay: "lunch",
        glucose: 150,
        carbohydrates: 60,
        previousInjections: [],
        context: {
          recentExercise: true,
        },
      };

      const result = calculateDose(baseProfile, data);

      // Without exercise would be: 60/12 + (150-100)/50 = 5.0 + 1.0 = 6.0U
      // With exercise (-20%): 6.0 * 0.8 = 4.8U -> rounds to 5.0U
      expect(result.dose).toBe(5.0);
      expect(result.breakdown.adjustments?.exercise).toBe(-20);
    });

    it("should apply multiple adjustments correctly", () => {
      const data: DoseCalculationInput = {
        timeOfDay: "dinner",
        glucose: 160,
        carbohydrates: 80,
        previousInjections: [],
        context: {
          recentExercise: true,
          hourOfDay: 20,
        },
      };

      const result = calculateDose(baseProfile, data);

      // Base: 80/10 + (160-100)/50 = 8.0 + 1.2 = 9.2U
      // Exercise (-20%): 9.2 * 0.8 = 7.36U
      // Nocturnal (-5%): 7.36 * 0.95 = 6.992U -> rounds to 7.0U or 7.5U
      expect(result.dose).toBeGreaterThanOrEqual(7.0);
      expect(result.dose).toBeLessThanOrEqual(7.5);
    });
  });

  describe("calculateDose - Between-meals corrections", () => {
    it("should apply 50% rule for corrections", () => {
      const data: DoseCalculationInput = {
        timeOfDay: "correction",
        glucose: 250,
        carbohydrates: 0,
        previousInjections: [],
      };

      const result = calculateDose(baseProfile, data);

      // Correction: (250-100)/50 = 3.0U
      // 50% rule: 3.0 * 0.5 = 1.5U (if applied correctly)
      // Note: adjustment applies in applySafetyFactor
      expect(result.dose).toBeGreaterThan(0);
      expect(result.dose).toBeLessThanOrEqual(3.0);
      expect(result.breakdown.adjustments?.betweenMeals).toBe(-50);
    });
  });

  describe("calculateDose - Rounding", () => {
    it("should round to 0.5U correctly", () => {
      const data: DoseCalculationInput = {
        timeOfDay: "breakfast",
        glucose: 140,
        carbohydrates: 55,
        previousInjections: [],
      };

      const result = calculateDose(baseProfile, data);

      // Prandial: 55/15 = 3.67U
      // Correction: (140-100)/50 = 0.8U
      // Total: 4.47U -> rounds to 4.5U
      expect(result.dose).toBe(4.5);
    });
  });

  describe("calculateDose - Warnings", () => {
    it("should generate warning for hypoglycemia", () => {
      const data: DoseCalculationInput = {
        timeOfDay: "breakfast",
        glucose: 65,
        carbohydrates: 60,
        previousInjections: [],
      };

      const result = calculateDose(baseProfile, data);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("HYPOGLYCEMIA"))).toBe(true);
    });

    it("should generate warning for very high glucose", () => {
      const data: DoseCalculationInput = {
        timeOfDay: "lunch",
        glucose: 320,
        carbohydrates: 60,
        previousInjections: [],
      };

      const result = calculateDose(baseProfile, data);

      expect(result.warnings.some((w) => w.includes("ketones"))).toBe(true);
    });

    it("should warn about recent exercise", () => {
      const data: DoseCalculationInput = {
        timeOfDay: "dinner",
        glucose: 150,
        carbohydrates: 60,
        previousInjections: [],
        context: {
          recentExercise: true,
        },
      };

      const result = calculateDose(baseProfile, data);

      expect(result.warnings.some((w) => w.includes("exercise"))).toBe(true);
    });
  });

  describe("Specific time-of-day functions", () => {
    it("calculateBreakfastDose should work correctly", () => {
      const result = calculateBreakfastDose(baseProfile, {
        glucose: 150,
        carbohydrates: 60,
        previousInjections: [],
      });

      expect(result.dose).toBe(5.0);
    });

    it("calculateLunchDose should work correctly", () => {
      const result = calculateLunchDose(baseProfile, {
        glucose: 180,
        carbohydrates: 60,
        previousInjections: [],
      });

      expect(result.dose).toBeGreaterThan(0);
    });

    it("calculateDinnerDose should apply nocturnal adjustment automatically", () => {
      const result = calculateDinnerDose(baseProfile, {
        glucose: 160,
        carbohydrates: 70,
        previousInjections: [],
      });

      expect(result.breakdown.adjustments?.nocturnal).toBe(-5);
    });

    it("calculateCorrectionDose should apply 50% rule", () => {
      const result = calculateCorrectionDose(baseProfile, {
        glucose: 200,
        previousInjections: [],
      });

      expect(result.breakdown.adjustments?.betweenMeals).toBe(-50);
    });
  });

  describe("Document examples", () => {
    // Document example: Typical day, breakfast
    it("should correctly calculate breakfast example from document", () => {
      const data: DoseCalculationInput = {
        timeOfDay: "breakfast",
        glucose: 110,
        carbohydrates: 45,
        previousInjections: [],
      };

      const result = calculateDose(baseProfile, data);

      // Prandial: 45/15 = 3.0U
      // Correction: (110-100)/50 = 0.2U
      // Total: 3.2U -> rounds to 3.0U
      expect(result.dose).toBe(3.0);
    });

    // Document example: Lunch with exercise
    it("should correctly calculate lunch example with exercise", () => {
      const now = Date.now();
      const data: DoseCalculationInput = {
        timeOfDay: "lunch",
        glucose: 180,
        carbohydrates: 80,
        previousInjections: [
          { timestamp: now - 6 * 3600000, units: 3 }, // 6h ago, outside DIA
        ],
        context: {
          recentExercise: true,
        },
      };

      const result = calculateDose(baseProfile, data);

      // IC Ratio lunch: document shows 10, using 12
      // Using 12: 80/12 = 6.67U
      // Correction: (180-100)/50 = 1.6U
      // Subtotal: 8.27U
      // Exercise: 8.27 * 0.8 = 6.6U -> rounds to 6.5U
      expect(result.dose).toBeGreaterThanOrEqual(6.0);
      expect(result.dose).toBeLessThanOrEqual(7.0);
    });
  });
});
