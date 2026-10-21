import {
  calculateAge,
  formatDateInTimezone,
  formatLocalDateAsYYYYMMDD,
  formatTimeAgo,
  formatTimeFromMinutes,
  getCurrentTimeInTimezone,
  getUtcDateRangeIsoStrings,
  getUtcEndOfLocalDay,
  getUtcStartOfLocalDay,
  isTimeInRange,
  parseTimeString,
  validateTimeFormat,
} from "./date-utils";

describe("date-utils", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-08T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calculates age and formats relative time safely", () => {
    expect(calculateAge("2000-04-08")).toBe(26);
    expect(calculateAge("")).toBeNull();
    expect(calculateAge("invalid")).toBeNull();
    expect(formatTimeAgo("2026-04-08T11:59:30.000Z")).toBe("Hace un momento");
    expect(formatTimeAgo("2026-04-08T11:00:00.000Z")).toBe("Hace 1 h");
    expect(formatTimeAgo("bad-date")).toBe("Fecha inválida");
  });

  it("formats local dates and UTC-aligned day ranges", () => {
    const date = new Date("2026-04-08T15:45:00.000Z");
    expect(formatLocalDateAsYYYYMMDD(date)).toBe("2026-04-08");
    expect(getUtcStartOfLocalDay(date).getHours()).toBe(0);
    expect(getUtcEndOfLocalDay(date).getHours()).toBe(23);
    expect(getUtcDateRangeIsoStrings(date, date)).toEqual({
      startDateIso: getUtcStartOfLocalDay(date).toISOString(),
      endDateIso: getUtcEndOfLocalDay(date).toISOString(),
    });
  });

  it("handles time parsing, ranges and timezone helpers", () => {
    expect(formatTimeFromMinutes(125)).toBe("02:05");
    expect(() => formatTimeFromMinutes(-1)).toThrow(RangeError);
    expect(validateTimeFormat("09:30")).toBe(true);
    expect(validateTimeFormat("9:30")).toBe(false);
    expect(parseTimeString("09:30")).toBe(570);
    expect(parseTimeString("24:00")).toBeNull();
    expect(isTimeInRange(600, 540, 1020)).toBe(true);
    expect(isTimeInRange(300, 1320, 420)).toBe(true);
    expect(getCurrentTimeInTimezone("UTC")).toEqual({ hour: 12, minute: 0, totalMinutes: 720 });
    expect(getCurrentTimeInTimezone("Invalid/Timezone")).toBeNull();
    expect(formatDateInTimezone(new Date("2026-04-08T12:00:00.000Z"), "UTC", "en-US")).toContain(
      "2026",
    );
    expect(formatDateInTimezone(new Date(), undefined)).toBeNull();
  });
});
