import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createApiClient } from "../lib/api";
import { DoseResult } from "@glucosapp/types";
import { useDebounce } from "./useDebounce";

interface UseRealTimeDoseCalculationProps {
  glucose: number;
  carbohydrates: number;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "CORRECTION";
  enabled: boolean;
  debounceDelay?: number;
  targetGlucose?: number;
  context?: {
    recentExercise?: boolean;
    alcohol?: boolean;
    illness?: boolean;
    stress?: boolean;
    menstruation?: boolean;
    highFatMeal?: boolean;
    hourOfDay?: number;
  };
}

/**
 * Hook for real-time dose calculation with debouncing
 */
export const useRealTimeDoseCalculation = ({
  glucose,
  carbohydrates,
  mealType,
  enabled,
  debounceDelay = 1000,
  targetGlucose,
  context,
}: UseRealTimeDoseCalculationProps) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculationTime, setLastCalculationTime] = useState<number>(0);

  // Debounce the calculation parameters
  const debouncedGlucose = useDebounce(glucose, debounceDelay);
  const debouncedCarbohydrates = useDebounce(carbohydrates, debounceDelay);
  const debouncedMealType = useDebounce(mealType, debounceDelay);
  const debouncedTargetGlucose = useDebounce(targetGlucose, debounceDelay);

  // Check if we have valid data for calculation
  const hasValidData =
    debouncedGlucose >= 40 && // Backend requires minimum 40 mg/dL
    debouncedGlucose <= 600 && // Backend requires maximum 600 mg/dL
    debouncedCarbohydrates >= 0 &&
    debouncedMealType &&
    (debouncedTargetGlucose === undefined ||
      (debouncedTargetGlucose >= 70 &&
        debouncedTargetGlucose <= 200 &&
        debouncedTargetGlucose <= debouncedGlucose)) && // Target cannot be higher than current glucose
    enabled;

  // Query for dose calculation
  const {
    data: doseResult,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "dose-calculation",
      debouncedGlucose,
      debouncedCarbohydrates,
      debouncedMealType,
      debouncedTargetGlucose,
      context,
    ],
    queryFn: async (): Promise<DoseResult> => {
      setLastCalculationTime(Date.now());
      const client = createApiClient();
      const response = await client.POST("/v1/insulin-calculation/calculate-meal-dose", {
        glucose: debouncedGlucose,
        carbohydrates: debouncedCarbohydrates,
        mealType: debouncedMealType,
        targetGlucose: debouncedTargetGlucose,
        context: context,
      });
      if (response.data) {
        return response.data as DoseResult;
      }

      throw new Error("No data received from API");
    },
    enabled: hasValidData,
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 2,
    retryDelay: 1000,
  });

  // Reset calculation state when parameters change
  useEffect(() => {
    if (enabled && hasValidData) {
      setIsCalculating(true);
    }
  }, [glucose, carbohydrates, mealType, enabled, hasValidData]);

  // Reset calculating state when query completes (success or error)
  useEffect(() => {
    if (!isLoading && (doseResult || error)) {
      setIsCalculating(false);
    }
  }, [isLoading, doseResult, error]);

  return {
    doseResult,
    error,
    isLoading: isLoading || isCalculating,
    isCalculating: isCalculating && isLoading,
    lastCalculationTime,
    hasValidData,
    refetch,
  };
};
