import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  convertCombinedDataToCsv,
  convertLogEntriesToCsv,
  convertSensorReadingsToCsv,
  generateCsvFilename,
} from "../csvExport";
import {
  MealCategory,
  ReadingSource,
  type DecryptedSensorReading,
  type LogEntry,
} from "@glucosapp/types";

describe("csvExport", () => {
  it("converts log entries with meal details, context labels and escaped fields", () => {
    const entries = [
      {
        id: "log-1",
        userId: "user-1",
        recordedAt: "2026-04-09T10:00:00.000Z",
        mealType: MealCategory.BREAKFAST,
        carbohydrates: 42,
        glucoseEntry: { mgdl: 145 },
        insulinDose: {
          units: 4.5,
          calculatedUnits: 4,
          wasManuallyEdited: true,
          carbInsulin: 3.25,
          correctionInsulin: 0.75,
          iobSubtracted: 0.2,
        },
        mealTemplate: {
          foodItems: [
            { name: "Avena, integral", quantity: 60 },
            { name: 'Leche "sin lactosa"', quantity: 150 },
          ],
        },
        recentExercise: true,
        alcohol: false,
        illness: true,
        stress: false,
        menstruation: false,
        highFatMeal: true,
      },
      {
        id: "log-2",
        userId: "user-1",
        recordedAt: "2026-04-09T12:00:00.000Z",
        mealType: MealCategory.SNACK,
        recentExercise: false,
        alcohol: false,
        illness: false,
        stress: false,
        menstruation: false,
        highFatMeal: false,
        mealTemplate: {
          name: "Colacion\nTarde",
        },
      },
    ] as unknown as LogEntry[];

    const csv = convertLogEntriesToCsv(entries);

    expect(csv).toContain("Fecha,Hora,Glucosa (mg/dL)");
    expect(csv).toContain("Desayuno");
    expect(csv).toContain("Snack");
    expect(csv).toContain('"Avena, integral (60g); Leche ""sin lactosa"" (150g)"');
    expect(csv).toContain('"Colacion\nTarde"');
    expect(csv).toContain("4.5");
    expect(csv).toContain("4");
    expect(csv).toContain("3.3");
    expect(csv).toContain("0.8");
    expect(csv).toContain("0.2");
    expect(csv).toContain("Sí");
    expect(csv).toContain("No");
  });

  it("converts sensor readings with source labels", () => {
    const readings: DecryptedSensorReading[] = [
      {
        id: "s-1",
        userId: "user-1",
        glucose: 123,
        recordedAt: "2026-04-09T11:00:00.000Z",
        source: ReadingSource.LIBRE_NFC,
        isHistorical: true,
        createdAt: "2026-04-09T11:00:00.000Z",
      },
      {
        id: "s-2",
        userId: "user-1",
        glucose: 140,
        recordedAt: "2026-04-09T11:15:00.000Z",
        source: ReadingSource.DEXCOM,
        isHistorical: false,
        createdAt: "2026-04-09T11:15:00.000Z",
      },
    ];

    const csv = convertSensorReadingsToCsv(readings);

    expect(csv).toContain("Fecha,Hora,Glucosa (mg/dL),Fuente,Lectura Histórica");
    expect(csv).toContain("FreeStyle Libre");
    expect(csv).toContain("DEXCOM");
    expect(csv).toContain("Sí");
    expect(csv).toContain("No");
  });

  it("converts combined manual and sensor data into a single CSV", () => {
    const logEntries = [
      {
        id: "log-1",
        userId: "user-1",
        recordedAt: "2026-04-09T10:00:00.000Z",
        glucoseEntry: { mgdl: 110 },
        carbohydrates: 25,
        insulinDose: { units: 2.5 },
        recentExercise: false,
        alcohol: false,
        illness: false,
        stress: false,
        menstruation: false,
        highFatMeal: false,
      },
    ] as unknown as LogEntry[];

    const readings: DecryptedSensorReading[] = [
      {
        id: "s-1",
        userId: "user-1",
        glucose: 132,
        recordedAt: "2026-04-09T11:00:00.000Z",
        source: ReadingSource.LIBRE_NFC,
        isHistorical: false,
        createdAt: "2026-04-09T11:00:00.000Z",
      },
    ];

    const csv = convertCombinedDataToCsv(logEntries, readings);

    expect(csv).toContain(
      "Tipo,Fecha,Hora,Glucosa (mg/dL),Carbohidratos (g),Dosis Aplicada (U),Fuente",
    );
    expect(csv).toContain("Registro Manual");
    expect(csv).toContain("Sensor NFC");
    expect(csv).toContain("FreeStyle Libre");
  });

  it("generates filenames with and without date ranges", () => {
    const defaultName = generateCsvFilename();
    expect(defaultName).toMatch(/^glucosapp-historial-\d{4}-\d{2}-\d{2}\.csv$/);

    const rangeName = generateCsvFilename(
      new Date(2026, 3, 1, 12, 0, 0),
      new Date(2026, 3, 9, 12, 0, 0),
    );
    expect(rangeName).toBe("glucosapp-historial-2026-04-01-2026-04-09.csv");
  });
});
