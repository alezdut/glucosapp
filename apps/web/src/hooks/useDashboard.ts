"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  getDashboardSummary,
  getGlucoseEvolution,
  getInsulinStats,
  getMealStats,
  getRecentAlerts,
  getUnacknowledgedAlerts,
} from "@/lib/dashboard-api";

const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken");
  }
  return null;
};

export const useDashboardSummary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getDashboardSummary(token);
    },
    enabled: !!user,
  });
};

export const useGlucoseEvolution = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard", "glucose-evolution"],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getGlucoseEvolution(token);
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
