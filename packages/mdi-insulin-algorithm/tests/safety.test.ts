import { describe, it, expect } from "vitest";
import {
  check3HourRule,
  applySafetyFactor,
  evaluatePreSleep,
  calculateBetweenMealCorrection,
  generateWarnings,
} from "../src/core/safety";
import type { Injection, DoseContext } from "../src/models/types";

describe("Safety Functions", () => {
  const now = Date.now();

  describe("check3HourRule", () => {
    it("should return true without previous injections", () => {
      const result = check3HourRule([], now);
      expect(result).toBe(true);
    });

    it("should return false if 3 hours have not passed", () => {
      const injections: Injection[] = [{ timestamp: now - 2 * 3600000, units: 5 }];
      const result = check3HourRule(injections, now);
      expect(result).toBe(false);
    });

    it("should return true if 3 hours have passed", () => {
      const injections: Injection[] = [{ timestamp: now - 3.5 * 3600000, units: 5 }];
      const result = check3HourRule(injections, now);
      expect(result).toBe(true);
    });
  });

  describe("applySafetyFactor", () => {
    it("should return dose unchanged without context", () => {
      const dose = applySafetyFactor(10);
      expect(dose).toBe(10);
    });

    it("should reduce 20% with recent exercise", () => {
      const context: DoseContext = {
        recentExercise: true,
      };
      const dose = applySafetyFactor(10, context);
      expect(dose).toBe(8.0); // 10 * 0.8
    });

    it("should reduce 30% with alcohol", () => {
      const context: DoseContext = {
        alcohol: true,
      };
      const dose = applySafetyFactor(10, context);
      expect(dose).toBe(7.0); // 10 * 0.7
    });

    it("should increase 20% with illness", () => {
      const context: DoseContext = {
        illness: true,
      };
      const dose = applySafetyFactor(10, context);
      expect(dose).toBe(12.0); // 10 * 1.2
    });

    it("should increase 10% with stress", () => {
      const context: DoseContext = {
        stress: true,
      };
      const dose = applySafetyFactor(10, context);
      expect(dose).toBe(11.0); // 10 * 1.1
    });

    it("should increase 10% with menstruation", () => {
      const context: DoseContext = {
        menstruation: true,
      };
      const dose = applySafetyFactor(10, context);
      expect(dose).toBe(11.0); // 10 * 1.1
    });

    it("should reduce 5% during nocturnal hours", () => {
      const context: DoseContext = {
        hourOfDay: 23,
      };
      const dose = applySafetyFactor(10, context);
      expect(dose).toBe(9.5); // 10 * 0.95
    });

    it("should reduce 5% in early morning", () => {
      const context: DoseContext = {
        hourOfDay: 3,
      };
      const dose = applySafetyFactor(10, context);
      expect(dose).toBe(9.5);
    });

    it("should reduce 15% with high-fat meal", () => {
      const context: DoseContext = {
        highFatMeal: true,
      };
      const dose = applySafetyFactor(10, context);
      expect(dose).toBe(8.5); // 10 * 0.85
    });

    it("should apply multiple factors cumulatively", () => {
      const context: DoseContext = {
        recentExercise: true, // *0.8
        hourOfDay: 22, // *0.95
      };
      const dose = applySafetyFactor(10, context);
      expect(dose).toBeCloseTo(7.6, 1); // 10 * 0.8 * 0.95
    });
  });

  describe("evaluatePreSleep", () => {
    it("should recommend sleep with safe glucose", () => {
      const injections: Injection[] = [{ timestamp: now - 3 * 3600000, units: 5 }];
      const result = evaluatePreSleep(140, injections, 4, 50);

      expect(result.action).toBe("sleep");
      expect(result.snack).toBe(false);
      expect(result.correctionDose).toBe(0);
    });

    it("should recommend snack with low glucose", () => {
      const injections: Injection[] = [];
      const result = evaluatePreSleep(90, injections, 4, 50);

      expect(result.action).toBe("eat_snack");
      expect(result.snack).toBe(true);
      expect(result.carbohydrates).toBe(15);
      expect(result.warning).toContain("hypoglycemia");
    });

    it("should recommend snack with high IOB", () => {
      const injections: Injection[] = [
        { timestamp: now - 1 * 3600000, units: 6 }, // High IOB
      ];
      const result = evaluatePreSleep(115, injections, 4, 50);

      expect(result.action).toBe("eat_snack");
      expect(result.snack).toBe(true);
    });

    it("should recommend correction with very high glucose", () => {
      const injections: Injection[] = [];
      const result = evaluatePreSleep(280, injections, 4, 50);

      expect(result.action).toBe("small_correction");
      expect(result.correctionDose).toBeGreaterThan(0);
      expect(result.warning).toContain("ketones");
    });

    it("should recommend monitoring with moderately high glucose", () => {
      const injections: Injection[] = [];
      const result = evaluatePreSleep(200, injections, 4, 50);

      expect(result.action).toBe("monitor");
      expect(result.correctionDose).toBe(0);
      expect(result.warning).toContain("3 AM");
    });

    it("should not recommend correction if IOB is high", () => {
      const injections: Injection[] = [{ timestamp: now - 1 * 3600000, units: 8 }];
      const result = evaluatePreSleep(280, injections, 4, 50);

      // With high IOB, correction will be smaller or none
      expect(result.correctionDose).toBeLessThan(2);
    });
  });

  describe("calculateBetweenMealCorrection", () => {
    it("should reject correction before 3 hours", () => {
      const injections: Injection[] = [{ timestamp: now - 2 * 3600000, units: 5 }];
      const result = calculateBetweenMealCorrection(200, 100, injections, 4, 50);

      expect(result.dose).toBe(0);
      expect(result.reason).toContain("3 hours");
    });

    it("should apply 50% rule after 3 hours", () => {
      const injections: Injection[] = [{ timestamp: now - 4 * 3600000, units: 5 }];
      const result = calculateBetweenMealCorrection(220, 100, injections, 4, 50);

      // Correction: (220-120)/50 = 2.0U
      // IOB: almost 0
      // With 50% rule: 2.0 * 0.5 = 1.0U
      expect(result.dose).toBeCloseTo(1.0, 0);
      expect(result.reason).toContain("50%");
    });

    it("should return 0 if no correction needed", () => {
      const injections: Injection[] = [];
      const result = calculateBetweenMealCorrection(110, 100, injections, 4, 50);

      expect(result.dose).toBe(0);
      expect(result.reason).toContain("No correction required");
    });

    it("should consider IOB in calculation", () => {
      const injections: Injection[] = [{ timestamp: now - 3.5 * 3600000, units: 8 }];
      const result = calculateBetweenMealCorrection(250, 100, injections, 4, 50);

      // There is some IOB, should reduce correction
      expect(result.dose).toBeLessThan(2.0);
      expect(result.iob).toBeGreaterThan(0);
    });

    it("should ensure minimum dose of 0.5U", () => {
      const injections: Injection[] = [];
      const result = calculateBetweenMealCorrection(140, 100, injections, 4, 50);

      // Small correction rounds to 0.5U
      if (result.dose > 0) {
        expect(result.dose).toBeGreaterThanOrEqual(0.5);
      }
    });
  });

  describe("generateWarnings", () => {
    it("should generate hypoglycemia warning", () => {
      const warnings = generateWarnings(65, 0, 5, 60);
      expect(warnings.some((w) => w.includes("HYPOGLYCEMIA"))).toBe(true);
    });

    it("should warn about high IOB with low glucose", () => {
      const warnings = generateWarnings(95, 1.5, 5, 60);
      expect(warnings.some((w) => w.includes("High IOB"))).toBe(true);
    });

    it("should warn about very high glucose", () => {
      const warnings = generateWarnings(320, 0, 8, 60);
      expect(warnings.some((w) => w.includes("ketones"))).toBe(true);
    });

    it("should warn about carbohydrates without insulin", () => {
      const warnings = generateWarnings(120, 2, 0, 60);
      expect(warnings.some((w) => w.includes("without insulin"))).toBe(true);
    });

    it("should warn about high nocturnal dose", () => {
      const context: DoseContext = { hourOfDay: 23 };
      const warnings = generateWarnings(180, 0, 6, 60, context);
      expect(warnings.some((w) => w.includes("nocturnal"))).toBe(true);
    });

    it("should warn about very high dose in general", () => {
      const warnings = generateWarnings(200, 0, 18, 100);
      expect(warnings.some((w) => w.toLowerCase().includes("very high"))).toBe(true);
    });

    it("should inform about recent exercise", () => {
      const context: DoseContext = { recentExercise: true };
      const warnings = generateWarnings(150, 0, 5, 60, context);
      expect(warnings.some((w) => w.includes("exercise"))).toBe(true);
    });

    it("should warn about alcohol", () => {
      const context: DoseContext = { alcohol: true };
      const warnings = generateWarnings(140, 0, 5, 60, context);
      expect(warnings.some((w) => w.toLowerCase().includes("alcohol"))).toBe(true);
    });

    it("should inform about high-fat meal", () => {
      const context: DoseContext = { highFatMeal: true };
      const warnings = generateWarnings(150, 0, 7, 80, context);
      expect(warnings.some((w) => w.toLowerCase().includes("fat"))).toBe(true);
    });

    it("should not generate warnings with normal values", () => {
      const warnings = generateWarnings(120, 0.5, 5, 60);
      expect(warnings.length).toBe(0);
    });
  });
});
