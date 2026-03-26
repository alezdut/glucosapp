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

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== "PATIENT") {
      return;
    }

    syncPushToken().catch((error) => {
      console.error("Failed to sync push token:", error);
    });
  }, [isAuthenticated, user?.id, user?.role]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
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
  }, [isAuthenticated, user?.id]);
};
