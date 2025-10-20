/**
 * Shared insulin and glucose calculation utilities
 */

import { InsulinType } from "./index";
import { CARB_GLUCOSE_IMPACT, CRITICAL_MIN_GLUCOSE, CRITICAL_MAX_GLUCOSE } from "./constants";

/**
 * Parameters for insulin calculation
 */
export interface InsulinCalculationParams {
  carbohydrates: number;
  glucoseLevel: number;
  targetGlucose?: number;
  insulinType: InsulinType;
  carbRatio: number;
  insulinSensitivityFactor: number;
}

/**
 * Result of insulin calculation
 */
export interface InsulinCalculationResult {
  carbInsulin: number;
  correctionInsulin: number;
  totalInsulin: number;
  projectedGlucose: number;
}

/**
 * Alert level for glucose projections
 */
export type AlertLevel = "none" | "warning" | "danger";

/**
 * Result of glucose alert evaluation
 */
export interface GlucoseAlert {
  level: AlertLevel;
  message: string;
  projectedGlucose: number;
}

export interface RecentBolus {
  units: number;
  // timestamp en ms (Date.now() compatible)
  timestamp: number;
}

export interface InsulinCalculationParams {
  carbohydrates: number; // gramos
  glucoseLevel: number; // mg/dL, glucemia actual
  targetGlucose?: number; // mg/dL (si no viene, usamos defaultTarget)
  carbRatio: number; // gramos CHO por 1 U (ICR). ej: 10 => 1U / 10g
  insulinSensitivityFactor: number; // ISF en mg/dL por 1 U
  // Opcionales para seguridad / contexto:
  insulinOnBoard?: number; // U activas ya calculadas (sobrescribe recentBoluses si viene)
  recentBoluses?: RecentBolus[]; // si querés que la función calcule IOB
  durationOfInsulinActionMinutes?: number; // DIA en minutos (default 240)
  sensitivityMultiplier?: number; // multiplicador para ISF (ej: ejercicio -> 1.2 o enfermedad -> 0.8)
  minDose?: number; // U min permitida (default 0)
  maxDose?: number; // U max permitida (opcional)
  rounding?: number; // redondeo en U (ej: 0.1)
}

export interface InsulinCalculationResult {
  carbInsulin: number;
  correctionInsulin: number;
  iobUsed: number;
  totalInsulin: number;
  projectedGlucose: number;
  warnings: string[];
}

/**
 * Helper: cálculo aproximado de IOB a partir de bolos recientes usando decay lineal.
 * Modelo simple: cada bolo decae linealmente en DIA minutos hasta 0.
 */
function computeIOB(
  recentBoluses: RecentBolus[] | undefined,
  nowMs: number,
  diaMinutes: number,
): number {
  if (!recentBoluses || recentBoluses.length === 0) return 0;
  const diaMs = diaMinutes * 60_000;
  let iob = 0;
  for (const b of recentBoluses) {
    const age = Math.max(0, nowMs - b.timestamp);
    if (age >= diaMs) continue;
    // decay linear: fracción restante = 1 - (age / dia)
    const fracRemaining = 1 - age / diaMs;
    iob += b.units * fracRemaining;
  }
  return iob;
}

