import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { act } from "react";
import { screen, waitFor } from "@testing-library/react";
import { useRealTimeCorrectionCalculation } from "../useRealTimeCorrectionCalculation";
import { renderMobile } from "../../../test/render-mobile";
import * as api from "../../lib/api";
import { mobileFixtures } from "../../../test/fixtures";

jest.useFakeTimers();

jest.mock("../../lib/api", () => ({
  createApiClient: jest.fn(),
}));

const mockCreateApiClient = api.createApiClient as jest.MockedFunction<typeof api.createApiClient>;

function Probe(props: React.ComponentProps<typeof useRealTimeCorrectionCalculation>) {
  const result = useRealTimeCorrectionCalculation(props);

  return (
    <div>
      <span data-testid="has-valid-data">{String(result.hasValidData)}</span>
      <span data-testid="is-loading">{String(result.isLoading)}</span>
      <span data-testid="dose">{result.doseResult?.dose ?? "none"}</span>
    </div>
  );
}

describe("useRealTimeCorrectionCalculation", () => {
  const mockPost = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateApiClient.mockReturnValue({
      POST: mockPost,
    } as never);
  });

  it("stays idle when the target glucose is invalid or disabled", () => {
    renderMobile(<Probe glucose={160} enabled={false} debounceDelay={200} targetGlucose={180} />);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByTestId("has-valid-data").textContent).toBe("false");
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("calculates a correction dose when valid inputs are present", async () => {
    mockPost.mockResolvedValue({ data: mobileFixtures.correctionDose });

    renderMobile(<Probe glucose={180} enabled={true} debounceDelay={200} targetGlucose={110} />);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/v1/insulin-calculation/calculate-correction", {
        glucose: 180,
        carbohydrates: 0,
        mealType: "CORRECTION",
        targetGlucose: 110,
        context: undefined,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("dose").textContent).toBe("2");
    });
  });
});
