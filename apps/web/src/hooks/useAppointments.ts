"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { AppointmentStatus } from "@glucosapp/types";
import {
  createDoctorAppointment,
  deleteDoctorAppointment,
  getDoctorAppointmentCalendar,
  getDoctorAppointments,
  type AppointmentCalendarDay,
  type AppointmentsFilters,
  type CreateDoctorAppointmentPayload,
  type UpdateDoctorAppointmentPayload,
  updateDoctorAppointment,
} from "@/lib/appointments-api";

const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken");
  }
  return null;
};

const invalidateAppointmentQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["appointments"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
};

export const useDoctorAppointments = (filters?: AppointmentsFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["appointments", "doctor", filters],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getDoctorAppointments(token, filters);
    },
    enabled: !!user,
  });
};

export const useCreateDoctorAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDoctorAppointmentPayload) => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return createDoctorAppointment(token, payload);
    },
    onSuccess: () => invalidateAppointmentQueries(queryClient),
  });
};

export const useDoctorAppointmentCalendar = (month: string) => {
  const { user } = useAuth();

  return useQuery<AppointmentCalendarDay[]>({
    queryKey: ["appointments", "calendar", month],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return getDoctorAppointmentCalendar(token, month);
    },
    enabled: !!user && !!month,
  });
};

export const useUpdateDoctorAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      payload,
    }: {
      appointmentId: string;
      payload: UpdateDoctorAppointmentPayload;
    }) => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return updateDoctorAppointment(token, appointmentId, payload);
    },
    onSuccess: () => invalidateAppointmentQueries(queryClient),
  });
};

export const useDeleteDoctorAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      return deleteDoctorAppointment(token, appointmentId);
    },
    onSuccess: () => invalidateAppointmentQueries(queryClient),
  });
};

export const APPOINTMENT_STATUS_OPTIONS: Array<{
  value: AppointmentStatus;
  label: string;
}> = [
  { value: AppointmentStatus.SCHEDULED, label: "Programada" },
  { value: AppointmentStatus.CONFIRMED, label: "Confirmada" },
  { value: AppointmentStatus.COMPLETED, label: "Completada" },
  { value: AppointmentStatus.CANCELLED, label: "Cancelada" },
];
