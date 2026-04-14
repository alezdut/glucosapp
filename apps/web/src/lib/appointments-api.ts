"use client";

import { makeApiClient } from "@glucosapp/api-client";
import {
  AppointmentModality,
  AppointmentStatus,
  type DoctorAppointment,
  type PatientAppointment,
} from "@glucosapp/types";
import { throwApiError } from "@glucosapp/utils";
import { getWebApiBaseUrl } from "./env";

const apiBaseUrl = getWebApiBaseUrl();
const { client } = makeApiClient(`${apiBaseUrl}/v1`);

export interface AppointmentsFilters {
  includePast?: boolean;
  patientId?: string;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
}

export interface CreateDoctorAppointmentPayload {
  patientId: string;
  scheduledAt: string;
  notes?: string;
  modality?: AppointmentModality;
  location?: string;
  meetingUrl?: string;
}

export interface UpdateDoctorAppointmentPayload {
  scheduledAt?: string;
  notes?: string;
  status?: AppointmentStatus;
  modality?: AppointmentModality;
  location?: string;
  meetingUrl?: string;
}

export interface ConfirmAppointmentResponse extends PatientAppointment {}
export interface CancelAppointmentResponse extends PatientAppointment {}
export interface AppointmentCalendarDay {
  date: string;
  count: number;
}

const buildQueryString = (filters?: AppointmentsFilters): string => {
  const queryParams = new URLSearchParams();

  if (filters?.includePast) queryParams.append("includePast", "true");
  if (filters?.patientId) queryParams.append("patientId", filters.patientId);
  if (filters?.status) queryParams.append("status", filters.status);
  if (filters?.from) queryParams.append("from", filters.from);
  if (filters?.to) queryParams.append("to", filters.to);

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : "";
};

export async function getDoctorAppointments(
  accessToken: string,
  filters?: AppointmentsFilters,
): Promise<DoctorAppointment[]> {
  const response = await client.GET<DoctorAppointment[]>(
    `/appointments${buildQueryString(filters)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.error) {
    throwApiError(response.error, "Failed to fetch appointments");
  }

  return response.data ?? [];
}

export async function createDoctorAppointment(
  accessToken: string,
  payload: CreateDoctorAppointmentPayload,
): Promise<DoctorAppointment> {
  const response = await client.POST<DoctorAppointment>("/appointments", payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.error) {
    throwApiError(response.error, "Failed to create appointment");
  }

  if (!response.data) {
    throw new Error("Appointment data is missing");
  }

  return response.data;
}

export async function updateDoctorAppointment(
  accessToken: string,
  appointmentId: string,
  payload: UpdateDoctorAppointmentPayload,
): Promise<DoctorAppointment> {
  const response = await client.PUT<DoctorAppointment>(`/appointments/${appointmentId}`, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.error) {
    throwApiError(response.error, "Failed to update appointment");
  }

  if (!response.data) {
    throw new Error("Appointment data is missing");
  }

  return response.data;
}

export async function deleteDoctorAppointment(
  accessToken: string,
  appointmentId: string,
): Promise<{ message: string }> {
  const response = await client.DELETE<{ message: string }>(`/appointments/${appointmentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.error) {
    throwApiError(response.error, "Failed to delete appointment");
  }

  return response.data ?? { message: "Appointment deleted successfully" };
}

export async function getDoctorAppointmentCalendar(
  accessToken: string,
  month: string,
): Promise<AppointmentCalendarDay[]> {
  const response = await client.GET<AppointmentCalendarDay[]>(
    `/appointments/calendar?month=${encodeURIComponent(month)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.error) {
    throwApiError(response.error, "Failed to fetch appointment calendar");
  }

  return response.data ?? [];
}

export async function getPatientAppointments(
  accessToken: string,
  includePast: boolean = false,
): Promise<PatientAppointment[]> {
  const queryString = includePast ? "?includePast=true" : "";
  const response = await client.GET<PatientAppointment[]>(`/appointments/my${queryString}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.error) {
    throwApiError(response.error, "Failed to fetch patient appointments");
  }

  return response.data ?? [];
}

export async function confirmPatientAppointment(
  accessToken: string,
  appointmentId: string,
): Promise<ConfirmAppointmentResponse> {
  const response = await client.PUT<ConfirmAppointmentResponse>(
    `/appointments/${appointmentId}/confirm`,
    undefined,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.error) {
    throwApiError(response.error, "Failed to confirm appointment");
  }

  if (!response.data) {
    throw new Error("Appointment data is missing");
  }

  return response.data;
}

export async function cancelPatientAppointment(
  accessToken: string,
  appointmentId: string,
): Promise<CancelAppointmentResponse> {
  const response = await client.PUT<CancelAppointmentResponse>(
    `/appointments/${appointmentId}/cancel`,
    undefined,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.error) {
    throwApiError(response.error, "Failed to cancel appointment");
  }

  if (!response.data) {
    throw new Error("Appointment data is missing");
  }

  return response.data;
}
