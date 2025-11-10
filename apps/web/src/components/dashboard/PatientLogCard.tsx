"use client";

import { useState } from "react";
import type { LogEntry, MealCategory, InsulinType } from "@glucosapp/types";
import {
  Activity,
  Apple,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  CookingPot,
  Droplets,
  Edit3,
  Moon,
  Sun,
  Thermometer,
  Wine,
} from "lucide-react";

interface PatientLogCardProps {
  entry: LogEntry;
}

const getMealTypeIcon = (mealType?: MealCategory) => {
  const className = "w-5 h-5 text-blue-600";
  if (!mealType) return <Activity className={className} />;
  const icons: Record<MealCategory, JSX.Element> = {
    BREAKFAST: <Coffee className={className} />,
    LUNCH: <Sun className={className} />,
    DINNER: <Moon className={className} />,
    SNACK: <Apple className={className} />,
    CORRECTION: <Clock className={className} />,
  };
  return icons[mealType] || <Activity className={className} />;
};

const getMealTypeLabel = (mealType?: MealCategory): string => {
  if (!mealType) return "Registro";
  const labels: Record<MealCategory, string> = {
    BREAKFAST: "Desayuno",
    LUNCH: "Almuerzo",
    DINNER: "Cena",
    SNACK: "Snack",
    CORRECTION: "Corrección",
  };
  return labels[mealType] || "Registro";
};

const getInsulinTypeLabel = (insulinType?: InsulinType): string => {
  if (!insulinType) return "";
  const labels: Record<InsulinType, string> = {
    BOLUS: "Rápida",
    BASAL: "Lenta",
  };
  return labels[insulinType] || "";
};

const getGlucoseColor = (glucose: number): string => {
  if (glucose < 70) return "text-red-600";
  if (glucose > 180) return "text-yellow-600";
  return "text-green-600";
};

