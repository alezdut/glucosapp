import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  getPatientGlucoseEvolution,
  getPatientInsulinStats,
  getPatientProfile,
  getPatientLogEntries,
  PatientGlucoseEvolution,
  PatientInsulinStats,
  PatientProfile,
} from "@/lib/dashboard-api";
import type { LogEntry } from "@glucosapp/types";

const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken");
  }
  return null;
};

/**
 * Hook to fetch patient glucose evolution data
 */
export const usePatientGlucoseEvolution = (patientId: string, months?: number) => {
  const { user } = useAuth();

  return useQuery<PatientGlucoseEvolution>({
    queryKey: ["patientGlucoseEvolution", patientId, months],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getPatientGlucoseEvolution(token, patientId, months);
    },
    enabled: !!user && !!patientId,
  });
};

/**
 * Hook to fetch patient insulin statistics
 */
export const usePatientInsulinStats = (patientId: string, months?: number) => {
  const { user } = useAuth();

  return useQuery<PatientInsulinStats>({
    queryKey: ["patientInsulinStats", patientId, months],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getPatientInsulinStats(token, patientId, months);
    },
    enabled: !!user && !!patientId,
  });
};

/**
 * Hook to fetch patient profile/parameters
 */
export const usePatientProfile = (patientId: string) => {
  const { user } = useAuth();

  return useQuery<PatientProfile>({
    queryKey: ["patientProfile", patientId],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getPatientProfile(token, patientId);
    },
    enabled: !!user && !!patientId,
  });
};

/**
 * Hook to fetch patient unified log entries (historial)
 * Defaults to last 7 days if no range provided
 */
export const usePatientLogEntries = (patientId: string, startDate?: string, endDate?: string) => {
  const { user } = useAuth();

  return useQuery<LogEntry[]>({
    queryKey: ["patientLogEntries", patientId, startDate, endDate],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getPatientLogEntries(token, patientId, startDate, endDate);
    },
    enabled: !!user && !!patientId,
  });
};
