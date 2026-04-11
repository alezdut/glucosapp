import { act, renderHook, waitFor } from "@testing-library/react";
import {
  useAcknowledgeBatch,
  useAlerts,
  useDashboardSummary,
  useGlucoseEvolution,
  useInsulinStats,
  useMealStats,
  useRecentAlerts,
  useUnacknowledgedAlerts,
} from "@/hooks/useDashboard";
import { createDashboardSummary, createAlert, createUser } from "@/test/factories";
import { createProvidersWrapper } from "@/test/test-utils";

const mockUseAuth = jest.fn();
const mockGetDashboardSummary = jest.fn();
const mockGetGlucoseEvolution = jest.fn();
const mockGetInsulinStats = jest.fn();
const mockGetMealStats = jest.fn();
const mockGetRecentAlerts = jest.fn();
const mockGetUnacknowledgedAlerts = jest.fn();
const mockGetAlerts = jest.fn();
const mockAcknowledgeBatchAlerts = jest.fn();
const mockInvalidateAlertQueries = jest.fn();

jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/lib/dashboard-api", () => ({
  getDashboardSummary: (...args: unknown[]) => mockGetDashboardSummary(...args),
  getGlucoseEvolution: (...args: unknown[]) => mockGetGlucoseEvolution(...args),
  getInsulinStats: (...args: unknown[]) => mockGetInsulinStats(...args),
  getMealStats: (...args: unknown[]) => mockGetMealStats(...args),
  getRecentAlerts: (...args: unknown[]) => mockGetRecentAlerts(...args),
  getUnacknowledgedAlerts: (...args: unknown[]) => mockGetUnacknowledgedAlerts(...args),
  getAlerts: (...args: unknown[]) => mockGetAlerts(...args),
  acknowledgeBatchAlerts: (...args: unknown[]) => mockAcknowledgeBatchAlerts(...args),
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

  it("fetches glucose, insulin, meal and alert dashboard widgets with the stored token", async () => {
    localStorage.setItem("accessToken", "stored-access");
    mockGetGlucoseEvolution.mockResolvedValue({ data: [{ date: "2026-04-01" }] });
    mockGetInsulinStats.mockResolvedValue({ averageDose: 18 });
    mockGetMealStats.mockResolvedValue({ totalMeals: 12 });
    mockGetRecentAlerts.mockResolvedValue([createAlert({ id: "recent-1" })]);
    mockGetUnacknowledgedAlerts.mockResolvedValue([createAlert({ id: "pending-1" })]);
    const { Wrapper, queryClient } = createProvidersWrapper();

    const { result: glucoseResult } = renderHook(() => useGlucoseEvolution(14), {
      wrapper: Wrapper,
    });
    const { result: insulinResult } = renderHook(() => useInsulinStats(), {
      wrapper: Wrapper,
    });
    const { result: mealResult } = renderHook(() => useMealStats(15), {
      wrapper: Wrapper,
    });
    const { result: recentResult } = renderHook(() => useRecentAlerts(), {
      wrapper: Wrapper,
    });
    const { result: unackResult } = renderHook(() => useUnacknowledgedAlerts(3), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(glucoseResult.current.data).toEqual({ data: [{ date: "2026-04-01" }] });
      expect(insulinResult.current.data).toEqual({ averageDose: 18 });
      expect(mealResult.current.data).toEqual({ totalMeals: 12 });
      expect(recentResult.current.data).toEqual([expect.objectContaining({ id: "recent-1" })]);
      expect(unackResult.current.data).toEqual([expect.objectContaining({ id: "pending-1" })]);
    });

    expect(mockGetGlucoseEvolution).toHaveBeenCalledWith("stored-access", 14);
    expect(mockGetInsulinStats).toHaveBeenCalledWith("stored-access", 30);
    expect(mockGetMealStats).toHaveBeenCalledWith("stored-access", 15);
    expect(mockGetRecentAlerts).toHaveBeenCalledWith("stored-access", 10);
    expect(mockGetUnacknowledgedAlerts).toHaveBeenCalledWith("stored-access", 3);
    expect(
      queryClient.getQueryCache().find({ queryKey: ["dashboard", "glucose-evolution", 14] }),
    ).toBeTruthy();
    expect(
      queryClient.getQueryCache().find({ queryKey: ["alerts", "unacknowledged", 3] }),
    ).toBeTruthy();
  });

  it("surfaces authentication errors when a token is missing but the user exists", async () => {
    const { Wrapper } = createProvidersWrapper();

    const { result: summaryResult } = renderHook(() => useDashboardSummary(7), {
      wrapper: Wrapper,
    });
    const { result: alertsResult } = renderHook(() => useAlerts({ acknowledged: false }), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(summaryResult.current.error).toEqual(new Error("Not authenticated"));
      expect(alertsResult.current.error).toEqual(new Error("Not authenticated"));
    });

    expect(mockGetDashboardSummary).not.toHaveBeenCalled();
    expect(mockGetAlerts).not.toHaveBeenCalled();
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
