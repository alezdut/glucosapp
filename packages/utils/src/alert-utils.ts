/**
 * Alert-related constants and utilities
 */

/**
 * Alert type labels in Spanish
 */
export const ALERT_TYPE_LABELS: Record<string, string> = {
  HYPOGLYCEMIA: "Hipoglucemia",
  SEVERE_HYPOGLYCEMIA: "Hipoglucemia Severa",
  HYPERGLYCEMIA: "Hiperglucemia",
  PERSISTENT_HYPERGLYCEMIA: "Hiperglucemia Persistente",
  OTHER: "Alerta",
} as const;

/**
 * Default label for unknown alert types
 */
export const ALERT_TYPE_DEFAULT = "Alerta";

/**
 * Get alert type label in Spanish
 * @param type - Alert type string
 * @returns Label string with fallback to default
 */
export const getAlertTypeLabel = (type: string): string => {
  return ALERT_TYPE_LABELS[type] || ALERT_TYPE_DEFAULT;
};

/**
 * Patient name fallback when patient is unknown
 */
export const PATIENT_UNKNOWN = "Paciente desconocido";

/**
 * Button text constants
 */
export const BUTTON_TEXT_ACKNOWLEDGE = "Ver Detalles del Paciente";
export const BUTTON_TEXT_ACKNOWLEDGING = "Marcando...";
