"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppointmentModality, AppointmentStatus, type DoctorAppointment } from "@glucosapp/types";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
} from "lucide-react";
import { usePatients } from "@/hooks/usePatients";
import {
  APPOINTMENT_STATUS_OPTIONS,
  useCreateDoctorAppointment,
  useDoctorAppointments,
  useUpdateDoctorAppointment,
} from "@/hooks/useAppointments";
import { AppointmentFormModal } from "@/components/dashboard/AppointmentFormModal";
import { FeedbackSnackbar } from "@/components/FeedbackSnackbar";

const statusStyles: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  CONFIRMED: "bg-green-50 text-green-700 border-green-200",
  COMPLETED: "bg-gray-100 text-gray-700 border-gray-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

const statusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: "Programada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

const modalityLabels: Record<AppointmentModality, string> = {
  IN_PERSON: "Presencial",
  VIRTUAL: "Virtual",
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const formatMonthLabel = (month: string) => {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
};

const getMonthValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getLocalDateKey = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const getPatientName = (appointment: DoctorAppointment) => {
  const patient = appointment.patient;
  if (!patient) return appointment.patientId;
  return patient.firstName || patient.lastName
    ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
    : patient.email;
};

const getMonthDays = (month: string) => {
  const [year, monthIndex] = month.split("-").map(Number);
  const firstDay = new Date(year, monthIndex - 1, 1);
  const lastDay = new Date(year, monthIndex, 0);
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const days: Array<{ key: string; date?: string; day?: number }> = [];

  for (let index = 0; index < leadingBlanks; index += 1) {
    days.push({ key: `blank-${index}` });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    days.push({ key: date, date, day });
  }

  return days;
};

export const AppointmentsManager = () => {
  const [patientId, setPatientId] = useState("");
  const [status, setStatus] = useState<AppointmentStatus | "">("");
  const [includePast, setIncludePast] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(getMonthValue(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<DoctorAppointment | null>(null);
  const [openActionsAppointmentId, setOpenActionsAppointmentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  const appointmentFilters = useMemo(
    () => ({
      includePast,
      ...(patientId ? { patientId } : {}),
      ...(status ? { status } : {}),
      ...(from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}),
      ...(to ? { to: new Date(`${to}T23:59:59`).toISOString() } : {}),
    }),
    [from, includePast, patientId, status, to],
  );

  const calendarRangeFilters = useMemo(() => {
    const [year, monthIndex] = calendarMonth.split("-").map(Number);
    const monthStart = new Date(year, monthIndex - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, monthIndex, 0, 23, 59, 59, 999);

    return {
      includePast: true,
      from: monthStart.toISOString(),
      to: monthEnd.toISOString(),
    };
  }, [calendarMonth]);

  const { data: appointments = [], isLoading, error } = useDoctorAppointments(appointmentFilters);
  const { data: calendarAppointments = [], isLoading: isLoadingCalendar } =
    useDoctorAppointments(calendarRangeFilters);
  const { data: patients = [] } = usePatients({});
  const createMutation = useCreateDoctorAppointment();
  const updateMutation = useUpdateDoctorAppointment();

  const calendarCounts = useMemo(
    () =>
      calendarAppointments.reduce((counts, appointment) => {
        const dateKey = getLocalDateKey(appointment.scheduledAt);
        counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
        return counts;
      }, new Map<string, number>()),
    [calendarAppointments],
  );

  const monthDays = useMemo(() => getMonthDays(calendarMonth), [calendarMonth]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

  useEffect(() => {
    if (!openActionsAppointmentId) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!actionsMenuRef.current?.contains(event.target as Node)) {
        setOpenActionsAppointmentId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openActionsAppointmentId]);

  const handleCreate = async (payload: {
    patientId: string;
    scheduledAt: string;
    notes?: string;
    status?: AppointmentStatus;
    modality: AppointmentModality;
    location?: string;
    meetingUrl?: string;
  }) => {
    await createMutation.mutateAsync(payload);
    setFeedback({ message: "Cita creada correctamente.", severity: "success" });
  };

  const handleUpdate = async (payload: {
    patientId: string;
    scheduledAt: string;
    notes?: string;
    status?: AppointmentStatus;
    modality: AppointmentModality;
    location?: string;
    meetingUrl?: string;
  }) => {
    if (!selectedAppointment) return;

    const requiresReconfirmation =
      selectedAppointment.status === AppointmentStatus.CONFIRMED &&
      (selectedAppointment.scheduledAt !== payload.scheduledAt ||
        selectedAppointment.modality !== payload.modality ||
        (selectedAppointment.location || undefined) !== payload.location ||
        (selectedAppointment.meetingUrl || undefined) !== payload.meetingUrl);

    await updateMutation.mutateAsync({
      appointmentId: selectedAppointment.id,
      payload: {
        scheduledAt: payload.scheduledAt,
        notes: payload.notes,
        status: payload.status,
        modality: payload.modality,
        location: payload.location,
        meetingUrl: payload.meetingUrl,
      },
    });

    setFeedback({
      message: requiresReconfirmation
        ? "La cita fue actualizada y volvió a estado Programada para reconfirmación."
        : "Cita actualizada correctamente.",
      severity: "success",
    });
  };

  const handleComplete = async (appointment: DoctorAppointment) => {
    try {
      await updateMutation.mutateAsync({
        appointmentId: appointment.id,
        payload: { status: AppointmentStatus.COMPLETED },
      });
      setFeedback({ message: "Cita marcada como completada.", severity: "success" });
    } catch (mutationError) {
      setFeedback({
        message:
          mutationError instanceof Error ? mutationError.message : "No se pudo completar la cita.",
        severity: "error",
      });
    }
  };

  const handleCancel = async (appointment: DoctorAppointment) => {
    const confirmed = window.confirm(
      `La cita de ${getPatientName(appointment)} del ${formatDate(appointment.scheduledAt)} pasará a cancelada.`,
    );
    if (!confirmed) return;

    try {
      await updateMutation.mutateAsync({
        appointmentId: appointment.id,
        payload: { status: AppointmentStatus.CANCELLED },
      });
      setFeedback({ message: "Cita cancelada correctamente.", severity: "success" });
    } catch (mutationError) {
      setFeedback({
        message:
          mutationError instanceof Error ? mutationError.message : "No se pudo cancelar la cita.",
        severity: "error",
      });
    }
  };

  const handleDaySelect = (date: string) => {
    setSelectedDay(date);
    setFrom(date);
    setTo(date);
    setIncludePast(true);
  };

  const handleClearDayFilter = () => {
    setSelectedDay(null);
    setFrom("");
    setTo("");
  };

  const moveCalendarMonth = (offset: number) => {
    const [year, monthIndex] = calendarMonth.split("-").map(Number);
    const nextDate = new Date(year, monthIndex - 1 + offset, 1);
    setCalendarMonth(getMonthValue(nextDate));
  };

  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Gestión de citas</h2>
            </div>
            <p className="text-sm text-gray-600">
              Agenda mensual, seguimiento de estados y cambios logísticos en una sola vista.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nueva cita
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Paciente</span>
                <select
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Todos</option>
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
                <span className="mb-2 block text-sm font-medium text-gray-700">Estado</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as AppointmentStatus | "")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Todos</option>
                  {APPOINTMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Desde</span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Hasta</span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </label>

              <label className="flex items-end">
                <span className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
                  <span>Incluir historial</span>
                  <input
                    type="checkbox"
                    checked={includePast}
                    onChange={(event) => setIncludePast(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </span>
              </label>
            </div>

            {selectedDay && (
              <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <span>Filtrando citas del día {selectedDay}.</span>
                <button
                  onClick={handleClearDayFilter}
                  className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  Limpiar día
                </button>
              </div>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-500">
                <Loader2 className="mr-3 h-6 w-6 animate-spin text-blue-600" />
                Cargando citas...
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error instanceof Error ? error.message : "No se pudieron cargar las citas."}
              </div>
            ) : appointments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  No hay citas para mostrar
                </h3>
                <p className="text-sm text-gray-600">
                  Ajusta filtros o crea una nueva cita para comenzar el seguimiento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment) => {
                  const isFinalized =
                    appointment.status === AppointmentStatus.CANCELLED ||
                    appointment.status === AppointmentStatus.COMPLETED;

                  return (
                    <div
                      key={appointment.id}
                      className="rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:border-gray-300"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.95fr)_auto]">
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Paciente
                            </p>
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {getPatientName(appointment)}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {appointment.patient?.email}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Fecha y Modalidad
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatDate(appointment.scheduledAt)}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {modalityLabels[appointment.modality]} ·{" "}
                              {appointment.modality === AppointmentModality.VIRTUAL
                                ? appointment.meetingUrl || "Sin URL"
                                : appointment.location || "Sin ubicación"}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Estado y Notas
                            </p>
                            <span
                              className={`mb-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}
                            >
                              {statusLabels[appointment.status]}
                            </span>
                            <p className="line-clamp-2 text-xs text-gray-600">
                              {appointment.notes || "Sin notas"}
                            </p>
                          </div>
                          <div className="justify-self-end">
                            <div
                              className="relative"
                              ref={
                                openActionsAppointmentId === appointment.id
                                  ? actionsMenuRef
                                  : undefined
                              }
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenActionsAppointmentId((currentId) =>
                                    currentId === appointment.id ? null : appointment.id,
                                  )
                                }
                                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                Acciones
                              </button>
                              {openActionsAppointmentId === appointment.id && (
                                <div className="absolute right-0 z-10 mt-2 w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                                  {!isFinalized && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionsAppointmentId(null);
                                        setSelectedAppointment(appointment);
                                        setIsModalOpen(true);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      <Pencil className="h-4 w-4" />
                                      Editar
                                    </button>
                                  )}

                                  {!isFinalized &&
                                    appointment.status !== AppointmentStatus.COMPLETED && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionsAppointmentId(null);
                                          handleComplete(appointment);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-green-700 hover:bg-green-50"
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                        Completar
                                      </button>
                                    )}

                                  {!isFinalized &&
                                    appointment.status !== AppointmentStatus.CANCELLED && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionsAppointmentId(null);
                                          handleCancel(appointment);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                                      >
                                        <Ban className="h-4 w-4" />
                                        Cancelar
                                      </button>
                                    )}

                                  {isFinalized && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionsAppointmentId(null);
                                        setSelectedAppointment(appointment);
                                        setIsModalOpen(true);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      <Pencil className="h-4 w-4" />
                                      Editar notas
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="rounded-xl border border-gray-200 bg-gray-50 p-4 xl:sticky xl:top-24 xl:self-start">
            <div className="mb-4 flex items-center justify-between gap-2">
              <button
                onClick={() => moveCalendarMonth(-1)}
                className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-100"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 text-center">
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {formatMonthLabel(calendarMonth)}
                </p>
                <p className="text-[11px] text-gray-500">Vista rápida mensual</p>
              </div>
              <button
                onClick={() => moveCalendarMonth(1)}
                className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-100"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <input
              type="month"
              value={calendarMonth}
              onChange={(event) => setCalendarMonth(event.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />

            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500">
              {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
                <div key={`${label}-${index}`}>{label}</div>
              ))}
            </div>

            {isLoadingCalendar ? (
              <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
                Cargando...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day) =>
                  day.date ? (
                    <button
                      key={day.key}
                      onClick={() => handleDaySelect(day.date!)}
                      className={`min-h-[48px] rounded-lg border px-1.5 py-1 text-center transition-colors ${
                        selectedDay === day.date
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="text-xs font-semibold text-gray-900">{day.day}</div>
                      <div className="mt-1 text-[10px] text-gray-500">
                        {calendarCounts.get(day.date) || 0}
                      </div>
                    </button>
                  ) : (
                    <div
                      key={day.key}
                      className="min-h-[48px] rounded-lg border border-transparent"
                    />
                  ),
                )}
              </div>
            )}
          </aside>
        </div>
      </section>

      <AppointmentFormModal
        isOpen={isModalOpen}
        patients={patients}
        appointment={selectedAppointment}
        notesOnly={
          selectedAppointment?.status === AppointmentStatus.CANCELLED ||
          selectedAppointment?.status === AppointmentStatus.COMPLETED
        }
        onClose={handleCloseModal}
        onSubmit={selectedAppointment ? handleUpdate : handleCreate}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <FeedbackSnackbar
        open={!!feedback}
        message={feedback?.message || ""}
        severity={feedback?.severity || "success"}
        onClose={() => setFeedback(null)}
      />
    </>
  );
};
