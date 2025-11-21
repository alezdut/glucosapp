"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { getAlertSettings, updateAlertSettings } from "@/lib/alerts-api";
import type { UpdateAlertSettingsPayload } from "@glucosapp/types";

const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken");
  }
  return null;
};

/**
 * Hook to get alert settings for doctor's patients (doctors only)
 * Settings are considered fresh for 5 minutes and won't refetch on window focus
 */
export const useAlertSettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["alertSettings"],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getAlertSettings(token);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - settings don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if data is fresh
    refetchOnReconnect: false, // Don't refetch on network reconnect
  });
};

/**
 * Hook to update alert settings for all doctor's patients (doctors only)
 */
export const useUpdateAlertSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateAlertSettingsPayload) => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return updateAlertSettings(token, payload);
    },
    onSuccess: (data) => {
      // Update the cache directly with the new data instead of invalidating
      // This avoids unnecessary refetch and keeps the UI smooth
      queryClient.setQueryData(["alertSettings"], data);
    },
  });
};
