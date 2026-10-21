"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "../page";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAcknowledgeBatch,
  useDashboardSummary,
  useGlucoseEvolution,
  useInsulinStats,
  useMealStats,
  useRecentAlerts,
} from "@/hooks/useDashboard";
import { invalidateAlertQueries } from "@/lib/alert-utils";
import {
  createAlert,
  createDashboardSummary,
  createGlucoseEvolution,
  createInsulinStats,
  createMealStats,
  createUser,
} from "@/test/factories";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: jest.fn(),
}));

jest.mock("@/hooks/useDashboard", () => ({
  useDashboardSummary: jest.fn(),
  useGlucoseEvolution: jest.fn(),
  useInsulinStats: jest.fn(),
  useMealStats: jest.fn(),
  useRecentAlerts: jest.fn(),
  useAcknowledgeBatch: jest.fn(),
}));

jest.mock("@/lib/alert-utils", () => ({
  invalidateAlertQueries: jest.fn(),
}));

jest.mock("@/components/protected-route", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/dashboard/Sidebar", () => ({
  Sidebar: () => <div>Sidebar</div>,
}));

jest.mock("@/components/dashboard/Header", () => ({
  Header: () => <div>Header</div>,
}));

jest.mock("@/components/dashboard/SummaryCard", () => ({
  SummaryCard: ({ title, value }: { title: string; value: string | number }) => (
    <div>
      <span>{title}</span>
      <span>{String(value)}</span>
    </div>
  ),
}));

jest.mock("@/components/dashboard/GlucoseChart", () => ({
  GlucoseChart: ({ days }: { days: number }) => <div>Glucose Chart {days}</div>,
}));

jest.mock("@/components/dashboard/InsulinStatsCard", () => ({
  InsulinStatsCard: () => <div>Insulin Stats</div>,
}));

jest.mock("@/components/dashboard/MealStatsCard", () => ({
  MealStatsCard: () => <div>Meal Stats</div>,
}));

jest.mock("@/components/dashboard/RecentAlerts", () => ({
  RecentAlerts: ({
    alerts,
    onAlertUpdate,
  }: {
    alerts: Array<{ id: string }>;
    onAlertUpdate: () => void;
  }) => (
    <div>
      <span>Recent Alerts {alerts.length}</span>
      <button onClick={onAlertUpdate}>refresh alerts</button>
    </div>
  ),
}));

jest.mock("@/components/dashboard/DashboardPeriodSelector", () => ({
  DashboardPeriodSelector: ({
    selectedDays,
    onChange,
  }: {
    selectedDays: number;
    onChange: (value: number) => void;
  }) => <button onClick={() => onChange(30)}>Periodo {selectedDays}</button>,
}));

jest.mock("@/components/dashboard/AlertsSummaryCard", () => ({
  AlertsSummaryCard: ({
    criticalAlerts,
    onAcknowledgeAll,
  }: {
    criticalAlerts: number;
    onAcknowledgeAll: () => void;
  }) => (
    <div>
      <span>Critical Alerts {criticalAlerts}</span>
      <button onClick={onAcknowledgeAll}>ack all</button>
    </div>
  ),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;
const mockUseDashboardSummary = useDashboardSummary as jest.MockedFunction<
  typeof useDashboardSummary
>;
const mockUseGlucoseEvolution = useGlucoseEvolution as jest.MockedFunction<
  typeof useGlucoseEvolution
>;
const mockUseInsulinStats = useInsulinStats as jest.MockedFunction<typeof useInsulinStats>;
const mockUseMealStats = useMealStats as jest.MockedFunction<typeof useMealStats>;
const mockUseRecentAlerts = useRecentAlerts as jest.MockedFunction<typeof useRecentAlerts>;
const mockUseAcknowledgeBatch = useAcknowledgeBatch as jest.MockedFunction<
  typeof useAcknowledgeBatch
>;
const mockInvalidateAlertQueries = invalidateAlertQueries as jest.MockedFunction<
  typeof invalidateAlertQueries
>;

describe("DashboardPage", () => {
  const queryClient = { invalidateQueries: jest.fn(), refetchQueries: jest.fn() };
  const mutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseAuth.mockReturnValue({
      user: createUser(),
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    });
    mockUseQueryClient.mockReturnValue(queryClient as ReturnType<typeof useQueryClient>);
    mockUseDashboardSummary.mockReturnValue({
      data: createDashboardSummary(),
      isLoading: false,
    } as ReturnType<typeof useDashboardSummary>);
    mockUseGlucoseEvolution.mockReturnValue({
      data: createGlucoseEvolution(),
      isLoading: false,
    } as ReturnType<typeof useGlucoseEvolution>);
    mockUseInsulinStats.mockReturnValue({
      data: createInsulinStats(),
      isLoading: false,
    } as ReturnType<typeof useInsulinStats>);
    mockUseMealStats.mockReturnValue({
      data: createMealStats(),
      isLoading: false,
    } as ReturnType<typeof useMealStats>);
    mockUseRecentAlerts.mockReturnValue({
      data: [createAlert()],
      isLoading: false,
    } as ReturnType<typeof useRecentAlerts>);
    mockUseAcknowledgeBatch.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as ReturnType<typeof useAcknowledgeBatch>);
  });

  it("uses the persisted dashboard period and renders loaded data", () => {
    localStorage.setItem("dashboardPeriodDays", "14");

    render(<DashboardPage />);

    expect(screen.getByText(/bienvenido de nuevo, ada lovelace/i)).toBeInTheDocument();
    expect(mockUseDashboardSummary).toHaveBeenCalledWith(14);
    expect(screen.getByText("Periodo 14")).toBeInTheDocument();
    expect(screen.getByText("Critical Alerts 3")).toBeInTheDocument();
    expect(screen.getByText("Recent Alerts 1")).toBeInTheDocument();
  });

  it("defaults to 7 days, persists selector changes and invalidates alert queries", async () => {
    render(<DashboardPage />);

    expect(mockUseDashboardSummary).toHaveBeenCalledWith(7);
    expect(localStorage.getItem("dashboardPeriodDays")).toBe("7");

    fireEvent.click(screen.getByText("Periodo 7"));

    await waitFor(() => {
      expect(localStorage.getItem("dashboardPeriodDays")).toBe("30");
    });

    fireEvent.click(screen.getByText("refresh alerts"));
    expect(mockInvalidateAlertQueries).toHaveBeenCalledWith(queryClient);
  });

  it("acknowledges all critical alerts when a token is available", async () => {
    localStorage.setItem("accessToken", "stored-access");
    mutateAsync.mockResolvedValue({ acknowledgedCount: 2 });

    render(<DashboardPage />);

    fireEvent.click(screen.getByText("ack all"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        token: "stored-access",
        acknowledgeAll: true,
      });
    });
  });

  it("shows loading placeholders while the dashboard data is loading", () => {
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useDashboardSummary>);
    mockUseGlucoseEvolution.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useGlucoseEvolution>);
    mockUseInsulinStats.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useInsulinStats>);
    mockUseMealStats.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useMealStats>);
    mockUseRecentAlerts.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useRecentAlerts>);

    render(<DashboardPage />);

    expect(screen.getAllByText("Cargando...").length).toBeGreaterThan(0);
    expect(screen.getByText("Cargando alertas...")).toBeInTheDocument();
  });
});
