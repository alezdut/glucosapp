/**
 * Utility functions for patient-related data
 */

import { DiabetesType } from "@glucosapp/types";

/**
 * Diabetes type labels in Spanish
 */
export const DIABETES_TYPE_LABELS = {
  TYPE_1: "Tipo 1",
  TYPE_2: "Tipo 2",
  NOT_SPECIFIED: "No especificado",
} as const;

/**
 * Get diabetes type label in Spanish
 * @param type - Diabetes type (TYPE_1 or TYPE_2)
 * @param defaultLabel - Default label to return if type is not provided (default: DIABETES_TYPE_LABELS.NOT_SPECIFIED)
 * @returns Label string or null if defaultLabel is not provided and type is missing
 */
export const getDiabetesTypeLabel = (
  type?: DiabetesType,
  defaultLabel: string | null = DIABETES_TYPE_LABELS.NOT_SPECIFIED,
): string | null => {
  if (!type) return defaultLabel;
  return type === DiabetesType.TYPE_1 ? DIABETES_TYPE_LABELS.TYPE_1 : DIABETES_TYPE_LABELS.TYPE_2;
};
