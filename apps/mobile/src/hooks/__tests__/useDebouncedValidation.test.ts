import { renderHook, act } from "@testing-library/react-hooks";
import { useDebouncedValidation } from "../useDebouncedValidation";
import { validateGlucose } from "../../utils/validation";

// Mock timers
jest.useFakeTimers();

describe("useDebouncedValidation", () => {
  it("should validate immediately when correcting an error", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValidation(value, validateGlucose, 1000),
      { initialProps: { value: undefined } },
    );

    // First, set an invalid value
    act(() => {
      rerender({ value: 10 }); // Invalid glucose level
    });

    // Fast-forward time to trigger validation
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should have error
    expect(result.current.validation.isValid).toBe(false);

    // Now correct the value - should validate immediately
    act(() => {
      rerender({ value: 120 }); // Valid glucose level
    });

    // Should validate immediately without waiting
    expect(result.current.validation.isValid).toBe(true);
  });

  it("should use debounce for new values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValidation(value, validateGlucose, 1000),
      { initialProps: { value: undefined } },
    );

    // Set a new value
    act(() => {
      rerender({ value: 120 });
    });

    // Should not be validated yet (debounce)
    expect(result.current.isValidating).toBe(true);

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Now should be validated
    expect(result.current.validation.isValid).toBe(true);
    expect(result.current.isValidating).toBe(false);
  });
});
