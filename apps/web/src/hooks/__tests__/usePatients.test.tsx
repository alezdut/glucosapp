"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/contexts/auth-context";
import {
  assignPatient,
  getPatientDetails,
  getPatientsWithFilters,
  removePatient,
  searchGlobalPatients,
} from "@/lib/dashboard-api";
import {
  useAssignPatient,
  usePatientDetails,
  usePatients,
  useRemovePatient,
  useSearchGlobalPatients,
} from "../usePatients";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/dashboard-api", () => ({
  getPatientsWithFilters: jest.fn(),
  searchGlobalPatients: jest.fn(),
  assignPatient: jest.fn(),
  removePatient: jest.fn(),
  getPatientDetails: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetPatientsWithFilters = getPatientsWithFilters as jest.MockedFunction<
  typeof getPatientsWithFilters
>;
const mockSearchGlobalPatients = searchGlobalPatients as jest.MockedFunction<
  typeof searchGlobalPatients
>;
const mockAssignPatient = assignPatient as jest.MockedFunction<typeof assignPatient>;
const mockRemovePatient = removePatient as jest.MockedFunction<typeof removePatient>;
const mockGetPatientDetails = getPatientDetails as jest.MockedFunction<typeof getPatientDetails>;

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
  Wrapper.displayName = "PatientsHookWrapper";
  return Wrapper;
};

describe("usePatients hooks", () => {
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

  it("fetches patients, searches globally and gets details when authenticated", async () => {
    mockGetPatientsWithFilters.mockResolvedValue([{ id: "patient-1" }] as never);
    mockSearchGlobalPatients.mockResolvedValue([{ id: "patient-2" }] as never);
    mockGetPatientDetails.mockResolvedValue({ id: "patient-3" } as never);

    const { result: patientsResult } = renderHook(() => usePatients({ search: "ana" }), {
      wrapper: createWrapper(),
    });
    const { result: searchResult } = renderHook(() => useSearchGlobalPatients("ana"), {
      wrapper: createWrapper(),
    });
    const { result: detailResult } = renderHook(() => usePatientDetails("patient-3"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(patientsResult.current.data).toEqual([{ id: "patient-1" }]));
    await waitFor(() => expect(searchResult.current.data).toEqual([{ id: "patient-2" }]));
    await waitFor(() => expect(detailResult.current.data).toEqual({ id: "patient-3" }));
    expect(mockGetPatientsWithFilters).toHaveBeenCalledWith("stored-access", { search: "ana" });
    expect(mockSearchGlobalPatients).toHaveBeenCalledWith("stored-access", "ana");
    expect(mockGetPatientDetails).toHaveBeenCalledWith("stored-access", "patient-3");
  });

  it("invalidates patient queries after assign and remove mutations", async () => {
    mockAssignPatient.mockResolvedValue({ ok: true } as never);
    mockRemovePatient.mockResolvedValue({ ok: true } as never);

    const { result: assignResult } = renderHook(() => useAssignPatient(), {
      wrapper: createWrapper(),
    });
    const { result: removeResult } = renderHook(() => useRemovePatient(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await assignResult.current.mutateAsync("patient-1");
      await removeResult.current.mutateAsync("patient-1");
    });

    expect(mockAssignPatient).toHaveBeenCalledWith("stored-access", "patient-1");
    expect(mockRemovePatient).toHaveBeenCalledWith("stored-access", "patient-1");
  });
});
