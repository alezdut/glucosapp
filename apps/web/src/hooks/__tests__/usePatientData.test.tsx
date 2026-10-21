"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/contexts/auth-context";
import {
  getPatientGlucoseEvolution,
  getPatientInsulinStats,
  getPatientLogEntries,
  getPatientProfile,
} from "@/lib/dashboard-api";
import {
  usePatientGlucoseEvolution,
  usePatientInsulinStats,
  usePatientLogEntries,
  usePatientProfile,
} from "../usePatientData";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/dashboard-api", () => ({
  getPatientGlucoseEvolution: jest.fn(),
  getPatientInsulinStats: jest.fn(),
  getPatientProfile: jest.fn(),
  getPatientLogEntries: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetPatientGlucoseEvolution = getPatientGlucoseEvolution as jest.MockedFunction<
  typeof getPatientGlucoseEvolution
>;
const mockGetPatientInsulinStats = getPatientInsulinStats as jest.MockedFunction<
  typeof getPatientInsulinStats
>;
const mockGetPatientProfile = getPatientProfile as jest.MockedFunction<typeof getPatientProfile>;
const mockGetPatientLogEntries = getPatientLogEntries as jest.MockedFunction<
  typeof getPatientLogEntries
>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "PatientDataHookWrapper";
  return Wrapper;
};

describe("usePatientData hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("accessToken", "stored-access");
    mockUseAuth.mockReturnValue({
      user: { id: "doctor-1" },
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    } as never);
  });

  it("fetches glucose, insulin, profile and log entries with the stored token", async () => {
    mockGetPatientGlucoseEvolution.mockResolvedValue({ data: [{ month: "2026-04" }] } as never);
    mockGetPatientInsulinStats.mockResolvedValue({ data: [{ month: "2026-04" }] } as never);
    mockGetPatientProfile.mockResolvedValue({ id: "profile-1" } as never);
    mockGetPatientLogEntries.mockResolvedValue([{ id: "log-1" }] as never);

    const { result: glucoseResult } = renderHook(
      () => usePatientGlucoseEvolution("patient-1", 12),
      { wrapper: createWrapper() },
    );
    const { result: insulinResult } = renderHook(() => usePatientInsulinStats("patient-1", 12), {
      wrapper: createWrapper(),
    });
    const { result: profileResult } = renderHook(() => usePatientProfile("patient-1"), {
      wrapper: createWrapper(),
    });
    const { result: logsResult } = renderHook(
      () => usePatientLogEntries("patient-1", "2026-04-01", "2026-04-08"),
      { wrapper: createWrapper() },
    );

    await waitFor(() =>
      expect(glucoseResult.current.data).toEqual({ data: [{ month: "2026-04" }] }),
    );
    await waitFor(() =>
      expect(insulinResult.current.data).toEqual({ data: [{ month: "2026-04" }] }),
    );
    await waitFor(() => expect(profileResult.current.data).toEqual({ id: "profile-1" }));
    await waitFor(() => expect(logsResult.current.data).toEqual([{ id: "log-1" }]));

    expect(mockGetPatientGlucoseEvolution).toHaveBeenCalledWith("stored-access", "patient-1", 12);
    expect(mockGetPatientInsulinStats).toHaveBeenCalledWith("stored-access", "patient-1", 12);
    expect(mockGetPatientProfile).toHaveBeenCalledWith("stored-access", "patient-1");
    expect(mockGetPatientLogEntries).toHaveBeenCalledWith(
      "stored-access",
      "patient-1",
      "2026-04-01",
      "2026-04-08",
    );
  });

  it("does not fetch when there is no authenticated user or patient id", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    } as never);

    const { result } = renderHook(() => usePatientProfile(""), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetPatientProfile).not.toHaveBeenCalled();
  });
});
