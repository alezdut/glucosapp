import {
  generateDailyReadings,
  validateGeneratedReadings,
} from "../../../scripts/demo-data/glucose-generator";
import { generateDailyMeals } from "../../../scripts/demo-data/meal-generator";
import { DEMO_PATIENTS } from "../../../scripts/demo-data/patient-profiles";

describe("demo glucose generator", () => {
  function generateSample(email: string, days: number) {
    const profile = DEMO_PATIENTS.find((item) => item.email === email);
    if (!profile) {
      throw new Error(`Profile not found for ${email}`);
    }

    const start = new Date("2026-01-01T00:00:00.000Z");
    const readings = [];

    for (let offset = 0; offset < days; offset++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + offset);
      const meals = generateDailyMeals(date, profile.mealsPerDay);
      readings.push(...generateDailyReadings(date, profile, meals));
    }

    return { profile, readings };
  }

  it("keeps a stable profile within tolerance bands", () => {
    const { profile, readings } = generateSample("demo-patient-1@glucosapp.demo", 45);

    const validation = validateGeneratedReadings(readings, profile, {
      inRangePercentage: 10,
      hypoPercentage: 4,
      severeHypoPercentage: 1,
      hyperPercentage: 8,
    });

    expect(validation.passed).toBe(true);
    expect(validation.actual.inRangePercentage).toBeGreaterThan(70);
    expect(validation.actual.hyperPercentage).toBeLessThan(22);
  });

  it("keeps a risk profile irregular without overshooting target incidence", () => {
    const { profile, readings } = generateSample("demo-patient-7@glucosapp.demo", 30);

    const validation = validateGeneratedReadings(readings, profile, {
      inRangePercentage: 10,
      hypoPercentage: 4,
      severeHypoPercentage: 2,
      hyperPercentage: 10,
    });

    expect(validation.passed).toBe(true);
    expect(validation.actual.hypoPercentage).toBeGreaterThan(8);
    expect(validation.actual.severeHypoPercentage).toBeGreaterThan(1);
    expect(validation.actual.hyperPercentage).toBeGreaterThan(30);
  });
});
