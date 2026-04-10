import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { registerPushToken, unregisterPushToken } from "../api";
import { navigate } from "../../navigation/navigation-service";
import {
  ensureNotificationChannelAsync,
  getPushPayloadFromResponse,
  getStoredPushToken,
  handleNotificationNavigation,
  registerForPushNotificationsAsync,
  registerPushDevice,
  syncPushToken,
  unregisterCurrentPushDevice,
  unregisterPushDevice,
} from "../push-notifications";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  AndroidImportance: { HIGH: "HIGH" },
  AndroidNotificationVisibility: { PUBLIC: "PUBLIC" },
}));

jest.mock("expo-constants", () => ({
  expoConfig: { extra: { eas: { projectId: "11111111-1111-4111-8111-111111111111" } } },
  easConfig: { projectId: undefined },
  sessionId: "session-1",
  installationId: "install-1",
  expoRuntimeVersion: "runtime-1",
}));

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

jest.mock("../api", () => ({
  registerPushToken: jest.fn(),
  unregisterPushToken: jest.fn(),
}));

jest.mock("../../navigation/navigation-service", () => ({
  navigate: jest.fn(),
}));

const mockSecureGet = SecureStore.getItemAsync as jest.MockedFunction<
  typeof SecureStore.getItemAsync
>;
const mockSecureSet = SecureStore.setItemAsync as jest.MockedFunction<
  typeof SecureStore.setItemAsync
>;
const mockSecureDelete = SecureStore.deleteItemAsync as jest.MockedFunction<
  typeof SecureStore.deleteItemAsync
>;

const mockSetChannel = Notifications.setNotificationChannelAsync as jest.MockedFunction<
  typeof Notifications.setNotificationChannelAsync
>;
const mockGetPermissions = Notifications.getPermissionsAsync as jest.MockedFunction<
  typeof Notifications.getPermissionsAsync
>;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.MockedFunction<
  typeof Notifications.requestPermissionsAsync
>;
const mockGetExpoPushToken = Notifications.getExpoPushTokenAsync as jest.MockedFunction<
  typeof Notifications.getExpoPushTokenAsync
>;

const mockRegisterPushToken = registerPushToken as jest.MockedFunction<typeof registerPushToken>;
const mockUnregisterPushToken = unregisterPushToken as jest.MockedFunction<
  typeof unregisterPushToken
>;
const mockNavigate = navigate as jest.MockedFunction<typeof navigate>;

