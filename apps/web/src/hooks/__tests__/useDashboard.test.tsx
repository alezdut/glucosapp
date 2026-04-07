import { act, renderHook, waitFor } from "@testing-library/react";
import { useDashboardSummary, useAlerts, useAcknowledgeBatch } from "@/hooks/useDashboard";
import { createDashboardSummary, createAlert, createUser } from "@/test/factories";
import { createProvidersWrapper } from "@/test/test-utils";

const mockUseAuth = jest.fn();
const mockGetDashboardSummary = jest.fn();
const mockGetAlerts = jest.fn();
const mockAcknowledgeBatchAlerts = jest.fn();
const mockInvalidateAlertQueries = jest.fn();

jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/lib/dashboard-api", () => ({
  getDashboardSummary: (...args: unknown[]) => mockGetDashboardSummary(...args),
  getAlerts: (...args: unknown[]) => mockGetAlerts(...args),
  acknowledgeBatchAlerts: (...args: unknown[]) => mockAcknowledgeBatchAlerts(...args),
  getGlucoseEvolution: jest.fn(),
  getInsulinStats: jest.fn(),
  getMealStats: jest.fn(),
  getRecentAlerts: jest.fn(),
  getUnacknowledgedAlerts: jest.fn(),
}));

jest.mock("@/lib/alert-utils", () => ({
  invalidateAlertQueries: (...args: unknown[]) => mockInvalidateAlertQueries(...args),
}));

describe("useDashboard hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseAuth.mockReturnValue({ user: createUser() });
  });

  it("does not run dashboard queries when the user is not authenticated", async () => {
    mockUseAuth.mockReturnValue({ user: null });
    localStorage.setItem("accessToken", "stored-access");
    const { Wrapper } = createProvidersWrapper();

    renderHook(() => useDashboardSummary(7), { wrapper: Wrapper });

    await waitFor(() => {
      expect(mockGetDashboardSummary).not.toHaveBeenCalled();
    });
  });

  it("fetches dashboard summary with the access token and stores the expected query key", async () => {
    localStorage.setItem("accessToken", "stored-access");
    mockGetDashboardSummary.mockResolvedValue(createDashboardSummary());
    const { Wrapper, queryClient } = createProvidersWrapper();

    const { result } = renderHook(() => useDashboardSummary(7), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(createDashboardSummary());
    });

    expect(mockGetDashboardSummary).toHaveBeenCalledWith("stored-access", 7);
    expect(
      queryClient.getQueryCache().find({ queryKey: ["dashboard", "summary", 7] }),
    ).toBeTruthy();
  });

  it("passes alert filters through to the alert query", async () => {
    localStorage.setItem("accessToken", "stored-access");
    const alerts = [createAlert()];
    mockGetAlerts.mockResolvedValue(alerts);
    const { Wrapper } = createProvidersWrapper();

    const { result } = renderHook(
      () => useAlerts({ acknowledged: false, severity: ["HIGH"], limit: 5 }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(alerts);
    });

    expect(mockGetAlerts).toHaveBeenCalledWith("stored-access", {
      acknowledged: false,
      severity: ["HIGH"],
      limit: 5,
    });
  });

  it("acknowledges alerts in batch and invalidates related queries", async () => {
    mockAcknowledgeBatchAlerts.mockResolvedValue({ acknowledgedCount: 2 });
    const { Wrapper } = createProvidersWrapper();
    const { result } = renderHook(() => useAcknowledgeBatch(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        token: "stored-access",
        alertIds: ["alert-1", "alert-2"],
      });
    });

    expect(mockAcknowledgeBatchAlerts).toHaveBeenCalledWith("stored-access", {
      alertIds: ["alert-1", "alert-2"],
      acknowledgeAll: undefined,
    });
    expect(mockInvalidateAlertQueries).toHaveBeenCalledTimes(1);
  });
});
