"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/contexts/auth-context";
import { getAlertSettings, updateAlertSettings } from "@/lib/alerts-api";
import { useAlertSettings, useUpdateAlertSettings } from "../useAlertSettings";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/alerts-api", () => ({
  getAlertSettings: jest.fn(),
  updateAlertSettings: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetAlertSettings = getAlertSettings as jest.MockedFunction<typeof getAlertSettings>;
const mockUpdateAlertSettings = updateAlertSettings as jest.MockedFunction<
  typeof updateAlertSettings
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
  Wrapper.displayName = "AlertSettingsHookWrapper";
  return { queryClient, Wrapper };
};

describe("useAlertSettings hooks", () => {
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

  it("fetches alert settings with the stored token", async () => {
    mockGetAlertSettings.mockResolvedValue({ notifications: { email: true } } as never);

    const { result } = renderHook(() => useAlertSettings(), {
      wrapper: createWrapper().Wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual({ notifications: { email: true } }));
    expect(mockGetAlertSettings).toHaveBeenCalledWith("stored-access");
  });

  it("updates alert settings and writes the cache", async () => {
    const updated = { notifications: { email: false } };
    mockUpdateAlertSettings.mockResolvedValue(updated as never);
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateAlertSettings(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ notifications: { email: false } } as never);
    });

    expect(mockUpdateAlertSettings).toHaveBeenCalledWith("stored-access", {
      notifications: { email: false },
    });
    expect(queryClient.getQueryData(["alertSettings"])).toEqual(updated);
  });

  it("stays idle without an authenticated user", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    } as never);

    const { result } = renderHook(() => useAlertSettings(), {
      wrapper: createWrapper().Wrapper,
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetAlertSettings).not.toHaveBeenCalled();
  });
});
