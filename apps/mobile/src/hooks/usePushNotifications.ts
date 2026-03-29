import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useAuth } from "../contexts/AuthContext";
import {
  getPushPayloadFromResponse,
  handleNotificationNavigation,
  syncPushToken,
} from "../lib/push-notifications";

export const usePushNotifications = () => {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;

  useEffect(() => {
    if (!isAuthenticated || !userId || userRole !== "PATIENT") {
      return;
    }

    syncPushToken().catch((error) => {
      console.error("Failed to sync push token:", error);
    });
  }, [isAuthenticated, userId, userRole]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      return;
    }

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const payload = getPushPayloadFromResponse(response);
        if (payload) {
          handleNotificationNavigation(payload);
        }
      })
      .catch((error) => {
        console.error("Failed to restore initial notification response:", error);
      });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = getPushPayloadFromResponse(response);
      if (payload) {
        handleNotificationNavigation(payload);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, userId]);
};
