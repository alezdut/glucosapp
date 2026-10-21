import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { generateMockLibreData, parseLibreNfcData, validateLibreChecksum } from "../libreNfcParser";

describe("libreNfcParser", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("throws when NFC payload is too short", () => {
    expect(() => parseLibreNfcData(new Array(100).fill(0))).toThrow(
      "Invalid NFC data: insufficient bytes",
    );
  });

  it("throws when current glucose is out of valid range", () => {
    const data = new Array(344).fill(0);

    // 100 raw -> 10 mg/dL (invalid)
    data[0x28] = 100;
    data[0x29] = 0;

    expect(() => parseLibreNfcData(data)).toThrow("Invalid current glucose reading: 10 mg/dL");
  });

  it("parses valid current glucose, sensor age and trend readings", () => {
    const now = 1_700_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now);

    const data = new Array(344).fill(0);

    // Current glucose = 1230 raw -> 123 mg/dL
    data[0x28] = 0xce;
    data[0x29] = 0x04;

    // Sensor age = 60 minutes
    data[0x16f] = 60;
    data[0x170] = 0;

    // Circular trend index
    data[0x1a] = 3;

    // trend entry index 3 (i=0): 1500 raw -> 150 mg/dL
    data[0x100 + 3 * 6] = 0xdc;
    data[0x100 + 3 * 6 + 1] = 0x05;

    // trend entry index 2 (i=1): 0 raw -> invalid, skipped
    data[0x100 + 2 * 6] = 0;
    data[0x100 + 2 * 6 + 1] = 0;

    // trend entry index 1 (i=2): 700 raw -> 70 mg/dL
    data[0x100 + 1 * 6] = 0xbc;
    data[0x100 + 1 * 6 + 1] = 0x02;

    // trend entry index 0 (i=3): 6000 raw -> 600 mg/dL invalid, skipped
    data[0x100 + 0 * 6] = 0x70;
    data[0x100 + 0 * 6 + 1] = 0x17;

    const parsed = parseLibreNfcData(data);

    expect(parsed.currentGlucose).toBe(123);
    expect(parsed.sensorAge).toBe(60);
    expect(parsed.sensorStartTime?.getTime()).toBe(now - 60 * 60 * 1000);

    expect(parsed.historicalReadings).toHaveLength(2);
    expect(parsed.historicalReadings[0].glucose).toBe(70);
    expect(parsed.historicalReadings[1].glucose).toBe(150);
    expect(parsed.historicalReadings[0].timestamp.getTime()).toBe(now - 30 * 60 * 1000);
    expect(parsed.historicalReadings[1].timestamp.getTime()).toBe(now);
  });

  it("generates realistic mock data", () => {
    const now = 1_700_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now);
    jest.spyOn(Math, "random").mockReturnValue(0.5);

    const mock = generateMockLibreData();

    expect(mock.currentGlucose).toBe(120);
    expect(mock.sensorAge).toBe(10080);
    expect(mock.sensorStartTime?.getTime()).toBe(now - 7 * 24 * 60 * 60 * 1000);
    expect(mock.historicalReadings).toHaveLength(32);
    expect(mock.historicalReadings[0].timestamp.getTime()).toBe(now - 31 * 15 * 60 * 1000);
    expect(mock.historicalReadings[31].timestamp.getTime()).toBe(now);
    expect(mock.historicalReadings.every((r) => r.glucose >= 70 && r.glucose <= 180)).toBe(true);
  });

  it("validates checksum with basic non-zero byte threshold", () => {
    expect(validateLibreChecksum(new Array(100).fill(1))).toBe(false);
    expect(validateLibreChecksum(new Array(344).fill(0))).toBe(false);

    const data = new Array(344).fill(0);
    for (let i = 0; i < 101; i++) {
      data[i] = 1;
    }

    expect(validateLibreChecksum(data)).toBe(true);
  });
});
