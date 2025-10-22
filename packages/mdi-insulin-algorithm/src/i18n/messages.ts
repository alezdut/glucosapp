import type { SupportedLanguage } from "./types.js";

/**
 * Translation messages organized by category
 */
export const messages: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Warnings from generateWarnings()
    "warnings.hypoglycemia": "🚨 HYPOGLYCEMIA: Treat immediately with 15g fast carbohydrates",
    "warnings.highIobLowGlucose": "⚠️ High IOB with low glucose: consider snack without insulin",
    "warnings.veryHighGlucose": "⚠️ Very high glucose: check ketones (urine or blood)",
    "warnings.carbsWithoutInsulin":
      "⚠️ Carbohydrates will be consumed without insulin. High IOB compensating.",
    "warnings.highNocturnalDose":
      "⚠️ High nocturnal dose: risk of hypoglycemia. Consider reducing.",
    "warnings.veryHighDose": "⚠️ Very high dose (>15U): verify calculation and context",
    "warnings.recentExercise": "ℹ️ Recent exercise: dose reduced. Monitor glucose frequently.",
    "warnings.alcohol":
      "⚠️ Alcohol consumption: increased risk of delayed hypoglycemia (up to 24h)",
    "warnings.highFatMeal":
      "ℹ️ High-fat meal: slow absorption. Consider splitting the dose, 60% now and 40% in 2-3h if necessary.",
    "warnings.illness": "ℹ️ Illness: Could affect insulin sensitivity. Adjusted dose by +20%",
    "warnings.stress": "ℹ️ Stress: Could affect insulin sensitivity. Adjusted dose by +10%",
    "warnings.menstruation":
      "ℹ️ Menstruation: Could affect insulin sensitivity. Adjusted dose by +10%",

    // Pre-sleep evaluation messages
    "preSleep.riskNocturnalHypo":
      "⚠️ Risk of nocturnal hypoglycemia. Consume 15g of carbohydrates.",
    "preSleep.veryHighGlucose": "⚠️ Very high glucose. Check ketones if it persists.",
    "preSleep.monitorTrend": "Consider measurement at 3 AM to check trend.",

    // Correction messages
    "correction.wait3Hours":
      "⛔ Wait at least 3 hours since last dose (${hours} hours have passed)",
    "correction.conservativeCorrection":
      "Conservative correction (50% of calculated). Current IOB: ${iob}U",
    "correction.checkGlucose": "⚠️ Check glucose in 2 hours",
    "correction.noCorrectionNeeded": "No correction required. Glucose in range or IOB sufficient.",

    // Validation recommendations
    "validation.urgentAdjustment":
      "🚨 URGENT ADJUSTMENT: Too many hypoglycemias (${hypoRate}%). Reduce doses or adjust parameters with doctor immediately.",
    "validation.caution":
      "⚠️ CAUTION: Elevated hypoglycemia rate (${hypoRate}%). Consider 10-15% dose reduction with medical supervision.",
    "validation.reviewPoorControl":
      "⚠️ REVIEW: Only ${percentageRange}% days in range. Review carb counting, ISF/IC Ratio parameters, and schedule consistency.",
    "validation.reviewPoorControlHyper":
      "⚠️ REVIEW: Only ${percentageRange}% days in range with ${hyperRate}% hyperglycemias. Consider gradual dose increase with medical supervision.",
    "validation.optimize":
      "→ OPTIMIZE: ${percentageRange}% days in range. Frequent hyperglycemias (${hyperRate}%). Consider fine-tuning IC Ratios by time of day.",
    "validation.continue":
      "→ CONTINUE: ${percentageRange}% days in range. Acceptable performance but can improve. Maintain detailed logging and look for patterns.",
    "validation.excellent":
      "✅ EXCELLENT: ${percentageRange}% days in range, no hypoglycemias, minimal hyperglycemias. Model functioning optimally.",
    "validation.modelWorking":
      "✓ MODEL WORKING WELL: ${percentageRange}% days in range with minimal hypoglycemias (${hypoRate}%). Maintain current parameters.",
    "validation.continueMonitoring":
      "→ CONTINUE MONITORING: Performance within goals. Maintain logging and review monthly.",

    // Pattern analysis
    "patterns.recurringHypos": "Recurring hypoglycemias in ${timeDesc} (hour ${hour}:00)",
    "patterns.suggestReduceDose":
      "Reduce dose prior to ${hour}:00 or increase carbohydrates without increasing insulin",
    "patterns.consistentHyper":
      "Consistent hyperglycemias around ${hour}:00 (average: ${average} mg/dL)",
    "patterns.suggestIncreaseDose": "Increase dose prior to ${hour}:00 or adjust IC Ratio",
    "patterns.highVariability": "High glucose variability (SD: ${standardDeviation} mg/dL)",
    "patterns.suggestConsistency":
      "Improve consistency in: meal timing, carb counting, and dose timing",
    "patterns.noPatterns": "No consistent problematic patterns detected",

    // Dose calculations
    "dose.reducedByFactors": "ℹ️ Dose reduced ${reduction}% by safety factors",
  },

  es: {
    // Warnings from generateWarnings()
    "warnings.hypoglycemia":
      "🚨 HIPOGLUCEMIA: Tratar inmediatamente con 15g de carbohidratos rápidos",
    "warnings.highIobLowGlucose": "⚠️ IOB alto con glucosa baja: considerar snack sin insulina",
    "warnings.veryHighGlucose": "⚠️ Glucosa muy alta: verificar cetonas (orina o sangre)",
    "warnings.carbsWithoutInsulin":
      "⚠️ Se pueden consumir carbohidratos sin insulina. IOB alto compensando.",
    "warnings.highNocturnalDose":
      "⚠️ Dosis nocturna alta: riesgo de hipoglucemia. Considerar reducir.",
    "warnings.veryHighDose": "⚠️ Dosis muy alta (>15U): verificar cálculo y contexto",
    "warnings.recentExercise":
      "ℹ️ Ejercicio reciente: dosis reducida. Monitorear glucosa frecuentemente.",
    "warnings.alcohol":
      "⚠️ Consumo de alcohol: mayor riesgo de hipoglucemia tardía (hasta 24h). Se recomienda monitoreo",
    "warnings.highFatMeal":
      "ℹ️ Comida alta en grasa: absorción lenta. Considerar dividir la dosis, 60% ahora y 40% en 2-3h si es necesario.",
    "warnings.illness":
      "ℹ️ Enfermedad: Podría afectar la sensibilidad a la insulina. Dosis ajustada +20%",
    "warnings.stress":
      "ℹ️ Estrés: Podría afectar la sensibilidad a la insulina. Dosis ajustada +10%",
    "warnings.menstruation":
      "ℹ️ Menstruación: Podría afectar la sensibilidad a la insulina. Dosis ajustada +10%",

    // Pre-sleep evaluation messages
    "preSleep.riskNocturnalHypo":
      "⚠️ Riesgo de hipoglucemia nocturna. Consumir 15g de carbohidratos.",
    "preSleep.veryHighGlucose": "⚠️ Glucosa muy alta. Verificar cetonas si persiste.",
    "preSleep.monitorTrend": "Considerar medición a las 3 AM para verificar tendencia.",

    // Correction messages
    "correction.wait3Hours":
      "⛔ Esperar al menos 3 horas desde la última dosis (${hours} horas han pasado)",
    "correction.conservativeCorrection":
      "Corrección conservadora (50% de la calculada). IOB actual: ${iob}U",
    "correction.checkGlucose": "⚠️ Verificar glucosa en 2 horas",
    "correction.noCorrectionNeeded":
      "No se requiere corrección. Glucosa en rango o IOB suficiente.",

    // Validation recommendations
    "validation.urgentAdjustment":
      "🚨 AJUSTE URGENTE: Demasiadas hipoglucemias (${hypoRate}%). Reducir dosis o ajustar parámetros con médico inmediatamente.",
    "validation.caution":
      "⚠️ PRECAUCIÓN: Tasa elevada de hipoglucemias (${hypoRate}%). Considerar reducción de dosis del 10-15% con supervisión médica.",
    "validation.reviewPoorControl":
      "⚠️ REVISAR: Solo ${percentageRange}% días en rango. Revisar conteo de carbohidratos, parámetros ISF/IC Ratio, y consistencia del horario.",
    "validation.reviewPoorControlHyper":
      "⚠️ REVISAR: Solo ${percentageRange}% días en rango con ${hyperRate}% hiperglucemias. Considerar aumento gradual de dosis con supervisión médica.",
    "validation.optimize":
      "→ OPTIMIZAR: ${percentageRange}% días en rango. Hiperglucemias frecuentes (${hyperRate}%). Considerar ajuste fino de IC Ratios por hora del día.",
    "validation.continue":
      "→ CONTINUAR: ${percentageRange}% días en rango. Rendimiento aceptable pero puede mejorar. Mantener registro detallado y buscar patrones.",
    "validation.excellent":
      "✅ EXCELENTE: ${percentageRange}% días en rango, sin hipoglucemias, hiperglucemias mínimas. Modelo funcionando óptimamente.",
    "validation.modelWorking":
      "✓ MODELO FUNCIONANDO BIEN: ${percentageRange}% días en rango con hipoglucemias mínimas (${hypoRate}%). Mantener parámetros actuales.",
    "validation.continueMonitoring":
      "→ CONTINUAR MONITOREO: Rendimiento dentro de objetivos. Mantener registro y revisar mensualmente.",

    // Pattern analysis
    "patterns.recurringHypos": "Hipoglucemias recurrentes en ${timeDesc} (hora ${hour}:00)",
    "patterns.suggestReduceDose":
      "Reducir dosis antes de las ${hour}:00 o aumentar carbohidratos sin aumentar insulina",
    "patterns.consistentHyper":
      "Hiperglucemias consistentes alrededor de las ${hour}:00 (promedio: ${average} mg/dL)",
    "patterns.suggestIncreaseDose": "Aumentar dosis antes de las ${hour}:00 o ajustar IC Ratio",
    "patterns.highVariability": "Alta variabilidad de glucosa (DE: ${standardDeviation} mg/dL)",
    "patterns.suggestConsistency":
      "Mejorar consistencia en: horarios de comida, conteo de carbohidratos, y horarios de dosis",
    "patterns.noPatterns": "No se detectaron patrones problemáticos consistentes",

    // Dose calculations
    "dose.reducedByFactors": "ℹ️ Dosis reducida ${reduction}% por factores de seguridad",
  },
};
