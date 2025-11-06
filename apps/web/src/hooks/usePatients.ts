"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  getPatientsWithFilters,
  searchGlobalPatients,
  assignPatient,
  getPatientDetails,
  GetPatientsFilters,
} from "@/lib/dashboard-api";

const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken");
  }
  return null;
};

/**
 * Hook to get patients with filters (local search - only assigned patients)
 */
export const usePatients = (filters?: GetPatientsFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["patients", filters],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getPatientsWithFilters(token, filters);
    },
    enabled: !!user,
  });
};

/**
 * Hook to search for patients globally (all patients, not just assigned)
 */
export const useSearchGlobalPatients = (query: string, enabled: boolean = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["patients", "search", query],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return searchGlobalPatients(token, query);
    },
    enabled: !!user && enabled && query.trim().length > 0,
  });
};

/**
 * Hook to assign a patient to the doctor
 */
export const useAssignPatient = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return assignPatient(token, patientId);
    },
    onSuccess: () => {
      // Invalidate patients queries to refetch
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
};

/**
 * Hook to get detailed information about a specific patient
 */
export const usePatientDetails = (patientId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["patient", patientId, "details"],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getPatientDetails(token, patientId);
    },
    enabled: !!user && !!patientId,
  });
};
