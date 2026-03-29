import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { registerPushToken, unregisterPushToken } from "./api";
import { navigate } from "../navigation/navigation-service";

const PUSH_TOKEN_KEY = "expoPushToken";
const DEFAULT_CHANNEL_ID = "default";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PushNotificationPayload = {
  type: "message" | "appointment_created" | "appointment_updated" | "appointment_reminder";
  entityId: string;
  title: string;
  body: string;
  route: "Communication" | "Appointments";
  meta?: Record<string, string>;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const isPushNotificationPayload = (value: unknown): value is PushNotificationPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.type === "string" &&
    typeof payload.entityId === "string" &&
    typeof payload.title === "string" &&
    typeof payload.body === "string" &&
    (payload.route === "Communication" || payload.route === "Appointments")
  );
};

export const getStoredPushToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
};

const storePushToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
};

const clearStoredPushToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
};

export const ensureNotificationChannelAsync = async (): Promise<void> => {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: "General",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};

const getProjectId = (): string | undefined => {
  const rawProjectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
  if (typeof rawProjectId !== "string") {
    return undefined;
  }

  if (!UUID_PATTERN.test(rawProjectId)) {
    console.warn(
      "Ignoring invalid Expo EAS projectId. Expected a UUID in expo.extra.eas.projectId.",
      rawProjectId,
    );
    return undefined;
  }

  return rawProjectId;
};

export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  await ensureNotificationChannelAsync();

  const existingPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermissions.status;

  if (finalStatus !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = getProjectId();
  let response;

  try {
    response = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (projectId && errorMessage.includes("Invalid uuid")) {
      console.warn("Expo rejected the configured projectId, retrying without projectId.");
      response = await Notifications.getExpoPushTokenAsync();
    } else {
      throw error;
    }
  }

  return response.data;
};

export const registerPushDevice = async (token: string): Promise<void> => {
  const deviceId =
    Constants.sessionId || Constants.installationId || Constants.expoRuntimeVersion || undefined;

  await registerPushToken({
    expoPushToken: token,
    platform: Platform.OS,
    deviceId,
  });
  await storePushToken(token);
};

export const unregisterPushDevice = async (token: string): Promise<void> => {
  await unregisterPushToken(token);
  await clearStoredPushToken();
};

export const unregisterCurrentPushDevice = async (): Promise<void> => {
  const currentToken = await getStoredPushToken();
  if (!currentToken) {
    return;
  }

  try {
    await unregisterPushDevice(currentToken);
  } catch (error) {
    console.error("Failed to unregister push token:", error);
    await clearStoredPushToken();
  }
};

export const syncPushToken = async (): Promise<void> => {
  const nextToken = await registerForPushNotificationsAsync();
  if (!nextToken) {
    return;
  }

  const previousToken = await getStoredPushToken();
  if (previousToken && previousToken !== nextToken) {
    try {
      await unregisterPushDevice(previousToken);
    } catch (error) {
      console.error("Failed to unregister stale push token:", error);
    }
  }

  await registerPushDevice(nextToken);
};

export const handleNotificationNavigation = (payload: PushNotificationPayload): void => {
  if (payload.route === "Communication") {
    navigate("Communication");
    return;
  }

  if (payload.route === "Appointments") {
    navigate("Appointments");
  }
};

export const getPushPayloadFromResponse = (
  response: Notifications.NotificationResponse | null,
): PushNotificationPayload | null => {
  const payload = response?.notification.request.content.data;
  return isPushNotificationPayload(payload) ? payload : null;
};
