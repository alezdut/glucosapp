import { describe, it, expect } from "vitest";
import { calculateCOB, calculateRemainingCOB, percentageAbsorbed } from "../src/core/cob";
import type { Meal } from "../src/models/types";

describe("COB (Carbs On Board)", () => {
  const now = Date.now();

  describe("calculateCOB", () => {
    it("should return 0 when there are no meals", () => {
      const cob = calculateCOB([], now);
      expect(cob).toBe(0);
    });

    it("should calculate COB correctly for normal meal", () => {
      const meals: Meal[] = [
        {
          timestamp: now - 2 * 3600000, // 2 hours ago
          carbohydrates: 60,
          type: "normal", // duration 4h
        },
      ];

      const cob = calculateCOB(meals, now);

      // After 2h of 4h, 50% remains = 30g
      expect(cob).toBe(30);
    });

    it("should calculate COB correctly for fast meal", () => {
      const meals: Meal[] = [
        {
          timestamp: now - 1.5 * 3600000, // 1.5 hours ago
          carbohydrates: 40,
          type: "fast", // duration 3h
        },
      ];

      const cob = calculateCOB(meals, now);

      // After 1.5h of 3h, 50% remains = 20g
      expect(cob).toBe(20);
    });

    it("should calculate COB correctly for slow meal", () => {
      const meals: Meal[] = [
        {
          timestamp: now - 2 * 3600000, // 2 hours ago
          carbohydrates: 80,
          type: "slow", // duration 5h
        },
      ];

      const cob = calculateCOB(meals, now);

      // After 2h of 5h, 60% remains = 48g
      expect(cob).toBe(48);
    });

    it("should calculate COB correctly for very slow meal", () => {
      const meals: Meal[] = [
        {
          timestamp: now - 3 * 3600000, // 3 hours ago
          carbohydrates: 90,
          type: "very_slow", // duration 6h
        },
      ];

      const cob = calculateCOB(meals, now);

      // After 3h of 6h, 50% remains = 45g
      expect(cob).toBe(45);
    });

    it("should calculate COB with multiple meals", () => {
      const meals: Meal[] = [
        {
          timestamp: now - 1 * 3600000,
          carbohydrates: 40,
          type: "fast", // 3h, 1h ago: 66.7% = 26.7g
        },
        {
          timestamp: now - 2 * 3600000,
          carbohydrates: 60,
          type: "normal", // 4h, 2h ago: 50% = 30g
        },
      ];

      const cob = calculateCOB(meals, now);

      // Total: ~27 + 30 = ~57g
      expect(cob).toBeGreaterThanOrEqual(56);
      expect(cob).toBeLessThanOrEqual(58);
    });

    it("should ignore meals outside absorption window", () => {
      const meals: Meal[] = [
        {
          timestamp: now - 2 * 3600000,
          carbohydrates: 60,
          type: "normal", // counts
        },
        {
          timestamp: now - 5 * 3600000,
          carbohydrates: 40,
          type: "fast", // outside window (3h)
        },
      ];

      const cob = calculateCOB(meals, now);

      // Only first counts: 50% of 60g = 30g
      expect(cob).toBe(30);
    });

    it("should return almost 100% COB for very recent meal", () => {
      const meals: Meal[] = [
        {
          timestamp: now - 0.1 * 3600000, // 6 minutes ago
          carbohydrates: 50,
          type: "normal",
        },
      ];

      const cob = calculateCOB(meals, now);

      // Almost all carbs pending
      expect(cob).toBeGreaterThanOrEqual(48);
      expect(cob).toBeLessThanOrEqual(50);
    });
  });

  describe("calculateRemainingCOB", () => {
    it("should return 0 for meal outside window", () => {
      const cob = calculateRemainingCOB(60, 5, 4);
      expect(cob).toBe(0);
    });

    it("should return correct value at half of absorption", () => {
      const cob = calculateRemainingCOB(80, 2, 4);
      // 50% of 80g = 40g
      expect(cob).toBeCloseTo(40, 0);
    });

    it("should return almost all for recent meal", () => {
      const cob = calculateRemainingCOB(60, 0.5, 4);
      // 87.5% of 60g = 52.5g
      expect(cob).toBeGreaterThan(50);
    });

    it("should return 0 for negative time", () => {
      const cob = calculateRemainingCOB(60, -1, 4);
      expect(cob).toBe(0);
    });
  });

  describe("percentageAbsorbed", () => {
    it("should return 0% for future meal", () => {
      const meal: Meal = {
        timestamp: now + 3600000, // in 1 hour
        carbohydrates: 60,
        type: "normal",
      };

      const percentage = percentageAbsorbed(meal, now);
      expect(percentage).toBe(0);
    });

    it("should return 100% for completely absorbed meal", () => {
      const meal: Meal = {
        timestamp: now - 5 * 3600000, // 5 hours ago
        carbohydrates: 60,
        type: "normal", // duration 4h
      };

      const percentage = percentageAbsorbed(meal, now);
      expect(percentage).toBe(100);
    });

    it("should return 50% at half of absorption", () => {
      const meal: Meal = {
        timestamp: now - 2 * 3600000, // 2 hours ago
        carbohydrates: 60,
        type: "normal", // duration 4h
      };

      const percentage = percentageAbsorbed(meal, now);
      expect(percentage).toBe(50);
    });

    it("should return 25% for very slow meal after 1.5h", () => {
      const meal: Meal = {
        timestamp: now - 1.5 * 3600000,
        carbohydrates: 90,
        type: "very_slow", // duration 6h
      };

      const percentage = percentageAbsorbed(meal, now);
      expect(percentage).toBe(25);
    });
  });
});
