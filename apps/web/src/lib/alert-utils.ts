import { QueryClient } from "@tanstack/react-query";

/**
 * Helper function to invalidate and refetch all alert-related queries
 * This ensures consistent and immediate updates across all components that display alerts
 */
export const invalidateAlertQueries = (queryClient: QueryClient) => {
  // Invalidate and refetch unacknowledged alerts (used by NotificationDropdown)
  // This matches the queryKey: ["alerts", "unacknowledged", limit]
  queryClient.invalidateQueries({ queryKey: ["alerts", "unacknowledged"] });
  queryClient.refetchQueries({ queryKey: ["alerts", "unacknowledged"], type: "active" });

  // Also invalidate general alerts queries
  queryClient.invalidateQueries({ queryKey: ["alerts"] });
  queryClient.refetchQueries({ queryKey: ["alerts"], type: "active" });

  // Invalidate and refetch recent alerts (used by RecentAlerts component)
  // This matches the queryKey: ["dashboard", "recent-alerts", limit]
  queryClient.invalidateQueries({ queryKey: ["dashboard", "recent-alerts"] });
  queryClient.refetchQueries({ queryKey: ["dashboard", "recent-alerts"], type: "active" });

  // Invalidate and refetch dashboard summary (includes critical alerts count)
  queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
  queryClient.refetchQueries({ queryKey: ["dashboard", "summary"], type: "active" });
};
