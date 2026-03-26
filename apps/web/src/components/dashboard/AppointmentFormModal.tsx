"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { AppointmentModality, AppointmentStatus, type DoctorAppointment } from "@glucosapp/types";
import type { PatientListItem } from "@/lib/dashboard-api";
import { APPOINTMENT_STATUS_OPTIONS } from "@/hooks/useAppointments";

interface AppointmentFormModalProps {
  isOpen: boolean;
  patients: PatientListItem[];
  onClose: () => void;
  onSubmit: (payload: {
    patientId: string;
    scheduledAt: string;
    notes?: string;
    status?: AppointmentStatus;
    modality: AppointmentModality;
    location?: string;
    meetingUrl?: string;
  }) => Promise<void>;
  loading?: boolean;
  appointment?: DoctorAppointment | null;
  notesOnly?: boolean;
}

const toDateTimeLocalValue = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const toIsoString = (value: string) => new Date(value).toISOString();

const normalizeText = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const AppointmentFormModal = ({
  isOpen,
  patients,
  onClose,
  onSubmit,
  loading = false,
  appointment,
  notesOnly = false,
}: AppointmentFormModalProps) => {
  const [patientId, setPatientId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<AppointmentStatus>(AppointmentStatus.SCHEDULED);
  const [modality, setModality] = useState<AppointmentModality>(AppointmentModality.IN_PERSON);
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setPatientId(appointment?.patientId || patients[0]?.id || "");
    setScheduledAt(toDateTimeLocalValue(appointment?.scheduledAt));
    setNotes(appointment?.notes || "");
    setStatus(appointment?.status || AppointmentStatus.SCHEDULED);
    setModality(appointment?.modality || AppointmentModality.IN_PERSON);
    setLocation(appointment?.location || "");
    setMeetingUrl(appointment?.meetingUrl || "");
    setError(null);
  }, [appointment, isOpen, patients]);

  const isEditing = !!appointment;

  const willRequireReconfirmation = useMemo(() => {
    if (!appointment || appointment.status !== AppointmentStatus.CONFIRMED) {
      return false;
    }

    const originalScheduledAt = toDateTimeLocalValue(appointment.scheduledAt);
    const originalLocation = appointment.location || "";
    const originalMeetingUrl = appointment.meetingUrl || "";

    return (
      scheduledAt !== originalScheduledAt ||
      modality !== appointment.modality ||
      (modality === AppointmentModality.IN_PERSON && location !== originalLocation) ||
      (modality === AppointmentModality.VIRTUAL && meetingUrl !== originalMeetingUrl)
    );
  }, [appointment, location, meetingUrl, modality, scheduledAt]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!patientId) {
      setError("Selecciona un paciente.");
      return;
    }

    if (!scheduledAt) {
      setError("Selecciona fecha y hora.");
      return;
    }

    try {
      await onSubmit({
        patientId,
        scheduledAt: toIsoString(scheduledAt),
        notes: normalizeText(notes),
        modality,
        location: modality === AppointmentModality.IN_PERSON ? normalizeText(location) : undefined,
        meetingUrl:
          modality === AppointmentModality.VIRTUAL ? normalizeText(meetingUrl) : undefined,
        ...(isEditing ? { status } : {}),
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar la cita.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? "Editar cita" : "Nueva cita"}
            </h2>
            <p className="text-sm text-gray-500">
              {isEditing
                ? "Actualiza la logística, notas o estado de la cita."
                : "Programa una nueva cita para un paciente asignado."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {willRequireReconfirmation && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Esta cita está confirmada. Si cambias fecha, modalidad, ubicación o URL volverá a
                  quedar <strong>Programada</strong> para que el paciente la confirme otra vez.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Paciente</span>
              <select
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                disabled={loading || isEditing || notesOnly}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              >
                <option value="">Selecciona un paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName || patient.lastName
                      ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
                      : patient.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Fecha y hora</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                min={toDateTimeLocalValue(new Date().toISOString())}
                disabled={loading || notesOnly}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Modalidad</span>
              <select
                value={modality}
                onChange={(event) => setModality(event.target.value as AppointmentModality)}
                disabled={loading || notesOnly}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              >
                <option value={AppointmentModality.IN_PERSON}>Presencial</option>
                <option value={AppointmentModality.VIRTUAL}>Virtual</option>
              </select>
            </label>

            {modality === AppointmentModality.IN_PERSON ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Ubicación</span>
                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  disabled={loading || notesOnly}
                  placeholder="Consultorio, clínica o dirección"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                />
              </label>
            ) : (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">URL de acceso</span>
                <input
                  type="url"
                  value={meetingUrl}
                  onChange={(event) => setMeetingUrl(event.target.value)}
                  disabled={loading || notesOnly}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                />
              </label>
            )}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Notas</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              disabled={loading}
              placeholder="Observaciones clínicas o detalles de seguimiento..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
            />
          </label>

          {isEditing && !notesOnly && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Estado</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as AppointmentStatus)}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              >
                {APPOINTMENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {notesOnly && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              Esta cita está finalizada. Solo se pueden editar las notas.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Crear cita"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
