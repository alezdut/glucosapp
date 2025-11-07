"use client";

import { PatientMeal } from "@/lib/dashboard-api";

interface PatientMealsListProps {
  meals: PatientMeal[];
}

const formatMealType = (mealType?: string) => {
  if (!mealType) return "Comida";
  const types: Record<string, string> = {
    BREAKFAST: "Desayuno",
    LUNCH: "Almuerzo",
    DINNER: "Cena",
    SNACK: "Merienda",
    CORRECTION: "Corrección",
  };
  return types[mealType] || mealType;
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

export const PatientMealsList = ({ meals }: PatientMealsListProps) => {
  if (meals.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Registros de Comidas</h2>
        <div className="text-center py-8 text-gray-500">No hay comidas registradas</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Registros de Comidas</h2>
      <div className="space-y-4">
        {meals.map((entry) => {
          const { date, time } = formatDateTime(entry.recordedAt);
          const carbs = entry.carbohydrates || entry.mealTemplate?.carbohydrates || 0;
          const mealName = entry.mealTemplate?.name || "Comida";

          return (
            <div
              key={entry.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-gray-900">{mealName}</h3>
                  <p className="text-sm text-gray-500">
                    {formatMealType(entry.mealType)} • {date} a las {time}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{carbs.toFixed(1)} g</p>
                  <p className="text-xs text-gray-500">carbohidratos</p>
                </div>
              </div>
              {entry.mealTemplate?.foodItems && entry.mealTemplate.foodItems.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Alimentos:</p>
                  <div className="flex flex-wrap gap-2">
                    {entry.mealTemplate.foodItems.map((item) => (
                      <span
                        key={item.id}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        {item.name} ({item.carbs.toFixed(1)}g)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
