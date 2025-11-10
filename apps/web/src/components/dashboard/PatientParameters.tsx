"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PatientProfile } from "@/lib/dashboard-api";
import { Loader2, Save, Clock } from "lucide-react";

interface PatientParametersProps {
  profile: PatientProfile;
  patientId: string;
}

/**
 * Type for updating patient profile parameters
 * All fields except targetGlucose are required
 */
type UpdatePatientProfileData = {
  icRatioBreakfast: number;
  icRatioLunch: number;
  icRatioDinner: number;
  insulinSensitivityFactor: number;
  diaHours: number;
  targetGlucose?: number;
  minTargetGlucose: number;
  maxTargetGlucose: number;
  mealTimeBreakfastStart: number;
  mealTimeBreakfastEnd: number;
  mealTimeLunchStart: number;
  mealTimeLunchEnd: number;
  mealTimeDinnerStart: number;
  mealTimeDinnerEnd: number;
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Validation functions
const validateNumber = (value: string, min: number, max: number): number | null => {
  const num = parseFloat(value);
  if (isNaN(num) || num < min || num > max) return null;
  return num;
};

const validateInteger = (value: string, min: number, max: number): number | null => {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < min || num > max) return null;
  return num;
};

export const PatientParameters = ({ profile, patientId }: PatientParametersProps) => {
  const queryClient = useQueryClient();

  // State for editable fields
  const [icRatioBreakfast, setIcRatioBreakfast] = useState(
    profile.icRatioBreakfast?.toString() || "",
  );
  const [icRatioLunch, setIcRatioLunch] = useState(profile.icRatioLunch?.toString() || "");
  const [icRatioDinner, setIcRatioDinner] = useState(profile.icRatioDinner?.toString() || "");
  const [insulinSensitivityFactor, setInsulinSensitivityFactor] = useState(
    profile.insulinSensitivityFactor?.toString() || "",
  );
  const [diaHours, setDiaHours] = useState(profile.diaHours?.toString() || "");
  const [targetGlucose, setTargetGlucose] = useState(profile.targetGlucose?.toString() || "");
  const [minTargetGlucose, setMinTargetGlucose] = useState(
    profile.minTargetGlucose?.toString() || "",
  );
  const [maxTargetGlucose, setMaxTargetGlucose] = useState(
    profile.maxTargetGlucose?.toString() || "",
  );

  // Meal times state (as time strings for inputs)
  const [breakfastStart, setBreakfastStart] = useState(
    profile.mealTimeBreakfastStart ? minutesToTime(profile.mealTimeBreakfastStart) : "",
  );
  const [breakfastEnd, setBreakfastEnd] = useState(
    profile.mealTimeBreakfastEnd ? minutesToTime(profile.mealTimeBreakfastEnd) : "",
  );
  const [lunchStart, setLunchStart] = useState(
    profile.mealTimeLunchStart ? minutesToTime(profile.mealTimeLunchStart) : "",
  );
  const [lunchEnd, setLunchEnd] = useState(
    profile.mealTimeLunchEnd ? minutesToTime(profile.mealTimeLunchEnd) : "",
  );
  const [dinnerStart, setDinnerStart] = useState(
    profile.mealTimeDinnerStart ? minutesToTime(profile.mealTimeDinnerStart) : "",
  );
  const [dinnerEnd, setDinnerEnd] = useState(
    profile.mealTimeDinnerEnd ? minutesToTime(profile.mealTimeDinnerEnd) : "",
  );

  // Adjustment flag to prevent infinite loops
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Refs to track previous values
  const prevBreakfastStart = useRef<number | null>(profile.mealTimeBreakfastStart || null);
  const prevBreakfastEnd = useRef<number | null>(profile.mealTimeBreakfastEnd || null);
  const prevLunchStart = useRef<number | null>(profile.mealTimeLunchStart || null);
  const prevLunchEnd = useRef<number | null>(profile.mealTimeLunchEnd || null);
  const prevDinnerStart = useRef<number | null>(profile.mealTimeDinnerStart || null);
  const prevDinnerEnd = useRef<number | null>(profile.mealTimeDinnerEnd || null);

  // Reset form state when patientId or profile changes
  useEffect(() => {
    // Reset all state values to current profile values
    setIcRatioBreakfast(profile.icRatioBreakfast?.toString() || "");
    setIcRatioLunch(profile.icRatioLunch?.toString() || "");
    setIcRatioDinner(profile.icRatioDinner?.toString() || "");
    setInsulinSensitivityFactor(profile.insulinSensitivityFactor?.toString() || "");
    setDiaHours(profile.diaHours?.toString() || "");
    setTargetGlucose(profile.targetGlucose?.toString() || "");
    setMinTargetGlucose(profile.minTargetGlucose?.toString() || "");
    setMaxTargetGlucose(profile.maxTargetGlucose?.toString() || "");

    // Reset meal times (convert minutes to time strings)
    setBreakfastStart(
      profile.mealTimeBreakfastStart ? minutesToTime(profile.mealTimeBreakfastStart) : "",
    );
    setBreakfastEnd(
      profile.mealTimeBreakfastEnd ? minutesToTime(profile.mealTimeBreakfastEnd) : "",
    );
    setLunchStart(profile.mealTimeLunchStart ? minutesToTime(profile.mealTimeLunchStart) : "");
    setLunchEnd(profile.mealTimeLunchEnd ? minutesToTime(profile.mealTimeLunchEnd) : "");
    setDinnerStart(profile.mealTimeDinnerStart ? minutesToTime(profile.mealTimeDinnerStart) : "");
    setDinnerEnd(profile.mealTimeDinnerEnd ? minutesToTime(profile.mealTimeDinnerEnd) : "");

    // Reset adjustment flag
    setIsAdjusting(false);

    // Update prev refs to numeric profile meal times
    prevBreakfastStart.current = profile.mealTimeBreakfastStart || null;
    prevBreakfastEnd.current = profile.mealTimeBreakfastEnd || null;
    prevLunchStart.current = profile.mealTimeLunchStart || null;
    prevLunchEnd.current = profile.mealTimeLunchEnd || null;
    prevDinnerStart.current = profile.mealTimeDinnerStart || null;
    prevDinnerEnd.current = profile.mealTimeDinnerEnd || null;
  }, [patientId, profile]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return (
      icRatioBreakfast !== (profile.icRatioBreakfast?.toString() || "") ||
      icRatioLunch !== (profile.icRatioLunch?.toString() || "") ||
      icRatioDinner !== (profile.icRatioDinner?.toString() || "") ||
      insulinSensitivityFactor !== (profile.insulinSensitivityFactor?.toString() || "") ||
      diaHours !== (profile.diaHours?.toString() || "") ||
      targetGlucose !== (profile.targetGlucose?.toString() || "") ||
      minTargetGlucose !== (profile.minTargetGlucose?.toString() || "") ||
      maxTargetGlucose !== (profile.maxTargetGlucose?.toString() || "") ||
      breakfastStart !==
        (profile.mealTimeBreakfastStart ? minutesToTime(profile.mealTimeBreakfastStart) : "") ||
      breakfastEnd !==
        (profile.mealTimeBreakfastEnd ? minutesToTime(profile.mealTimeBreakfastEnd) : "") ||
      lunchStart !==
        (profile.mealTimeLunchStart ? minutesToTime(profile.mealTimeLunchStart) : "") ||
      lunchEnd !== (profile.mealTimeLunchEnd ? minutesToTime(profile.mealTimeLunchEnd) : "") ||
      dinnerStart !==
        (profile.mealTimeDinnerStart ? minutesToTime(profile.mealTimeDinnerStart) : "") ||
      dinnerEnd !== (profile.mealTimeDinnerEnd ? minutesToTime(profile.mealTimeDinnerEnd) : "")
    );
  };

  // Auto-adjust adjacent meal times to ensure 24-hour coverage without gaps
  useEffect(() => {
    if (
      isAdjusting ||
      !breakfastStart ||
      !breakfastEnd ||
      !lunchStart ||
      !lunchEnd ||
      !dinnerStart ||
      !dinnerEnd
    ) {
      // Update refs even if we're not adjusting
      if (breakfastStart) prevBreakfastStart.current = timeToMinutes(breakfastStart);
      if (breakfastEnd) prevBreakfastEnd.current = timeToMinutes(breakfastEnd);
      if (lunchStart) prevLunchStart.current = timeToMinutes(lunchStart);
      if (lunchEnd) prevLunchEnd.current = timeToMinutes(lunchEnd);
      if (dinnerStart) prevDinnerStart.current = timeToMinutes(dinnerStart);
      if (dinnerEnd) prevDinnerEnd.current = timeToMinutes(dinnerEnd);
      return;
    }

    const breakfastStartMin = timeToMinutes(breakfastStart);
    const breakfastEndMin = timeToMinutes(breakfastEnd);
    const lunchStartMin = timeToMinutes(lunchStart);
    const lunchEndMin = timeToMinutes(lunchEnd);
    const dinnerStartMin = timeToMinutes(dinnerStart);
    const dinnerEndMin = timeToMinutes(dinnerEnd);

    // Check what changed and adjust accordingly
    const breakfastStartChanged =
      prevBreakfastStart.current !== null && breakfastStartMin !== prevBreakfastStart.current;
    const breakfastEndChanged =
      prevBreakfastEnd.current !== null && breakfastEndMin !== prevBreakfastEnd.current;
    const lunchStartChanged =
      prevLunchStart.current !== null && lunchStartMin !== prevLunchStart.current;
    const lunchEndChanged = prevLunchEnd.current !== null && lunchEndMin !== prevLunchEnd.current;
    const dinnerStartChanged =
      prevDinnerStart.current !== null && dinnerStartMin !== prevDinnerStart.current;
    const dinnerEndChanged =
      prevDinnerEnd.current !== null && dinnerEndMin !== prevDinnerEnd.current;

    // Only adjust if something actually changed
    if (
      !breakfastStartChanged &&
      !breakfastEndChanged &&
      !lunchStartChanged &&
      !lunchEndChanged &&
      !dinnerStartChanged &&
      !dinnerEndChanged
    ) {
      return;
    }

    setIsAdjusting(true);

    // Update refs with current values first
    prevBreakfastStart.current = breakfastStartMin;
    prevBreakfastEnd.current = breakfastEndMin;
    prevLunchStart.current = lunchStartMin;
    prevLunchEnd.current = lunchEndMin;
    prevDinnerStart.current = dinnerStartMin;
    prevDinnerEnd.current = dinnerEndMin;

    // Adjust breakfast start -> adjust dinner end (previous meal, may cross midnight)
    if (breakfastStartChanged) {
      const newDinnerEndMin = breakfastStartMin;
      setDinnerEnd(minutesToTime(newDinnerEndMin));
      setTimeout(() => {
        prevDinnerEnd.current = newDinnerEndMin;
      }, 0);
    }

    // Adjust breakfast end -> adjust lunch start (next meal)
    if (breakfastEndChanged) {
      const newLunchStartMin = breakfastEndMin;
      setLunchStart(minutesToTime(newLunchStartMin));
      setTimeout(() => {
        prevLunchStart.current = newLunchStartMin;
      }, 0);
    }

    // Adjust lunch start -> adjust breakfast end (previous meal)
    if (lunchStartChanged) {
      const newBreakfastEndMin = lunchStartMin;
      setBreakfastEnd(minutesToTime(newBreakfastEndMin));
      setTimeout(() => {
        prevBreakfastEnd.current = newBreakfastEndMin;
      }, 0);
    }

    // Adjust lunch end -> adjust dinner start (next meal)
    if (lunchEndChanged) {
      const newDinnerStartMin = lunchEndMin;
      setDinnerStart(minutesToTime(newDinnerStartMin));
      setTimeout(() => {
        prevDinnerStart.current = newDinnerStartMin;
      }, 0);
    }

    // Adjust dinner start -> adjust lunch end (previous meal)
    if (dinnerStartChanged) {
      const newLunchEndMin = dinnerStartMin;
      setLunchEnd(minutesToTime(newLunchEndMin));
      setTimeout(() => {
        prevLunchEnd.current = newLunchEndMin;
      }, 0);
    }

    // Adjust dinner end -> adjust breakfast start (next meal, may cross midnight)
    if (dinnerEndChanged) {
      const newBreakfastStartMin = dinnerEndMin;
      setBreakfastStart(minutesToTime(newBreakfastStartMin));
      setTimeout(() => {
        prevBreakfastStart.current = newBreakfastStartMin;
      }, 0);
    }

    // Allow React to process state updates before clearing the flag
    setTimeout(() => {
      setIsAdjusting(false);
    }, 0);
  }, [breakfastStart, breakfastEnd, lunchStart, lunchEnd, dinnerStart, dinnerEnd, isAdjusting]);

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: UpdatePatientProfileData) => {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/doctor-patients/${patientId}/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientProfile", patientId] });
      alert("Parámetros de tratamiento actualizados correctamente");
    },
    onError: (error) => {
      console.error("Profile update error:", error);
      alert("No se pudo actualizar los parámetros de tratamiento");
    },
  });

  const handleSave = () => {
    // Validate Insulin Parameters
    const icBreakfastNum = validateNumber(icRatioBreakfast, 1, 30);
    const icLunchNum = validateNumber(icRatioLunch, 1, 30);
    const icDinnerNum = validateNumber(icRatioDinner, 1, 30);
    const sensitivityNum = validateNumber(insulinSensitivityFactor, 10, 200);
    const diaNum = validateNumber(diaHours, 2, 8);

    if (icBreakfastNum === null) {
      alert("Ratio IC Desayuno debe estar entre 1 y 30");
      return;
    }
    if (icLunchNum === null) {
      alert("Ratio IC Almuerzo debe estar entre 1 y 30");
      return;
    }
    if (icDinnerNum === null) {
      alert("Ratio IC Cena debe estar entre 1 y 30");
      return;
    }
    if (sensitivityNum === null) {
      alert("Factor de Sensibilidad debe estar entre 10 y 200");
      return;
    }
    if (diaNum === null) {
      alert("Duración de Acción de Insulina debe estar entre 2 y 8 horas");
      return;
    }

    // Validate Target Glucose Ranges
    const targetNum = targetGlucose ? validateInteger(targetGlucose, 70, 180) : undefined;
    const minTargetNum = validateInteger(minTargetGlucose, 70, 150);
    const maxTargetNum = validateInteger(maxTargetGlucose, 80, 200);

    if (targetNum === null && targetGlucose) {
      alert("Glucosa Objetivo debe estar entre 70 y 180 mg/dL");
      return;
    }
    if (minTargetNum === null) {
      alert("Glucosa Objetivo Mínima debe estar entre 70 y 150 mg/dL");
      return;
    }
    if (maxTargetNum === null) {
      alert("Glucosa Objetivo Máxima debe estar entre 80 y 200 mg/dL");
      return;
    }
    if (minTargetNum >= maxTargetNum) {
      alert("La glucosa objetivo mínima debe ser menor que la máxima");
      return;
    }

    // Validate Meal Times
    if (
      !breakfastStart ||
      !breakfastEnd ||
      !lunchStart ||
      !lunchEnd ||
      !dinnerStart ||
      !dinnerEnd
    ) {
      alert("Por favor completa todos los horarios de comidas");
      return;
    }

    const breakfastStartMinutes = timeToMinutes(breakfastStart);
    const breakfastEndMinutes = timeToMinutes(breakfastEnd);
    const lunchStartMinutes = timeToMinutes(lunchStart);
    const lunchEndMinutes = timeToMinutes(lunchEnd);
    const dinnerStartMinutes = timeToMinutes(dinnerStart);
    const dinnerEndMinutes = timeToMinutes(dinnerEnd);

    // Validate time ranges
    if (breakfastStartMinutes >= breakfastEndMinutes) {
      alert("La hora de inicio de desayuno debe ser anterior a la hora de fin");
      return;
    }
    if (lunchStartMinutes >= lunchEndMinutes) {
      alert("La hora de inicio de almuerzo debe ser anterior a la hora de fin");
      return;
    }
    // Dinner can cross midnight, so if end is before start, it's valid (crosses midnight)
    if (
      dinnerStartMinutes >= dinnerEndMinutes &&
      dinnerEndMinutes >= 0 &&
      dinnerStartMinutes < 1439
    ) {
      // This is valid - dinner crosses midnight
    } else if (dinnerStartMinutes >= dinnerEndMinutes) {
      alert("Por favor verifica los horarios de cena");
      return;
    }

    // Prepare update data
    const updateData: UpdatePatientProfileData = {
      icRatioBreakfast: icBreakfastNum,
      icRatioLunch: icLunchNum,
      icRatioDinner: icDinnerNum,
      insulinSensitivityFactor: sensitivityNum,
      diaHours: diaNum,
      targetGlucose: targetNum ?? undefined,
      minTargetGlucose: minTargetNum,
      maxTargetGlucose: maxTargetNum,
      mealTimeBreakfastStart: breakfastStartMinutes,
      mealTimeBreakfastEnd: breakfastEndMinutes,
      mealTimeLunchStart: lunchStartMinutes,
      mealTimeLunchEnd: lunchEndMinutes,
      mealTimeDinnerStart: dinnerStartMinutes,
      mealTimeDinnerEnd: dinnerEndMinutes,
    };

    updateProfile.mutate(updateData);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Parámetros de Tratamiento</h2>

      <div className="space-y-6">
        {/* Sensitivity and Duration */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Factor de Sensibilidad</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm text-gray-500 mb-2">
                Factor de Sensibilidad (mg/dL/U)
              </label>
              <input
                type="number"
                step="0.1"
                min="10"
                max="200"
                value={insulinSensitivityFactor}
                onChange={(e) => setInsulinSensitivityFactor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="50"
              />
              <p className="text-xs text-gray-400 mt-1">
                Reducción de glucosa en mg/dL por 1 unidad de insulina
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm text-gray-500 mb-2">Duración de Acción (DIA)</label>
              <input
                type="number"
                step="0.1"
                min="2"
                max="8"
                value={diaHours}
                onChange={(e) => setDiaHours(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="4"
              />
              <p className="text-xs text-gray-400 mt-1">
                Tiempo que la insulina permanece activa (horas)
              </p>
            </div>
          </div>
        </div>

        {/* Target Glucose Range */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Rango Objetivo de Glucosa</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm text-gray-500 mb-2">
                Objetivo para correcciones (mg/dL)
              </label>
              <input
                type="number"
                min="70"
                max="180"
                value={targetGlucose}
                onChange={(e) => setTargetGlucose(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="100"
              />
              <p className="text-xs text-gray-400 mt-1">
                Valor objetivo de glucosa al corregir (opcional)
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm text-gray-500 mb-2">Mínimo (mg/dL)</label>
              <input
                type="number"
                min="70"
                max="150"
                value={minTargetGlucose}
                onChange={(e) => setMinTargetGlucose(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="80"
              />
              <p className="text-xs text-gray-400 mt-1">Límite inferior del rango objetivo</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm text-gray-500 mb-2">Máximo (mg/dL)</label>
              <input
                type="number"
                min="80"
                max="200"
                value={maxTargetGlucose}
                onChange={(e) => setMaxTargetGlucose(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="140"
              />
              <p className="text-xs text-gray-400 mt-1">Límite superior del rango objetivo</p>
            </div>
          </div>
        </div>

        {/* Insulin Parameters */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Ratios de Insulina</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm text-gray-500 mb-2">Desayuno (g/U)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="30"
                value={icRatioBreakfast}
                onChange={(e) => setIcRatioBreakfast(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="15"
              />
              <p className="text-xs text-gray-400 mt-1">
                Gramos de carbohidratos por 1 unidad de insulina
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm text-gray-500 mb-2">Almuerzo (g/U)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="30"
                value={icRatioLunch}
                onChange={(e) => setIcRatioLunch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="12"
              />
              <p className="text-xs text-gray-400 mt-1">
                Gramos de carbohidratos por 1 unidad de insulina
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm text-gray-500 mb-2">Cena (g/U)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="30"
                value={icRatioDinner}
                onChange={(e) => setIcRatioDinner(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="10"
              />
              <p className="text-xs text-gray-400 mt-1">
                Gramos de carbohidratos por 1 unidad de insulina
              </p>
            </div>
          </div>
        </div>

        {/* Meal Times */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
            Horarios de Comidas
            <Clock className="w-4 h-4 text-gray-500" />
          </h3>
          <div className="space-y-4">
            {/* Breakfast */}
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-3">Desayuno</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Hora de Inicio</label>
                  <input
                    type="time"
                    value={breakfastStart}
                    onChange={(e) => setBreakfastStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Hora de Fin</label>
                  <input
                    type="time"
                    value={breakfastEnd}
                    onChange={(e) => setBreakfastEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Lunch */}
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-3">Almuerzo</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Hora de Inicio</label>
                  <input
                    type="time"
                    value={lunchStart}
                    onChange={(e) => setLunchStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Hora de Fin</label>
                  <input
                    type="time"
                    value={lunchEnd}
                    onChange={(e) => setLunchEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Dinner */}
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-3">Cena</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Hora de Inicio</label>
                  <input
                    type="time"
                    value={dinnerStart}
                    onChange={(e) => setDinnerStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Hora de Fin</label>
                  <input
                    type="time"
                    value={dinnerEnd}
                    onChange={(e) => setDinnerEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Los horarios se ajustan automáticamente para cubrir las 24 horas del día sin
                solapamientos
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {hasUnsavedChanges() && (
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
