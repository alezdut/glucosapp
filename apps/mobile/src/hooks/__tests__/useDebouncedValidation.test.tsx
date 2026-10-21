import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { useDebouncedValidation } from "../useDebouncedValidation";
import { validateGlucose } from "@glucosapp/utils";

jest.useFakeTimers();

function Probe({ value }: { value: number | undefined }) {
  const { validation, isValidating } = useDebouncedValidation(value, validateGlucose, 1000);

  return (
    <div>
      <span data-testid="validation">{String(validation.isValid)}</span>
      <span data-testid="validating">{String(isValidating)}</span>
    </div>
  );
}

describe("useDebouncedValidation", () => {
  it("validates immediately when correcting an error", () => {
    const { rerender } = render(<Probe value={undefined} />);

    rerender(<Probe value={10} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("validation").textContent).toBe("false");

    rerender(<Probe value={120} />);

    expect(screen.getByTestId("validation").textContent).toBe("true");
  });

  it("uses debounce for new values", () => {
    const { rerender } = render(<Probe value={undefined} />);

    rerender(<Probe value={120} />);

    expect(screen.getByTestId("validating").textContent).toBe("true");

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("validation").textContent).toBe("true");
    expect(screen.getByTestId("validating").textContent).toBe("false");
  });
});
