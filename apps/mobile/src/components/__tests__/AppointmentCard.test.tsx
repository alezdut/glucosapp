import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { AppointmentModality, AppointmentStatus, type PatientAppointment } from "@glucosapp/types";
import { Alert, Share } from "react-native";
import AppointmentCard from "../AppointmentCard";
import { renderMobile } from "../../../test/render-mobile";

jest.mock("../../lib/appointments-api", () => ({
  isAppointmentConfirmable: (status: string) => status === "SCHEDULED",
  isAppointmentCancelable: (status: string) => status === "SCHEDULED" || status === "CONFIRMED",
}));

const baseAppointment: PatientAppointment = {
  id: "appt-1",
  doctorId: "doctor-1",
  patientId: "patient-1",
  scheduledAt: "2026-04-15T12:30:00.000Z",
  notes: "Traer últimos análisis",
  status: AppointmentStatus.SCHEDULED,
  modality: AppointmentModality.IN_PERSON,
  location: "Consultorio 201",
  createdAt: "2026-04-01T08:00:00.000Z",
  updatedAt: "2026-04-01T08:00:00.000Z",
  doctor: {
    id: "doctor-1",
    email: "doctor@example.com",
    firstName: "Lucía",
    lastName: "Fernández",
  },
};

describe("AppointmentCard", () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders scheduled in-person appointment details and executes confirm/cancel actions", () => {
    renderMobile(
      <AppointmentCard appointment={baseAppointment} onConfirm={onConfirm} onCancel={onCancel} />,
    );

    expect(screen.getByText("Programada")).toBeTruthy();
    expect(screen.getByText("Lucía Fernández")).toBeTruthy();
    expect(screen.getByText("Traer últimos análisis")).toBeTruthy();
    expect(screen.getByText("Modalidad: Presencial")).toBeTruthy();
    expect(screen.getByText("Consultorio 201")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onConfirm).toHaveBeenCalledWith("appt-1");
    expect(onCancel).toHaveBeenCalledWith("appt-1");
  });

  it("renders a virtual confirmed appointment and shares meeting URL", async () => {
    const shareSpy = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: "sharedAction" } as never);

    const appointment: PatientAppointment = {
      ...baseAppointment,
      status: AppointmentStatus.CONFIRMED,
      modality: AppointmentModality.VIRTUAL,
      location: undefined,
      meetingUrl: "https://meet.example.com/abc",
      notes: undefined,
    };

    renderMobile(
      <AppointmentCard appointment={appointment} onConfirm={onConfirm} onCancel={onCancel} />,
    );

    expect(screen.getByText("Confirmada")).toBeTruthy();
    expect(screen.getByText("Modalidad: Virtual")).toBeTruthy();
    expect(screen.getByText("https://meet.example.com/abc")).toBeTruthy();

    expect(screen.queryByRole("button", { name: /confirmar/i })).toBeNull();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeTruthy();

    fireEvent.click(screen.getByText("https://meet.example.com/abc"));

    expect(shareSpy).toHaveBeenCalledWith({
      message: "https://meet.example.com/abc",
      url: "https://meet.example.com/abc",
    });
  });

  it("shows fallback labels and no action buttons for cancelled appointments", () => {
    const appointment: PatientAppointment = {
      ...baseAppointment,
      status: AppointmentStatus.CANCELLED,
      scheduledAt: "fecha-no-valida",
      notes: undefined,
      modality: AppointmentModality.IN_PERSON,
      location: undefined,
      doctor: {
        id: "doctor-1",
        email: "doctor@example.com",
      },
    };

    renderMobile(
      <AppointmentCard appointment={appointment} onConfirm={onConfirm} onCancel={onCancel} />,
    );

    expect(screen.getByText("Cancelada")).toBeTruthy();
    expect(screen.getByText("fecha-no-valida")).toBeTruthy();
    expect(screen.getByText("doctor@example.com")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /confirmar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /cancelar/i })).toBeNull();
  });

  it("shows an alert if meeting URL sharing fails", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Share, "share").mockRejectedValue(new Error("share failed"));

    const appointment: PatientAppointment = {
      ...baseAppointment,
      modality: AppointmentModality.VIRTUAL,
      meetingUrl: "https://meet.example.com/error",
      location: undefined,
    };

    renderMobile(
      <AppointmentCard appointment={appointment} onConfirm={onConfirm} onCancel={onCancel} />,
    );

    fireEvent.click(screen.getByText("https://meet.example.com/error"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "No se pudo compartir el enlace",
        "Intenta nuevamente.",
      );
    });
  });
});
