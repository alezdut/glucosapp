"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppointmentModality, AppointmentStatus } from "@glucosapp/types";
import { AppointmentFormModal } from "../AppointmentFormModal";

const patients = [
  { id: "patient-1", firstName: "Ana", lastName: "Paz", email: "ana@example.com" },
  { id: "patient-2", firstName: "", lastName: "", email: "fallback@example.com" },
];

describe("AppointmentFormModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: new Date("2026-04-10T06:00:00Z").getTime() });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not render when closed", () => {
    render(
      <AppointmentFormModal
        isOpen={false}
        patients={patients as never}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.queryByText(/nueva cita/i)).not.toBeInTheDocument();
  });

  it("validates required fields before submitting", async () => {
    const onSubmit = jest.fn();
    const { rerender } = render(
      <AppointmentFormModal isOpen patients={[]} onClose={jest.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /crear cita/i }));
    expect(screen.getByText("Selecciona un paciente.")).toBeInTheDocument();

    rerender(
      <AppointmentFormModal
        isOpen
        patients={patients as never}
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /crear cita/i }));
    expect(screen.getByText(/selecciona fecha y hora/i)).toBeInTheDocument();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits an in-person appointment with normalized notes and location", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(
      <AppointmentFormModal
        isOpen
        patients={patients as never}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /paciente/i }), {
      target: { value: "patient-2" },
    });
    fireEvent.change(screen.getByLabelText(/fecha y hora/i), {
      target: { value: "2026-04-10T10:30" },
    });
    fireEvent.change(screen.getByLabelText(/ubicación/i), {
      target: { value: "  Consultorio 2  " },
    });
    fireEvent.change(screen.getByLabelText(/notas/i), {
      target: { value: "  Seguimiento trimestral  " },
    });

    fireEvent.click(screen.getByRole("button", { name: /crear cita/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      patientId: "patient-2",
      scheduledAt: new Date("2026-04-10T10:30").toISOString(),
      notes: "Seguimiento trimestral",
      modality: AppointmentModality.IN_PERSON,
      location: "Consultorio 2",
      meetingUrl: undefined,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("submits virtual editing changes and warns about reconfirmation", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const appointment = {
      id: "apt-1",
      patientId: "patient-1",
      scheduledAt: "2026-04-10T12:00:00.000Z",
      notes: "Initial",
      status: AppointmentStatus.CONFIRMED,
      modality: AppointmentModality.IN_PERSON,
      location: "Consultorio",
      patient: patients[0],
    };

    render(
      <AppointmentFormModal
        isOpen
        patients={patients as never}
        appointment={appointment as never}
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /modalidad/i }), {
      target: { value: AppointmentModality.VIRTUAL },
    });
    fireEvent.change(screen.getByLabelText(/url de acceso/i), {
      target: { value: " https://meet.example/visit " },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /estado/i }), {
      target: { value: AppointmentStatus.CANCELLED },
    });

    expect(screen.getByText(/volverá a quedar/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      patientId: "patient-1",
      scheduledAt: "2026-04-10T12:00:00.000Z",
      notes: "Initial",
      modality: AppointmentModality.VIRTUAL,
      location: undefined,
      meetingUrl: "https://meet.example/visit",
      status: AppointmentStatus.CANCELLED,
    });
  });

  it("shows notes-only state and submit errors", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("save failed"));
    const appointment = {
      id: "apt-2",
      patientId: "patient-1",
      scheduledAt: "2026-04-10T12:00:00.000Z",
      notes: "",
      status: AppointmentStatus.COMPLETED,
      modality: AppointmentModality.VIRTUAL,
      meetingUrl: "https://meet.example/old",
      patient: patients[0],
    };

    render(
      <AppointmentFormModal
        isOpen
        patients={patients as never}
        appointment={appointment as never}
        notesOnly
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText(/solo se pueden editar las notas/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /paciente/i })).toBeDisabled();
    expect(screen.getByLabelText(/fecha y hora/i)).toBeDisabled();
    expect(screen.getByRole("combobox", { name: /modalidad/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/notas/i), {
      target: { value: "Nueva nota" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("save failed")).toBeInTheDocument();
  });
});
