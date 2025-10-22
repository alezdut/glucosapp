import { describe, it, expect } from "vitest";
import {
  validateInsulinProfile,
  validateDoseCalculationInput,
  validateWeeklyRecord,
  insulinProfileSchema,
  doseCalculationInputSchema,
} from "../src/models/schema";

describe("Zod Validation", () => {
  describe("validateInsulinProfile", () => {
    it("should validate valid profile", () => {
      const profile = {
        isf: 50,
        icRatio: { breakfast: 15, lunch: 12, dinner: 10 },
        diaHours: 4,
        target: 100,
      };

      expect(() => validateInsulinProfile(profile)).not.toThrow();
    });

    it("should reject very low ISF", () => {
      const profile = {
        isf: 5,
        icRatio: { breakfast: 15, lunch: 12, dinner: 10 },
        diaHours: 4,
        target: 100,
      };

      expect(() => validateInsulinProfile(profile)).toThrow();
    });

    it("should reject very high IC Ratio", () => {
      const profile = {
        isf: 50,
        icRatio: { breakfast: 35, lunch: 12, dinner: 10 },
        diaHours: 4,
        target: 100,
      };

      expect(() => validateInsulinProfile(profile)).toThrow();
    });

    it("should reject very short DIA", () => {
      const profile = {
        isf: 50,
        icRatio: { breakfast: 15, lunch: 12, dinner: 10 },
        diaHours: 1,
        target: 100,
      };

      expect(() => validateInsulinProfile(profile)).toThrow();
    });

    it("should reject very low target", () => {
      const profile = {
        isf: 50,
        icRatio: { breakfast: 15, lunch: 12, dinner: 10 },
        diaHours: 4,
        target: 50,
      };

      expect(() => validateInsulinProfile(profile)).toThrow();
    });

    it("should accept default target", () => {
      const profile = {
        isf: 50,
        icRatio: { breakfast: 15, lunch: 12, dinner: 10 },
        diaHours: 4,
      };

      const result = insulinProfileSchema.parse(profile);
      expect(result.target).toBe(100);
    });
  });

  describe("validateDoseCalculationInput", () => {
    it("should validate valid input", () => {
      const input = {
        timeOfDay: "breakfast",
        glucose: 150,
        carbohydrates: 60,
        previousInjections: [],
      };

      expect(() => validateDoseCalculationInput(input)).not.toThrow();
    });

    it("should reject very low glucose", () => {
      const input = {
        timeOfDay: "lunch",
        glucose: 15,
        carbohydrates: 60,
      };

      expect(() => validateDoseCalculationInput(input)).toThrow();
    });

    it("should reject very high glucose", () => {
      const input = {
        timeOfDay: "lunch",
        glucose: 650,
        carbohydrates: 60,
      };

      expect(() => validateDoseCalculationInput(input)).toThrow();
    });

    it("should reject invalid timeOfDay", () => {
      const input = {
        timeOfDay: "snack",
        glucose: 150,
        carbohydrates: 60,
      };

      expect(() => validateDoseCalculationInput(input)).toThrow();
    });

    it("should reject negative carbohydrates", () => {
      const input = {
        timeOfDay: "lunch",
        glucose: 150,
        carbohydrates: -10,
      };

      expect(() => validateDoseCalculationInput(input)).toThrow();
    });

    it("should validate with previous injections", () => {
      const input = {
        timeOfDay: "lunch",
        glucose: 150,
        carbohydrates: 60,
        previousInjections: [{ timestamp: Date.now() - 3600000, units: 5 }],
      };

      expect(() => validateDoseCalculationInput(input)).not.toThrow();
    });

    it("should reject injection with very high dose", () => {
      const input = {
        timeOfDay: "lunch",
        glucose: 150,
        carbohydrates: 60,
        previousInjections: [{ timestamp: Date.now(), units: 60 }],
      };

      expect(() => validateDoseCalculationInput(input)).toThrow();
    });

    it("should validate with complete context", () => {
      const input = {
        timeOfDay: "dinner",
        glucose: 160,
        carbohydrates: 70,
        context: {
          recentExercise: true,
          alcohol: false,
          hourOfDay: 20,
        },
      };

      expect(() => validateDoseCalculationInput(input)).not.toThrow();
    });

    it("should provide default for previousInjections", () => {
      const input = {
        timeOfDay: "breakfast",
        glucose: 120,
        carbohydrates: 50,
      };

      const result = doseCalculationInputSchema.parse(input);
      expect(result.previousInjections).toEqual([]);
    });
  });

  describe("validateWeeklyRecord", () => {
    it("should validate valid record", () => {
      const record = [
        {
          date: "2025-01-01",
          measurements: [{ timestamp: Date.now(), glucose: 120 }],
        },
        {
          date: "2025-01-02",
          measurements: [{ timestamp: Date.now(), glucose: 130 }],
        },
        {
          date: "2025-01-03",
          measurements: [{ timestamp: Date.now(), glucose: 125 }],
        },
      ];

      expect(() => validateWeeklyRecord(record)).not.toThrow();
    });

    it("should reject record with less than 3 days", () => {
      const record = [
        {
          date: "2025-01-01",
          measurements: [{ timestamp: Date.now(), glucose: 120 }],
        },
        {
          date: "2025-01-02",
          measurements: [{ timestamp: Date.now(), glucose: 130 }],
        },
      ];

      expect(() => validateWeeklyRecord(record)).toThrow();
    });

    it("should reject day without measurements", () => {
      const record = [
        {
          date: "2025-01-01",
          measurements: [],
        },
        {
          date: "2025-01-02",
          measurements: [{ timestamp: Date.now(), glucose: 130 }],
        },
        {
          date: "2025-01-03",
          measurements: [{ timestamp: Date.now(), glucose: 125 }],
        },
      ];

      expect(() => validateWeeklyRecord(record)).toThrow();
    });

    it("should validate measurements with complete data", () => {
      const record = [
        {
          date: "2025-01-01",
          measurements: [
            {
              timestamp: Date.now(),
              glucose: 120,
              glucose3hLater: 130,
              insulin: 5,
              carbs: 60,
            },
          ],
        },
        {
          date: "2025-01-02",
          measurements: [
            {
              timestamp: Date.now(),
              glucose: 140,
              glucose3hLater: 135,
              insulin: 6,
              carbs: 70,
            },
          ],
        },
        {
          date: "2025-01-03",
          measurements: [
            {
              timestamp: Date.now(),
              glucose: 125,
              glucose3hLater: 130,
              insulin: 5.5,
              carbs: 65,
            },
          ],
        },
      ];

      expect(() => validateWeeklyRecord(record)).not.toThrow();
    });
  });
});
