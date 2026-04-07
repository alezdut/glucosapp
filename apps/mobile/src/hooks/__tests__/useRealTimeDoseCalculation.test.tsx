import React from "react";
import { act } from "react";
import { screen, waitFor } from "@testing-library/react";
import { useRealTimeDoseCalculation } from "../useRealTimeDoseCalculation";
import { renderMobile } from "../../../test/render-mobile";
import * as api from "../../lib/api";
import { mobileFixtures } from "../../../test/fixtures";

jest.useFakeTimers();

jest.mock("../../lib/api", () => ({
  createApiClient: jest.fn(),
}));

const mockCreateApiClient = api.createApiClient as jest.MockedFunction<typeof api.createApiClient>;

function Probe(props: React.ComponentProps<typeof useRealTimeDoseCalculation>) {
  const result = useRealTimeDoseCalculation(props);

  return (
    <div>
      <span data-testid="has-valid-data">{String(result.hasValidData)}</span>
      <span data-testid="is-loading">{String(result.isLoading)}</span>
      <span data-testid="dose">{result.doseResult?.dose ?? "none"}</span>
    </div>
  );
}

describe("useRealTimeDoseCalculation", () => {
  const mockPost = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateApiClient.mockReturnValue({
      POST: mockPost,
    } as never);
  });

  it("does not call the API when the input data is invalid", () => {
    renderMobile(
      <Probe
        glucose={30}
        carbohydrates={20}
        mealType="LUNCH"
        enabled={true}
        debounceDelay={200}
        targetGlucose={110}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByTestId("has-valid-data").textContent).toBe("false");
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("calculates meal dose after the debounce window with valid data", async () => {
    mockPost.mockResolvedValue({ data: mobileFixtures.mealDose });

    renderMobile(
      <Probe
        glucose={180}
        carbohydrates={36}
        mealType="LUNCH"
        enabled={true}
        debounceDelay={200}
        targetGlucose={110}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/v1/insulin-calculation/calculate-meal-dose", {
        glucose: 180,
        carbohydrates: 36,
        mealType: "LUNCH",
        targetGlucose: 110,
        context: undefined,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("dose").textContent).toBe("4.5");
    });
  });
});
