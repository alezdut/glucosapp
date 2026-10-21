import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { extractTimeFromPicker, minutesToTime, timeToMinutes } from "../dateUtils";

describe("dateUtils", () => {
  it("converts minutes to date and back", () => {
    const date = minutesToTime(90);

    expect(date.getHours()).toBe(2);
    expect(date.getMinutes()).toBe(30);
    expect(timeToMinutes(date)).toBe(90);
  });

  it("wraps hour to previous day when subtracting picker offset", () => {
    const midnightPlusOffset = new Date(2000, 0, 1, 0, 15, 0, 0);

    expect(timeToMinutes(midnightPlusOffset)).toBe(23 * 60 + 15);
  });

  it("extracts selected time from picker into fixed base date", () => {
    const picked = new Date(2026, 3, 9, 18, 45, 12, 999);

    const extracted = extractTimeFromPicker(picked);

    expect(extracted.getFullYear()).toBe(2000);
    expect(extracted.getMonth()).toBe(0);
    expect(extracted.getDate()).toBe(1);
    expect(extracted.getHours()).toBe(18);
    expect(extracted.getMinutes()).toBe(45);
    expect(extracted.getSeconds()).toBe(0);
  });
});
