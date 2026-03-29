import { AppointmentStatus, type PatientAppointment } from "@glucosapp/types";
import { throwApiError } from "@glucosapp/utils";
import { createApiClient } from "./api";

export interface ConfirmAppointmentResponse extends PatientAppointment {}
export interface CancelAppointmentResponse extends PatientAppointment {}

export async function getMyAppointments(
  includePast: boolean = true,
): Promise<PatientAppointment[]> {
  const client = createApiClient();
  const queryString = includePast ? "?includePast=true" : "";
  const response = await client.GET(`/appointments/my${queryString}`);

  if (response.error) {
    throwApiError(response.error, "Failed to fetch appointments");
  }

  return (response.data as PatientAppointment[] | undefined) ?? [];
}

export async function confirmMyAppointment(
  appointmentId: string,
): Promise<ConfirmAppointmentResponse> {
  const client = createApiClient();
  const response = await client.PUT(`/appointments/${appointmentId}/confirm`);

  if (response.error) {
    throwApiError(response.error, "Failed to confirm appointment");
  }

  if (!response.data) {
    throw new Error("Appointment data is missing");
  }

  return response.data as ConfirmAppointmentResponse;
}

export async function cancelMyAppointment(
  appointmentId: string,
): Promise<CancelAppointmentResponse> {
  const client = createApiClient();
  const response = await client.PUT(`/appointments/${appointmentId}/cancel`);

  if (response.error) {
    throwApiError(response.error, "Failed to cancel appointment");
  }

  if (!response.data) {
    throw new Error("Appointment data is missing");
  }

  return response.data as CancelAppointmentResponse;
}

export const isAppointmentConfirmable = (status: AppointmentStatus): boolean =>
  status === AppointmentStatus.SCHEDULED;

export const isAppointmentCancelable = (status: AppointmentStatus): boolean =>
  status === AppointmentStatus.SCHEDULED || status === AppointmentStatus.CONFIRMED;
