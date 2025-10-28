import type { LogEntry, MealCategory, InsulinType } from "@glucosapp/types";

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
 * Get Spanish label for insulin type
 */
const getInsulinTypeLabel = (insulinType?: InsulinType): string => {
  if (!insulinType) return "";
  const labels: Record<InsulinType, string> = {
    BOLUS: "Rápida",
    BASAL: "Lenta",
  };
  return labels[insulinType] || "";
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
    "Tipo de Insulina",
    "Dosis (U)",
    "Tipo de Comida",
    "Alimentos",
  ].join(",");

  // CSV Rows
  const rows = entries.map((entry) => {
    const date = new Date(entry.recordedAt);
    const dateStr = date.toLocaleDateString("es-ES");
    const timeStr = date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const glucose = entry.glucoseEntry?.mgdl || "";
    const carbs = entry.carbohydrates || "";
    const insulinType = entry.insulinDose?.type ? getInsulinTypeLabel(entry.insulinDose.type) : "";
    const insulinDose = entry.insulinDose?.units || "";
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

    return [
      escapeCsvField(dateStr),
      escapeCsvField(timeStr),
      escapeCsvField(glucose),
      escapeCsvField(carbs),
      escapeCsvField(insulinType),
      escapeCsvField(insulinDose),
      escapeCsvField(mealType),
      escapeCsvField(foods),
    ].join(",");
  });

  return [header, ...rows].join("\n");
};

/**
 * Generate filename for CSV export
 */
export const generateCsvFilename = (startDate?: Date, endDate?: Date): string => {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

  if (startDate && endDate) {
    const start = startDate.toISOString().split("T")[0];
    const end = endDate.toISOString().split("T")[0];
    return `glucosapp-historial-${start}-${end}.csv`;
  }

  return `glucosapp-historial-${dateStr}.csv`;
};
