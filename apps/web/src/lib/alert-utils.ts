import { QueryClient } from "@tanstack/react-query";

/**
 * Helper function to invalidate and refetch all alert-related queries
 * This ensures consistent and immediate updates across all components that display alerts
 */
export const invalidateAlertQueries = async (queryClient: QueryClient) => {
  // Invalidate and refetch unacknowledged alerts (used by NotificationDropdown)
  // This matches the queryKey: ["alerts", "unacknowledged", limit]
  await queryClient.invalidateQueries({ queryKey: ["alerts", "unacknowledged"] });
  await queryClient.refetchQueries({ queryKey: ["alerts", "unacknowledged"], type: "active" });

  // Also invalidate general alerts queries
  await queryClient.invalidateQueries({ queryKey: ["alerts"] });
  await queryClient.refetchQueries({ queryKey: ["alerts"], type: "active" });

  // Invalidate and refetch recent alerts (used by RecentAlerts component)
  // This matches the queryKey: ["dashboard", "recent-alerts", limit]
  await queryClient.invalidateQueries({ queryKey: ["dashboard", "recent-alerts"] });
  await queryClient.refetchQueries({ queryKey: ["dashboard", "recent-alerts"], type: "active" });

  // Invalidate and refetch dashboard summary (includes critical alerts count)
  await queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
  await queryClient.refetchQueries({ queryKey: ["dashboard", "summary"], type: "active" });
};
