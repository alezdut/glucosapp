"use client";

import { MealStats } from "@/lib/dashboard-api";

interface MealStatsCardProps {
  stats: MealStats;
}

export const MealStatsCard = ({ stats }: MealStatsCardProps) => {
  const hasNoMeals = stats.totalMeals === 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col w-full">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Comidas Registradas</h2>
      {hasNoMeals ? (
        <>
          <div className="mb-4 flex-1 flex items-center">
            <p className="text-4xl font-bold text-gray-900">
              0 <span className="text-xl font-normal text-gray-600">{stats.unit}</span>
            </p>
          </div>
          <p className="text-sm text-gray-600">
            En los últimos 30 días, sus pacientes no tienen comidas registradas.
          </p>
        </>
      ) : (
        <>
          <div className="mb-4 flex-1 flex items-center">
            <p className="text-4xl font-bold text-gray-900">
              {stats.totalMeals}{" "}
              <span className="text-xl font-normal text-gray-600">{stats.unit}</span>
            </p>
          </div>
          <p className="text-sm text-gray-600">
            {stats.description.split(String(stats.totalMeals)).map((part, index) => (
              <span key={index}>
                {index === 0 ? (
                  <>
                    Sus pacientes registraron{" "}
                    <span className="font-semibold text-green-600">
                      {stats.totalMeals} comidas
                    </span>{" "}
                  </>
                ) : (
                  part
                )}
              </span>
            ))}
          </p>
        </>
      )}
    </div>
  );
};