export function calculateInsulinDose(params: InsulinCalculationParams): InsulinCalculationResult {
  const {
    carbohydrates,
    glucoseLevel,
    targetGlucose = 100, // objetivo por default (mg/dL) si no viene
    carbRatio,
    insulinSensitivityFactor,
    insulinOnBoard,
    recentBoluses,
    durationOfInsulinActionMinutes = 240, // 4 horas por defecto
    sensitivityMultiplier = 1.0,
    minDose = 0,
    maxDose,
    rounding = 0.1,
  } = params;

  const warnings: string[] = [];

  // Protect against invalid inputs
  if (carbRatio <= 0 || insulinSensitivityFactor <= 0) {
    throw new Error("carbRatio e insulinSensitivityFactor deben ser mayores a 0");
  }

  // 1) Insulina para carbohidratos (ICR)
  const carbInsulinRaw = carbohydrates / carbRatio;

  // 2) Calcular IOB: si se proporcionó explicitamente, se usa; si no, se intenta calcular.
  const now = Date.now();
  const iobCalculated =
    insulinOnBoard ?? computeIOB(recentBoluses, now, durationOfInsulinActionMinutes);
  const iobUsed = Math.max(0, iobCalculated);

  // 3) Corrección basada en glucemia actual (estándar clínico)
  // correctionRaw = (glucemia_actual - objetivo) / ISF
  const rawCorrection =
    (glucoseLevel - targetGlucose) / (insulinSensitivityFactor * sensitivityMultiplier);

  // Normalmente no administramos corrección negativa (si estás por debajo del objetivo no damos corrección)
  const correctionBeforeIOB = Math.max(0, rawCorrection);

  // 4) Restar IOB para evitar stacking (solo a la parte de corrección)
  let correctionInsulinRaw = correctionBeforeIOB - iobUsed;
  if (correctionInsulinRaw < 0) {
    // Si IOB cubre más que la corrección, no damos corrección y avisamos
    correctionInsulinRaw = 0;
    warnings.push("IOB suficiente para corregir la glucemia: se omite corrección activa.");
  }

  // 5) Total
  let totalInsulinRaw = carbInsulinRaw + correctionInsulinRaw;

  // 6) Aplicar límites y redondeo
  if (minDose !== undefined) totalInsulinRaw = Math.max(minDose, totalInsulinRaw);
  if (maxDose !== undefined) totalInsulinRaw = Math.min(maxDose, totalInsulinRaw);

  // redondeo a "rounding" (ej 0.1). Si 0 => no redondeo
  const round = (v: number) => {
    if (!rounding || rounding <= 0) return v;
    return Math.round(v / rounding) * rounding;
  };

  const carbInsulin = round(carbInsulinRaw);
  const correctionInsulin = round(correctionInsulinRaw);
  const totalInsulin = round(totalInsulinRaw);

  // 7) Proyección de glucemia después de la comida + dosis
  // Para proyectar simplificamos: glucemia + (CHO * impacto_por_g) - (U * ISF)
  // No asumimos un valor fijo para impacto_por_g en el código: usamos una constante típica (3.5 mg/dL por g)
  const CARB_GLUCOSE_IMPACT = 3.5; // valor aproximado: 3-5 mg/dL por g (ajustable)
  const projectedGlucose = Math.round(
    glucoseLevel + carbohydrates * CARB_GLUCOSE_IMPACT - totalInsulin * insulinSensitivityFactor,
  );

  // 8) Seguridad adicional: advertencias si proyecta hipoglucemia
  if (projectedGlucose < 70) {
    warnings.push(
      `Proyección de glucemia baja: ${projectedGlucose} mg/dL. Revisar dosis / considerar carbohidrato extra o disminuir corrección.`,
    );
  }

  return {
    carbInsulin,
    correctionInsulin,
    iobUsed: Math.round(iobUsed * 10) / 10,
    totalInsulin,
    projectedGlucose,
    warnings,
  };
}

/**
 * Calculate projected glucose after applying insulin (función actualizada)
 */
export function calculateProjectedGlucose(
  currentGlucose: number,
  carbohydrates: number,
  insulinUnits: number,
  insulinSensitivityFactor: number,
  carbGlucoseImpact = 3.5,
): number {
  const carbImpact = carbohydrates * carbGlucoseImpact;
  const insulinImpact = insulinUnits * insulinSensitivityFactor;
  return Math.round(currentGlucose + carbImpact - insulinImpact);
}

/**
 * Evaluate glucose alert level based on projected glucose
 */
export function evaluateGlucoseAlert(
  projectedGlucose: number,
  minTargetGlucose: number,
  maxTargetGlucose: number,
  currentGlucose: number,
  appliedInsulin: number,
): GlucoseAlert {
  // Default: no alert
  let level: AlertLevel = "none";
  let message = "";

  // Only evaluate if we have valid glucose and insulin values
  if (currentGlucose <= 0 || appliedInsulin <= 0) {
    return { level, message, projectedGlucose };
  }

  const roundedProjected = Math.round(projectedGlucose);

  // Check critical safety range first (red alert)
  if (projectedGlucose < CRITICAL_MIN_GLUCOSE) {
    level = "danger";
    message = `🚨 ALERTA SEVERA: Esta dosis podría bajar tu glucosa a ~${roundedProjected} mg/dL. Riesgo de hipoglucemia severa.`;
  } else if (projectedGlucose > CRITICAL_MAX_GLUCOSE) {
    level = "danger";
    message = `🚨 ALERTA SEVERA: Esta dosis podría dejar tu glucosa en ~${roundedProjected} mg/dL. Riesgo de hiperglucemia severa.`;
  }
  // Check personalized target range (yellow warning)
  else if (projectedGlucose < minTargetGlucose) {
    level = "warning";
    message = `⚠️ Esta dosis podría bajar tu glucosa a ~${roundedProjected} mg/dL, por debajo de tu rango objetivo (${minTargetGlucose}-${maxTargetGlucose} mg/dL).`;
  } else if (projectedGlucose > maxTargetGlucose) {
    level = "warning";
    message = `⚠️ Esta dosis podría dejar tu glucosa en ~${roundedProjected} mg/dL, por encima de tu rango objetivo (${minTargetGlucose}-${maxTargetGlucose} mg/dL).`;
  }

  return { level, message, projectedGlucose };
}

/**
 * Validate glucose reading
 */
export function isValidGlucoseReading(glucose: number | undefined): boolean {
  if (glucose === undefined) return false;
  return glucose >= 20 && glucose <= 600;
}

/**
 * Validate insulin dose
 */
export function isValidInsulinDose(insulin: number | undefined): boolean {
  if (insulin === undefined) return false;
  return insulin >= 0.5 && insulin <= 100;
}
