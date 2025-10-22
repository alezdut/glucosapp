import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createApiClient } from "../lib/api";
import { DoseResult } from "@glucosapp/types";

import { useDebounce } from "./useDebounce";

interface UseRealTimeCorrectionCalculationProps {
  glucose: number;
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
 * Hook for real-time correction dose calculation with debouncing
 */
export const useRealTimeCorrectionCalculation = ({
  glucose,
  enabled,
  debounceDelay = 1000,
  targetGlucose,
  context,
}: UseRealTimeCorrectionCalculationProps) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculationTime, setLastCalculationTime] = useState<number>(0);

  // Debounce the calculation parameters
  const debouncedGlucose = useDebounce(glucose, debounceDelay);
  const debouncedTargetGlucose = useDebounce(targetGlucose, debounceDelay);
  const debouncedContext = useDebounce(context, debounceDelay);

  // Check if we have valid data for calculation
  const hasValidData =
    debouncedGlucose > 0 &&
    debouncedTargetGlucose !== undefined &&
    debouncedTargetGlucose > 0 &&
    enabled;

  // Query for correction calculation
  const {
    data: doseResult,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "correction-calculation",
      debouncedGlucose,
      debouncedTargetGlucose,
      debouncedContext,
    ],
    queryFn: async (): Promise<DoseResult> => {
      setLastCalculationTime(Date.now());

      const client = createApiClient();
      const response = await client.POST("/v1/insulin-calculation/calculate-correction", {
        glucose: debouncedGlucose,
        carbohydrates: 0,
        mealType: "CORRECTION",
        targetGlucose: debouncedTargetGlucose,
        context: debouncedContext,
      });
      console.log("correction response", response);
      if (response.data) {
        // Backend returns DoseResult directly for correction endpoint
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
  }, [glucose, enabled, hasValidData, targetGlucose, context]);

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
    isCalculating: isCalculating && isLoading, // Only show calculating when actively loading
    lastCalculationTime,
    hasValidData,
    refetch,
  };
};
