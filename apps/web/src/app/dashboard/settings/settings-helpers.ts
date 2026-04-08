import {
  ALERT_THRESHOLD_RANGES,
  type AlertSettings,
  type NotificationFrequency,
} from "@glucosapp/types";
import type { GetPatientsFilters } from "@/lib/dashboard-api";

export type GroupFilter = { type: string; value: string };

export const validateAlertSettings = (settings: Partial<AlertSettings>): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (settings.hypoglycemiaThreshold !== undefined && settings.hypoglycemiaThreshold > 0) {
    const min = ALERT_THRESHOLD_RANGES.HYPOGLYCEMIA.min;
    const max = ALERT_THRESHOLD_RANGES.HYPOGLYCEMIA.max;
    if (settings.hypoglycemiaThreshold < min || settings.hypoglycemiaThreshold > max) {
      errors.hypoglycemiaThreshold = `El valor debe estar entre ${min} y ${max} mg/dL`;
    }
  }

  if (settings.severeHypoglycemiaThreshold && settings.hypoglycemiaThreshold) {
    if (settings.severeHypoglycemiaThreshold >= settings.hypoglycemiaThreshold) {
      errors.severeHypoglycemiaThreshold =
        "El umbral de hipoglucemia severa debe ser menor que el umbral de hipoglucemia";
    }
  }

  if (settings.hyperglycemiaThreshold !== undefined && settings.hyperglycemiaThreshold > 0) {
    const min = ALERT_THRESHOLD_RANGES.HYPERGLYCEMIA.min;
    const max = ALERT_THRESHOLD_RANGES.HYPERGLYCEMIA.max;
    if (settings.hyperglycemiaThreshold < min || settings.hyperglycemiaThreshold > max) {
      errors.hyperglycemiaThreshold = `El valor debe estar entre ${min} y ${max} mg/dL`;
    }
  }

  if (settings.hyperglycemiaThreshold && settings.hypoglycemiaThreshold) {
    if (settings.hyperglycemiaThreshold <= settings.hypoglycemiaThreshold) {
      errors.hyperglycemiaThreshold =
        "El umbral de hiperglucemia debe ser mayor que el umbral de hipoglucemia";
    }
  }

  if (
    settings.persistentHyperglycemiaThreshold !== undefined &&
    settings.persistentHyperglycemiaThreshold > 0
  ) {
    const min = ALERT_THRESHOLD_RANGES.PERSISTENT_HYPERGLYCEMIA.min;
    const max = ALERT_THRESHOLD_RANGES.PERSISTENT_HYPERGLYCEMIA.max;
    if (
      settings.persistentHyperglycemiaThreshold < min ||
      settings.persistentHyperglycemiaThreshold > max
    ) {
      errors.persistentHyperglycemiaThreshold = `El valor debe estar entre ${min} y ${max} mg/dL`;
    }
  }

  if (settings.persistentHyperglycemiaThreshold && settings.hypoglycemiaThreshold) {
    if (settings.persistentHyperglycemiaThreshold <= settings.hypoglycemiaThreshold) {
      errors.persistentHyperglycemiaThreshold =
        "El umbral de hiperglucemia persistente debe ser mayor que el umbral de hipoglucemia";
    }
  }

  return errors;
};

export const buildGroupReportFilters = (groupFilters: GroupFilter[]): GetPatientsFilters => {
  const filters: GetPatientsFilters = {};

  for (const filter of groupFilters) {
    if (filter.type === "diabetesType") {
      filters.diabetesType = filter.value as "TYPE_1" | "TYPE_2";
    } else if (filter.type === "clinicalStatus") {
      filters.clinicalStatus = filter.value as "Riesgo" | "Estable";
    } else if (filter.type === "activityStatus") {
      filters.activityStatus = filter.value as "Activo" | "Inactivo";
    } else if (filter.type === "activeOnly") {
      filters.activeOnly = filter.value === "true";
    } else if (filter.type === "registrationDate") {
      filters.registrationDate = filter.value;
    } else if (filter.type === "ageRange") {
      filters.ageRange = filter.value;
    } else if (filter.type === "weightRange") {
      filters.weightRange = filter.value;
    } else if (filter.type === "search") {
      filters.search = filter.value;
    }
  }

  return filters;
};

export const getSelectedReportTypes = (
  reportTypes: Record<string, boolean>,
  typeMap?: Record<string, string>,
) =>
  Object.entries(reportTypes)
    .filter(([, selected]) => selected)
    .map(([type]) => typeMap?.[type] ?? type);

export const shouldEnableDailySummary = (frequency: NotificationFrequency): boolean =>
  frequency === "DAILY" || frequency === "WEEKLY";
