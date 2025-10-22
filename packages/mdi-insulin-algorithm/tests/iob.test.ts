import { describe, it, expect } from "vitest";
import { calculateIOB, calculateRemainingIOB, isSafeForNewDose } from "../src/core/iob";
import type { Injection } from "../src/models/types";

describe("IOB (Insulin On Board)", () => {
  const now = Date.now();
  const DIA = 4; // 4 hours

  describe("calculateIOB", () => {
    it("should return 0 when there are no injections", () => {
      const iob = calculateIOB([], now, DIA);
      expect(iob).toBe(0);
    });

    it("should calculate IOB correctly with one recent injection", () => {
      const injections: Injection[] = [
        { timestamp: now - 2 * 3600000, units: 6 }, // 2 hours ago
      ];

      const iob = calculateIOB(injections, now, DIA);

      // After 2 hours in 4h DIA, 50% remains = 3.0U
      expect(iob).toBeCloseTo(3.0, 1);
    });

    it("should calculate IOB correctly with multiple injections", () => {
      const injections: Injection[] = [
        { timestamp: now - 1 * 3600000, units: 4 }, // 1 hour ago: 75% remaining = 3.0U
        { timestamp: now - 3 * 3600000, units: 8 }, // 3 hours ago: 25% remaining = 2.0U
      ];

      const iob = calculateIOB(injections, now, DIA);

      // Total: 3.0 + 2.0 = 5.0U
      expect(iob).toBeCloseTo(5.0, 1);
    });

    it("should ignore injections outside DIA window", () => {
      const injections: Injection[] = [
        { timestamp: now - 2 * 3600000, units: 6 }, // 2 hours ago: counts
        { timestamp: now - 5 * 3600000, units: 4 }, // 5 hours ago: outside DIA
      ];

      const iob = calculateIOB(injections, now, DIA);

      // Only first counts: 50% of 6U = 3.0U
      expect(iob).toBeCloseTo(3.0, 1);
    });

    it("should return 0 when all injections are outside DIA", () => {
      const injections: Injection[] = [
        { timestamp: now - 6 * 3600000, units: 6 },
        { timestamp: now - 8 * 3600000, units: 4 },
      ];

      const iob = calculateIOB(injections, now, DIA);
      expect(iob).toBe(0);
    });

    it("should return almost 100% IOB for very recent injection", () => {
      const injections: Injection[] = [
        { timestamp: now - 0.1 * 3600000, units: 10 }, // 6 minutes ago
      ];

      const iob = calculateIOB(injections, now, DIA);

      // Almost all IOB remaining
      expect(iob).toBeGreaterThan(9.5);
      expect(iob).toBeLessThanOrEqual(10);
    });

    it("should handle injection exactly at DIA limit", () => {
      const injections: Injection[] = [
        { timestamp: now - 4 * 3600000, units: 6 }, // exactly 4 hours
      ];

      const iob = calculateIOB(injections, now, DIA);

      // At limit, IOB should be almost 0
      expect(iob).toBeCloseTo(0, 1);
    });
  });

  describe("calculateRemainingIOB", () => {
    it("should return 0 for injection outside DIA", () => {
      const iob = calculateRemainingIOB(6, 5, 4);
      expect(iob).toBe(0);
    });

    it("should return correct value for injection at half of DIA", () => {
      const iob = calculateRemainingIOB(10, 2, 4);
      // 50% of 10U = 5U
      expect(iob).toBeCloseTo(5, 1);
    });

    it("should return almost all for recent injection", () => {
      const iob = calculateRemainingIOB(10, 0.5, 4);
      // 87.5% of 10U = 8.75U
      expect(iob).toBeGreaterThan(8);
    });

    it("should return 0 for negative time", () => {
      const iob = calculateRemainingIOB(10, -1, 4);
      expect(iob).toBe(0);
    });
  });

  describe("isSafeForNewDose", () => {
    it("should return true when there are no previous injections", () => {
      const isSafe = isSafeForNewDose([], now, 3);
      expect(isSafe).toBe(true);
    });

    it("should return false if 3 hours have not passed", () => {
      const injections: Injection[] = [
        { timestamp: now - 2 * 3600000, units: 6 }, // 2 hours ago
      ];

      const isSafe = isSafeForNewDose(injections, now, 3);
      expect(isSafe).toBe(false);
    });

    it("should return true if 3 hours have passed", () => {
      const injections: Injection[] = [
        { timestamp: now - 3.1 * 3600000, units: 6 }, // 3.1 hours ago
      ];

      const isSafe = isSafeForNewDose(injections, now, 3);
      expect(isSafe).toBe(true);
    });

    it("should consider only the most recent injection", () => {
      const injections: Injection[] = [
        { timestamp: now - 5 * 3600000, units: 6 }, // 5 hours ago
        { timestamp: now - 2 * 3600000, units: 4 }, // 2 hours ago (most recent)
      ];

      const isSafe = isSafeForNewDose(injections, now, 3);
      expect(isSafe).toBe(false);
    });
  });
});
