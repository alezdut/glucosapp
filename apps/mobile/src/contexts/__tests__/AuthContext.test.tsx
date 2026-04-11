import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import {
  clearTokens,
  createApiClient,
  getAccessToken,
  getRefreshToken,
  storeTokens,
} from "../../lib/api";
import { unregisterCurrentPushDevice } from "../../lib/push-notifications";
import { WebBrowser } from "../../lib/expo-auth";

jest.mock("../../lib/api", () => ({
  createApiClient: jest.fn(),
  storeTokens: jest.fn(),
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  clearTokens: jest.fn(),
}));

jest.mock("../../lib/push-notifications", () => ({
  unregisterCurrentPushDevice: jest.fn(),
}));

jest.mock("../../lib/expo-auth", () => ({
  Linking: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    getInitialURL: jest.fn().mockResolvedValue(null),
  },
  WebBrowser: {
    maybeCompleteAuthSession: jest.fn(),
    openAuthSessionAsync: jest.fn(),
  },
}));

const mockCreateApiClient = createApiClient as jest.MockedFunction<typeof createApiClient>;
const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockGetRefreshToken = getRefreshToken as jest.MockedFunction<typeof getRefreshToken>;
const mockClearTokens = clearTokens as jest.MockedFunction<typeof clearTokens>;
const mockStoreTokens = storeTokens as jest.MockedFunction<typeof storeTokens>;
const mockUnregisterCurrentPushDevice = unregisterCurrentPushDevice as jest.MockedFunction<
  typeof unregisterCurrentPushDevice
>;
const mockOpenAuthSessionAsync = WebBrowser.openAuthSessionAsync as jest.MockedFunction<
  typeof WebBrowser.openAuthSessionAsync
>;

describe("AuthProvider", () => {
  const GET = jest.fn();
  const POST = jest.fn();

  const loadAuthModule = () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const authModule = require("../AuthContext") as typeof import("../AuthContext");

    const Consumer = () => {
      const auth = authModule.useAuth();

      return (
        <>
          <div>{auth.user?.email ?? "no-user"}</div>
          <div>{auth.needsOnboarding ? "needs-onboarding" : "ready"}</div>
          <button onClick={() => auth.refreshUser()}>refresh</button>
          <button onClick={() => auth.completeOnboarding()}>complete</button>
          <button onClick={() => auth.updateUserProfile("Ana", "Paz")}>update</button>
          <button onClick={() => auth.signOut()}>sign-out</button>
          <button onClick={() => auth.signInWithGoogle()}>sign-in</button>
        </>
      );
    };

    return { AuthProvider: authModule.AuthProvider, Consumer };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateApiClient.mockReturnValue({ GET, POST } as never);
    mockGetAccessToken.mockResolvedValue("access-token");
    mockGetRefreshToken.mockResolvedValue("refresh-token");
    GET.mockResolvedValue({
      data: {
        id: "patient-1",
        email: "patient@example.com",
        firstName: "",
        lastName: "",
        role: "PATIENT",
        emailVerified: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
  });

  it("loads the current user, refreshes it and updates onboarding state locally", async () => {
    const { AuthProvider, Consumer } = loadAuthModule();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("patient@example.com")).toBeTruthy());
    expect(screen.getByText("needs-onboarding")).toBeTruthy();

    await act(async () => {
      screen.getByText("update").click();
    });

    expect(screen.getByText("needs-onboarding")).toBeTruthy();

    await act(async () => {
      screen.getByText("complete").click();
      screen.getByText("refresh").click();
    });

    expect(screen.getByText("ready")).toBeTruthy();

    expect(GET).toHaveBeenCalledWith("/auth/me", {});
  });

  it("stores tokens from Google sign-in and clears local state on sign out", async () => {
    const { AuthProvider, Consumer } = loadAuthModule();

    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "glucosapp://auth/callback?accessToken=a&refreshToken=r&user=%7B%22id%22%3A%22patient-1%22%2C%22email%22%3A%22patient%40example.com%22%2C%22firstName%22%3A%22Ana%22%2C%22lastName%22%3A%22Paz%22%2C%22role%22%3A%22PATIENT%22%2C%22emailVerified%22%3Atrue%2C%22createdAt%22%3A%222026-01-01T00%3A00%3A00.000Z%22%7D",
    } as never);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("patient@example.com")).toBeTruthy());

    await act(async () => {
      screen.getByText("sign-in").click();
    });

    expect(mockStoreTokens).toHaveBeenCalledWith("a", "r");

    await act(async () => {
      screen.getByText("sign-out").click();
    });

    expect(mockUnregisterCurrentPushDevice).toHaveBeenCalled();
    expect(POST).toHaveBeenCalledWith("/auth/logout", { body: { refreshToken: "refresh-token" } });
    expect(mockClearTokens).toHaveBeenCalled();
  });
});
