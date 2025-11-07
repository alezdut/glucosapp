"use client";

import { PatientProfile } from "@/lib/dashboard-api";

interface PatientParametersProps {
  profile: PatientProfile;
}

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

export const PatientParameters = ({ profile }: PatientParametersProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Parámetros de Tratamiento</h2>

      <div className="space-y-6">
        {/* Insulin Parameters */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Ratios de Insulina</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Desayuno</p>
              <p className="text-xl font-semibold text-gray-900">{profile.icRatioBreakfast} g/U</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Almuerzo</p>
              <p className="text-xl font-semibold text-gray-900">{profile.icRatioLunch} g/U</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Cena</p>
              <p className="text-xl font-semibold text-gray-900">{profile.icRatioDinner} g/U</p>
            </div>
          </div>
        </div>

        {/* Sensitivity and Duration */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Factor de Sensibilidad</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Factor de Sensibilidad</p>
              <p className="text-xl font-semibold text-gray-900">
                {profile.insulinSensitivityFactor} mg/dL/U
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Duración de Acción (DIA)</p>
              <p className="text-xl font-semibold text-gray-900">{profile.diaHours} horas</p>
            </div>
          </div>
        </div>

        {/* Target Glucose Range */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Rango Objetivo de Glucosa</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profile.targetGlucose && (
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Objetivo</p>
                <p className="text-xl font-semibold text-gray-900">{profile.targetGlucose} mg/dL</p>
              </div>
            )}
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Mínimo</p>
              <p className="text-xl font-semibold text-gray-900">
                {profile.minTargetGlucose} mg/dL
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Máximo</p>
              <p className="text-xl font-semibold text-gray-900">
                {profile.maxTargetGlucose} mg/dL
              </p>
            </div>
          </div>
        </div>

        {/* Meal Times */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Horarios de Comidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profile.mealTimeBreakfastStart !== undefined &&
              profile.mealTimeBreakfastEnd !== undefined && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Desayuno</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {minutesToTime(profile.mealTimeBreakfastStart)} -{" "}
                    {minutesToTime(profile.mealTimeBreakfastEnd)}
                  </p>
                </div>
              )}
            {profile.mealTimeLunchStart !== undefined && profile.mealTimeLunchEnd !== undefined && (
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Almuerzo</p>
                <p className="text-lg font-semibold text-gray-900">
                  {minutesToTime(profile.mealTimeLunchStart)} -{" "}
                  {minutesToTime(profile.mealTimeLunchEnd)}
                </p>
              </div>
            )}
            {profile.mealTimeDinnerStart !== undefined &&
              profile.mealTimeDinnerEnd !== undefined && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Cena</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {minutesToTime(profile.mealTimeDinnerStart)} -{" "}
                    {minutesToTime(profile.mealTimeDinnerEnd)}
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
