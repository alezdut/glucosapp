import type { LogEntry, MealCategory } from "@glucosapp/types";
import { formatLocalDateAsYYYYMMDD } from "./dateUtils";

/**
 * Escape CSV field to handle commas, quotes, and newlines
 */
const escapeCsvField = (field: string | number | undefined | null): string => {
  if (field === undefined || field === null) {
    return "";
  }
  const stringValue = String(field);
  // If field contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

/**
 * Get Spanish label for meal type
 */
const getMealTypeLabel = (mealType?: MealCategory): string => {
  if (!mealType) return "";
  const labels: Record<MealCategory, string> = {
    BREAKFAST: "Desayuno",
    LUNCH: "Almuerzo",
    DINNER: "Cena",
    SNACK: "Snack",
    CORRECTION: "Corrección",
  };
  return labels[mealType] || "";
};

/**
 * Convert boolean to Yes/No in Spanish
 */
const booleanToSpanish = (value: boolean): string => {
  return value ? "Sí" : "No";
};

/**
 * Convert log entries to CSV format
 */
export const convertLogEntriesToCsv = (entries: LogEntry[]): string => {
  // CSV Header
  const header = [
    "Fecha",
    "Hora",
    "Glucosa (mg/dL)",
    "Carbohidratos (g)",
    "Dosis Aplicada (U)",
    "Dosis Calculada (U)",
    "Editada Manualmente",
    "Dosis Prandial (U)",
    "Corrección (U)",
    "IOB Restado (U)",
    "Tipo de Comida",
    "Alimentos",
    "Ejercicio Reciente",
    "Alcohol",
    "Enfermedad",
    "Estrés",
    "Periodo Menstrual",
    "Comida Alta en Grasa",
  ].join(",");

  // CSV Rows
  const rows = entries.map((entry) => {
    const date = new Date(entry.recordedAt);
    const dateStr = date.toLocaleDateString("es-ES");
    const timeStr = date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const glucose = entry.glucoseEntry?.mgdl ?? "";
    const carbs = entry.carbohydrates ?? "";

    // Insulin data
    const appliedDose = entry.insulinDose?.units ?? "";
    const calculatedDose = entry.insulinDose?.calculatedUnits ?? "";
    const wasManuallyEdited = entry.insulinDose?.wasManuallyEdited
      ? booleanToSpanish(entry.insulinDose.wasManuallyEdited)
      : "";

    // Insulin calculation breakdown
    const carbInsulin =
      entry.insulinDose?.carbInsulin != null ? entry.insulinDose.carbInsulin.toFixed(1) : "";
    const correctionInsulin =
      entry.insulinDose?.correctionInsulin != null
        ? entry.insulinDose.correctionInsulin.toFixed(1)
        : "";
    const iobSubtracted =
      entry.insulinDose?.iobSubtracted != null ? entry.insulinDose.iobSubtracted.toFixed(1) : "";

    const mealType = getMealTypeLabel(entry.mealType);

    // Build foods list from meal template if available
    let foods = "";
    if (entry.mealTemplate?.foodItems && entry.mealTemplate.foodItems.length > 0) {
      foods = entry.mealTemplate.foodItems
        .map((item) => `${item.name} (${item.quantity}g)`)
        .join("; ");
    } else if (entry.mealTemplate?.name) {
      foods = entry.mealTemplate.name;
    }

    // Context factors
    const recentExercise = booleanToSpanish(entry.recentExercise);
    const alcohol = booleanToSpanish(entry.alcohol);
    const illness = booleanToSpanish(entry.illness);
    const stress = booleanToSpanish(entry.stress);
    const menstruation = booleanToSpanish(entry.menstruation);
    const highFatMeal = booleanToSpanish(entry.highFatMeal);

    return [
      escapeCsvField(dateStr),
      escapeCsvField(timeStr),
      escapeCsvField(glucose),
      escapeCsvField(carbs),
      escapeCsvField(appliedDose),
      escapeCsvField(calculatedDose),
      escapeCsvField(wasManuallyEdited),
      escapeCsvField(carbInsulin),
      escapeCsvField(correctionInsulin),
      escapeCsvField(iobSubtracted),
      escapeCsvField(mealType),
      escapeCsvField(foods),
      escapeCsvField(recentExercise),
      escapeCsvField(alcohol),
      escapeCsvField(illness),
      escapeCsvField(stress),
      escapeCsvField(menstruation),
      escapeCsvField(highFatMeal),
    ].join(",");
  });

  return [header, ...rows].join("\n");
};

/**
 * Generate filename for CSV export
 */
export const generateCsvFilename = (startDate?: Date, endDate?: Date): string => {
  const now = new Date();
  const dateStr = formatLocalDateAsYYYYMMDD(now);

  if (startDate && endDate) {
    const start = formatLocalDateAsYYYYMMDD(startDate);
    const end = formatLocalDateAsYYYYMMDD(endDate);
    return `glucosapp-historial-${start}-${end}.csv`;
  }

  return `glucosapp-historial-${dateStr}.csv`;
};