export const PatientLogCard = ({ entry }: PatientLogCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const glucose = entry.glucoseEntry?.mgdl;
  const insulinDose = entry.insulinDose;
  const mealType = entry.mealType;
  const carbs = entry.carbohydrates;
  const mealTemplate = entry.mealTemplate;

  const recordedDate = new Date(entry.recordedAt);
  const dateStr = recordedDate.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = recordedDate.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasContext =
    entry.recentExercise ||
    entry.alcohol ||
    entry.illness ||
    entry.stress ||
    entry.menstruation ||
    entry.highFatMeal;

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow transition cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
      role="button"
      tabIndex={0}
      aria-label="Ver detalles del registro"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            {getMealTypeIcon(mealType)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {getMealTypeLabel(mealType)}
              </p>
              {!expanded && hasContext && (
                <div className="flex items-center gap-1 text-blue-600">
                  {entry.recentExercise && <Activity className="w-4 h-4" />}
                  {entry.alcohol && <Wine className="w-4 h-4" />}
                  {entry.illness && <Thermometer className="w-4 h-4" />}
                  {entry.stress && <Clock className="w-4 h-4" />}
                  {entry.menstruation && <Droplets className="w-4 h-4" />}
                  {entry.highFatMeal && <CookingPot className="w-4 h-4" />}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {dateStr} - {timeStr}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-2">
        {/* Glucosa */}
        <div>
          <p className="text-xs text-gray-500">Glucosa</p>
          {glucose ? (
            <p className={`text-sm font-medium ${getGlucoseColor(glucose)}`}>{glucose} mg/dL</p>
          ) : (
            <p className="text-sm text-gray-300">—</p>
          )}
        </div>
        {/* Carbs */}
        <div>
          <p className="text-xs text-gray-500">Carbs</p>
          {carbs !== undefined && carbs > 0 ? (
            <p className="text-sm font-medium text-gray-900">{carbs}g</p>
          ) : (
            <p className="text-sm text-gray-300">—</p>
          )}
        </div>
        {/* Insulina */}
        <div>
          <p className="text-xs text-gray-500">Insulina</p>
          {insulinDose && insulinDose.units > 0 ? (
            <p className="text-sm font-medium text-gray-900">{insulinDose.units.toFixed(1)} U</p>
          ) : (
            <p className="text-sm text-gray-300">—</p>
          )}
        </div>
      </div>

      {/* Details */}
      {expanded && (
        <div className="pt-3 mt-3 border-t border-gray-200">
          {/* Glucose Details */}
          {glucose !== undefined && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-900 mb-2">Glucosa</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Valor medido:</span>
                <span className={`${getGlucoseColor(glucose)} font-medium`}>{glucose} mg/dL</span>
              </div>
            </div>
          )}

          {/* Meal Details */}
          {(carbs !== undefined && carbs > 0) || mealTemplate ? (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-900 mb-2">Comida</p>
              {carbs !== undefined && carbs > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Carbohidratos totales:</span>
                  <span className="text-gray-900 font-medium">{carbs}g</span>
                </div>
              )}
              {mealTemplate && (
                <div className="mt-2 space-y-2">
                  {mealTemplate.name && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Comida guardada:</span>
                      <span className="text-gray-900 font-medium">{mealTemplate.name}</span>
                    </div>
                  )}
                  {mealTemplate.foodItems && mealTemplate.foodItems.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">Alimentos:</p>
                      <div className="mt-1 space-y-1">
                        {mealTemplate.foodItems.map((fi) => (
                          <div key={fi.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">• {fi.name}</span>
                            <span className="text-gray-500">
                              {fi.quantity}g ({fi.carbs}g carbs)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Insulin Details */}
          {insulinDose && insulinDose.units > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-900 mb-2">Insulina</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tipo:</span>
                <span className="text-gray-900 font-medium">
                  {getInsulinTypeLabel(insulinDose.type)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Dosis aplicada:</span>
                <span className="text-gray-900 font-medium">{insulinDose.units.toFixed(1)} U</span>
              </div>
              {(insulinDose.calculatedUnits !== undefined ||
                insulinDose.carbInsulin !== undefined ||
                insulinDose.correctionInsulin !== undefined ||
                insulinDose.iobSubtracted !== undefined ||
                insulinDose.wasManuallyEdited) && (
                <div className="mt-2 space-y-1">
                  {insulinDose.calculatedUnits !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Dosis calculada:</span>
                      <span className="text-gray-900 font-medium">
                        {insulinDose.calculatedUnits.toFixed(1)} U
                      </span>
                    </div>
                  )}
                  {insulinDose.carbInsulin !== undefined && insulinDose.carbInsulin > 0 && (
                    <p className="text-sm text-gray-700">
                      • Dosis prandial: {insulinDose.carbInsulin.toFixed(1)} U
                    </p>
                  )}
                  {insulinDose.correctionInsulin !== undefined &&
                    insulinDose.correctionInsulin > 0 && (
                      <p className="text-sm text-gray-700">
                        • Corrección: {insulinDose.correctionInsulin.toFixed(1)} U
                      </p>
                    )}
                  {insulinDose.iobSubtracted !== undefined && insulinDose.iobSubtracted > 0 && (
                    <p className="text-sm text-gray-700">
                      • IOB restado: -{insulinDose.iobSubtracted.toFixed(1)} U
                    </p>
                  )}
                  {insulinDose.wasManuallyEdited && (
                    <div className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded">
                      <Edit3 className="w-3 h-3" />
                      <span className="text-xs">Editado manualmente</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Context */}
          {hasContext && (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Contexto Adicional</p>
              <div className="flex flex-wrap gap-2">
                {entry.recentExercise && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200">
                    <Activity className="w-3 h-3" /> Ejercicio
                  </span>
                )}
                {entry.alcohol && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200">
                    <Wine className="w-3 h-3" /> Alcohol
                  </span>
                )}
                {entry.illness && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200">
                    <Thermometer className="w-3 h-3" /> Enfermedad
                  </span>
                )}
                {entry.stress && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200">
                    <Clock className="w-3 h-3" /> Estrés
                  </span>
                )}
                {entry.menstruation && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200">
                    <Droplets className="w-3 h-3" /> Periodo
                  </span>
                )}
                {entry.highFatMeal && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200">
                    <CookingPot className="w-3 h-3" /> Alta en grasa
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
