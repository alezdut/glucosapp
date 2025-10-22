import { useState, useEffect } from "react";
import type { ValidationResult } from "../utils/validation";

/**
 * Hook for debounced validation with immediate validation on error correction
 * Validates input after user stops typing for a specified delay,
 * but validates immediately if the user corrects a previous error
 */
export const useDebouncedValidation = (
  value: number | undefined,
  validationFn: (value: number | undefined) => ValidationResult,
  delay: number = 1000, // 1 second default delay
) => {
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidatedValue, setLastValidatedValue] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Don't validate if value is undefined or empty
    if (value === undefined) {
      setValidation({ isValid: true });
      setIsValidating(false);
      setLastValidatedValue(undefined);
      return;
    }

    // If user is correcting a previous error, validate immediately
    if (!validation.isValid && value !== lastValidatedValue) {
      const result = validationFn(value);
      setValidation(result);
      setLastValidatedValue(value);
      return;
    }

    // Normal debounced validation for new values
    if (value !== lastValidatedValue) {
      setIsValidating(true);

      const timeoutId = setTimeout(() => {
        const result = validationFn(value);
        setValidation(result);
        setIsValidating(false);
        setLastValidatedValue(value);
      }, delay);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [value, validationFn, delay, validation.isValid, lastValidatedValue]);

  return {
    validation,
    isValidating,
  };
};

/**
 * Hook for debounced validation with immediate reset on new input
 */
export const useDebouncedValidationWithReset = (
  value: number | undefined,
  validationFn: (value: number | undefined) => ValidationResult,
  delay: number = 1000,
) => {
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    // Reset validation immediately when value changes
    setValidation({ isValid: true });
    setIsValidating(false);

    // Don't validate if value is undefined or empty
    if (value === undefined) {
      return;
    }

    setIsValidating(true);

    const timeoutId = setTimeout(() => {
      const result = validationFn(value);
      setValidation(result);
      setIsValidating(false);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, validationFn, delay]);

  return {
    validation,
    isValidating,
  };
};