describe("push-notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = "android";

    (Constants as any).expoConfig = {
      extra: { eas: { projectId: "11111111-1111-4111-8111-111111111111" } },
    };
    (Constants as any).easConfig = { projectId: undefined };
    (Constants as any).sessionId = "session-1";
    (Constants as any).installationId = "install-1";
    (Constants as any).expoRuntimeVersion = "runtime-1";

    mockGetPermissions.mockResolvedValue({ status: "granted" } as never);
    mockRequestPermissions.mockResolvedValue({ status: "granted" } as never);
    mockGetExpoPushToken.mockResolvedValue({ data: "expo-token-1" } as never);
  });

  it("creates notification channel only on android", async () => {
    await ensureNotificationChannelAsync();
    expect(mockSetChannel).toHaveBeenCalledTimes(1);

    Platform.OS = "ios";
    await ensureNotificationChannelAsync();
    expect(mockSetChannel).toHaveBeenCalledTimes(1);
  });

  it("returns null when permissions are denied", async () => {
    mockGetPermissions.mockResolvedValue({ status: "denied" } as never);
    mockRequestPermissions.mockResolvedValue({ status: "denied" } as never);

    const token = await registerForPushNotificationsAsync();

    expect(token).toBeNull();
    expect(mockGetExpoPushToken).not.toHaveBeenCalled();
  });

  it("registers with projectId when valid", async () => {
    const token = await registerForPushNotificationsAsync();

    expect(token).toBe("expo-token-1");
    expect(mockGetExpoPushToken).toHaveBeenCalledWith({
      projectId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("falls back without projectId when configured projectId is invalid format", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    (Constants as any).expoConfig = { extra: { eas: { projectId: "not-a-uuid" } } };

    const token = await registerForPushNotificationsAsync();

    expect(token).toBe("expo-token-1");
    expect(mockGetExpoPushToken).toHaveBeenCalledWith();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("retries without projectId when Expo rejects uuid", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockGetExpoPushToken
      .mockRejectedValueOnce(new Error("Invalid uuid"))
      .mockResolvedValueOnce({ data: "expo-token-fallback" } as never);

    const token = await registerForPushNotificationsAsync();

    expect(token).toBe("expo-token-fallback");
    expect(mockGetExpoPushToken).toHaveBeenNthCalledWith(1, {
      projectId: "11111111-1111-4111-8111-111111111111",
    });
    expect(mockGetExpoPushToken).toHaveBeenNthCalledWith(2);
    expect(warnSpy).toHaveBeenCalledWith(
      "Expo rejected the configured projectId, retrying without projectId.",
    );
  });

  it("stores and unregisters push tokens", async () => {
    await registerPushDevice("expo-token-2");

    expect(mockRegisterPushToken).toHaveBeenCalledWith({
      expoPushToken: "expo-token-2",
      platform: "android",
      deviceId: "session-1",
    });
    expect(mockSecureSet).toHaveBeenCalledWith("expoPushToken", "expo-token-2");

    await unregisterPushDevice("expo-token-2");

    expect(mockUnregisterPushToken).toHaveBeenCalledWith("expo-token-2");
    expect(mockSecureDelete).toHaveBeenCalledWith("expoPushToken");
  });

  it("unregisterCurrentPushDevice clears token even when API unregister fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockSecureGet.mockResolvedValue("stored-token");
    mockUnregisterPushToken.mockRejectedValue(new Error("network"));

    await unregisterCurrentPushDevice();

    expect(mockUnregisterPushToken).toHaveBeenCalledWith("stored-token");
    expect(mockSecureDelete).toHaveBeenCalledWith("expoPushToken");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("syncs tokens and handles stale unregister errors", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockSecureGet.mockResolvedValue("old-token");
    mockGetExpoPushToken.mockResolvedValue({ data: "new-token" } as never);
    mockUnregisterPushToken.mockRejectedValue(new Error("stale unregister failed"));

    await syncPushToken();

    expect(mockUnregisterPushToken).toHaveBeenCalledWith("old-token");
    expect(mockRegisterPushToken).toHaveBeenCalledWith({
      expoPushToken: "new-token",
      platform: "android",
      deviceId: "session-1",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to unregister stale push token:",
      expect.any(Error),
    );
  });

  it("extracts payload safely and navigates by route", async () => {
    const response = {
      notification: {
        request: {
          content: {
            data: {
              type: "message",
              entityId: "123",
              title: "Nuevo mensaje",
              body: "Hola",
              route: "Communication",
            },
          },
        },
      },
    } as Notifications.NotificationResponse;

    const payload = getPushPayloadFromResponse(response);
    expect(payload).toEqual({
      type: "message",
      entityId: "123",
      title: "Nuevo mensaje",
      body: "Hola",
      route: "Communication",
    });

    handleNotificationNavigation(payload!);
    handleNotificationNavigation({ ...payload!, route: "Appointments" });

    expect(mockNavigate).toHaveBeenNthCalledWith(1, "Communication");
    expect(mockNavigate).toHaveBeenNthCalledWith(2, "Appointments");

    expect(getPushPayloadFromResponse(null)).toBeNull();
    expect(
      getPushPayloadFromResponse({
        notification: { request: { content: { data: { foo: "bar" } } } },
      } as never),
    ).toBeNull();
  });

  it("reads stored token helper", async () => {
    mockSecureGet.mockResolvedValue("stored-token");

    await expect(getStoredPushToken()).resolves.toBe("stored-token");
  });
});
