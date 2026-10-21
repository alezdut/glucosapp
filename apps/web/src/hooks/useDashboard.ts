"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  getDashboardSummary,
  getGlucoseEvolution,
  getInsulinStats,
  getMealStats,
  getRecentAlerts,
  getUnacknowledgedAlerts,
  getAlerts,
  acknowledgeBatchAlerts,
  type GetAlertsFilters,
} from "@/lib/dashboard-api";
import { invalidateAlertQueries } from "@/lib/alert-utils";

const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken");
  }
  return null;
};

export const useDashboardSummary = (days?: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard", "summary", days],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getDashboardSummary(token, days);
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  });
};

export const useGlucoseEvolution = (days?: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard", "glucose-evolution", days],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getGlucoseEvolution(token, days);
    },
    enabled: !!user,
  });
};

export const useInsulinStats = (days: number = 30) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard", "insulin-stats", days],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getInsulinStats(token, days);
    },
    enabled: !!user,
  });
};

export const useMealStats = (days: number = 30) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard", "meal-stats", days],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getMealStats(token, days);
    },
    enabled: !!user,
  });
};

export const useRecentAlerts = (limit: number = 10) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard", "recent-alerts", limit],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getRecentAlerts(token, limit);
    },
    enabled: !!user,
  });
};

export const useUnacknowledgedAlerts = (limit: number = 10) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["alerts", "unacknowledged", limit],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getUnacknowledgedAlerts(token, limit);
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds to keep notifications up to date
  });
};

/**
 * Unified hook for getting alerts with optional filters
 */
export const useAlerts = (filters?: GetAlertsFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["alerts", filters],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getAlerts(token, filters);
    },
    enabled: !!user,
    // Auto-refresh for unacknowledged alerts
    refetchInterval: filters?.acknowledged === false ? 30000 : undefined,
  });
};

/**
 * Hook for acknowledging multiple alerts at once
 */
export const useAcknowledgeBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: {
      token: string;
      alertIds?: string[];
      acknowledgeAll?: boolean;
    }) => {
      return acknowledgeBatchAlerts(options.token, {
        alertIds: options.alertIds,
        acknowledgeAll: options.acknowledgeAll,
      });
    },
    onSuccess: () => {
      // Invalidate all alert-related queries to refresh
      invalidateAlertQueries(queryClient);
    },
  });
};
