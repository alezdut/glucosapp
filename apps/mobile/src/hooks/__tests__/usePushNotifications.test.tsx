import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { waitFor } from "@testing-library/react";
import * as Notifications from "expo-notifications";
import { usePushNotifications } from "../usePushNotifications";
import { renderMobile } from "../../../test/render-mobile";
import { useAuth } from "../../contexts/AuthContext";
import * as pushNotifications from "../../lib/push-notifications";
import { mobileFixtures } from "../../../test/fixtures";

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../lib/push-notifications", () => ({
  getPushPayloadFromResponse: jest.fn(),
  handleNotificationNavigation: jest.fn(),
  syncPushToken: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetLastNotificationResponseAsync =
  Notifications.getLastNotificationResponseAsync as jest.MockedFunction<
    typeof Notifications.getLastNotificationResponseAsync
  >;
const mockAddNotificationResponseReceivedListener =
  Notifications.addNotificationResponseReceivedListener as jest.MockedFunction<
    typeof Notifications.addNotificationResponseReceivedListener
  >;
const mockGetPushPayloadFromResponse =
  pushNotifications.getPushPayloadFromResponse as jest.MockedFunction<
    typeof pushNotifications.getPushPayloadFromResponse
  >;
const mockHandleNotificationNavigation =
  pushNotifications.handleNotificationNavigation as jest.MockedFunction<
    typeof pushNotifications.handleNotificationNavigation
  >;
const mockSyncPushToken = pushNotifications.syncPushToken as jest.MockedFunction<
  typeof pushNotifications.syncPushToken
>;

function Probe() {
  usePushNotifications();
  return <div>push-probe</div>;
}

describe("usePushNotifications", () => {
  const remove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddNotificationResponseReceivedListener.mockReturnValue({ remove } as never);
    mockGetLastNotificationResponseAsync.mockResolvedValue(null as never);
    mockGetPushPayloadFromResponse.mockReturnValue(null);
    mockSyncPushToken.mockResolvedValue(undefined);
  });

  it("skips push sync when there is no authenticated patient", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      needsOnboarding: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      updateUserProfile: jest.fn(),
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });

    renderMobile(<Probe />);

    await waitFor(() => {
      expect(mockSyncPushToken).not.toHaveBeenCalled();
    });
  });

  it("restores the initial notification response and navigates from the payload", async () => {
    const payload = {
      type: "message" as const,
      entityId: "thread-1",
      title: "Nuevo mensaje",
      body: "Hola",
      route: "Communication" as const,
    };

    mockUseAuth.mockReturnValue({
      user: mobileFixtures.patientUser,
      isLoading: false,
      isAuthenticated: true,
      needsOnboarding: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      updateUserProfile: jest.fn(),
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });
    mockGetLastNotificationResponseAsync.mockResolvedValue({} as never);
    mockGetPushPayloadFromResponse.mockReturnValue(payload);

    renderMobile(<Probe />);

    await waitFor(() => {
      expect(mockSyncPushToken).toHaveBeenCalled();
      expect(mockHandleNotificationNavigation).toHaveBeenCalledWith(payload);
    });
  });

  it("registers a response listener and removes it during cleanup", async () => {
    const payload = {
      type: "appointment_created" as const,
      entityId: "appointment-1",
      title: "Turno",
      body: "Nuevo turno",
      route: "Appointments" as const,
    };
    let listener: ((response: unknown) => void) | undefined;

    mockUseAuth.mockReturnValue({
      user: mobileFixtures.patientUser,
      isLoading: false,
      isAuthenticated: true,
      needsOnboarding: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      updateUserProfile: jest.fn(),
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });
    mockAddNotificationResponseReceivedListener.mockImplementation((callback) => {
      listener = callback;
      return { remove } as never;
    });
    mockGetPushPayloadFromResponse.mockReturnValue(payload);

    const { unmount } = renderMobile(<Probe />);

    await waitFor(() => {
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    listener?.({});

    expect(mockHandleNotificationNavigation).toHaveBeenCalledWith(payload);

    unmount();

    expect(remove).toHaveBeenCalled();
  });
});
