/**
 * Utility functions for patient-related data
 */

/**
 * Get diabetes type label in Spanish
 * @param type - Diabetes type (TYPE_1 or TYPE_2)
 * @param defaultLabel - Default label to return if type is not provided (default: "No especificado")
 * @returns Label string or null if defaultLabel is not provided and type is missing
 */
export const getDiabetesTypeLabel = (
  type?: "TYPE_1" | "TYPE_2",
  defaultLabel: string | null = "No especificado",
): string | null => {
  if (!type) return defaultLabel;
  return type === "TYPE_1" ? "Tipo 1" : "Tipo 2";
};
