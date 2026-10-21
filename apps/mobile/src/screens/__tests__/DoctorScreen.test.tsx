import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Alert, type AlertButton } from "react-native";
import { AppointmentModality, AppointmentStatus, type PatientAppointment } from "@glucosapp/types";
import DoctorScreen from "../DoctorScreen";
import { renderMobile } from "../../../test/render-mobile";
import * as reactQuery from "@tanstack/react-query";
import * as appointmentHooks from "../../hooks/useAppointments";
import { createApiClient } from "../../lib/api";

const mockNavigate = jest.fn();

let mockDoctorInfo: unknown = null;
let mockProfile: Record<string, unknown> | undefined;
let mockWeeklyGlucose: Record<string, unknown> | undefined;
let mockDailyInsulin: Record<string, unknown> | undefined;
let mockGlucoseTrend: Record<string, unknown> | undefined;

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("../../lib/api", () => ({
  createApiClient: jest.fn(),
}));

jest.mock("../../components/GlucoseChart", () => ({
  GlucoseChart: () => <span>mock-glucose-chart</span>,
}));

jest.mock("../../components/AppointmentCard", () => ({
  __esModule: true,
  default: ({
    appointment,
    onConfirm,
    onCancel,
  }: {
    appointment: PatientAppointment;
    onConfirm?: (id: string) => void;
    onCancel?: (id: string) => void;
  }) => (
    <div>
      <span>{appointment.id}</span>
      <button type="button" onClick={() => onConfirm?.(appointment.id)}>
        confirm {appointment.id}
      </button>
      <button type="button" onClick={() => onCancel?.(appointment.id)}>
        cancel {appointment.id}
      </button>
    </div>
  ),
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");

  return {
    ...actual,
    useQuery: jest.fn(),
  };
});

jest.mock("../../hooks/useAppointments", () => ({
  useMyAppointments: jest.fn(),
  useConfirmAppointment: jest.fn(),
  useCancelAppointment: jest.fn(),
}));

const mockUseQuery = reactQuery.useQuery as jest.MockedFunction<typeof reactQuery.useQuery>;
const mockCreateApiClient = createApiClient as jest.MockedFunction<typeof createApiClient>;
const mockUseMyAppointments = appointmentHooks.useMyAppointments as jest.MockedFunction<
  typeof appointmentHooks.useMyAppointments
>;
const mockUseConfirmAppointment = appointmentHooks.useConfirmAppointment as jest.MockedFunction<
  typeof appointmentHooks.useConfirmAppointment
>;
const mockUseCancelAppointment = appointmentHooks.useCancelAppointment as jest.MockedFunction<
  typeof appointmentHooks.useCancelAppointment
>;

const confirmMutateAsync = jest.fn();
const cancelMutateAsync = jest.fn();

const baseAppointment: Omit<PatientAppointment, "id" | "scheduledAt" | "status"> = {
  doctorId: "doctor-1",
  patientId: "patient-1",
  notes: "Revisión trimestral",
  modality: AppointmentModality.IN_PERSON,
  location: "Consultorio 12",
  createdAt: "2026-04-01T08:00:00.000Z",
  updatedAt: "2026-04-01T08:00:00.000Z",
  doctor: {
    id: "doctor-1",
    email: "doctor@example.com",
    firstName: "Lucía",
    lastName: "Fernández",
  },
};

describe("DoctorScreen", () => {
  const alertSpy = jest.spyOn(Alert, "alert");

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockImplementation(jest.fn());

    mockDoctorInfo = null;
    mockProfile = {
      minTargetGlucose: 80,
      maxTargetGlucose: 140,
      icRatioBreakfast: 12,
      icRatioLunch: 10,
      icRatioDinner: 11,
      insulinSensitivityFactor: 45,
      diaHours: 4,
      mealTimeBreakfastStart: 420,
      mealTimeBreakfastEnd: 540,
      mealTimeLunchStart: 720,
      mealTimeLunchEnd: 840,
      mealTimeDinnerStart: 1140,
      mealTimeDinnerEnd: 1320,
    };
    mockWeeklyGlucose = { averageGlucose: 123 };
    mockDailyInsulin = { averageDose: 21 };
    mockGlucoseTrend = {
      data: [
        { date: "2026-04-01", averageGlucose: 120 },
        { date: "2026-04-02", averageGlucose: 130 },
      ],
    };

    mockUseQuery.mockImplementation(({ queryKey }) => {
      const key = queryKey[0];

      if (key === "my-doctor") {
        return { data: mockDoctorInfo, isLoading: false } as never;
      }
      if (key === "profile") {
        return { data: mockProfile, isLoading: false } as never;
      }
      if (key === "weekly-glucose-average") {
        return { data: mockWeeklyGlucose, isLoading: false } as never;
      }
      if (key === "daily-insulin-average") {
        return { data: mockDailyInsulin, isLoading: false } as never;
      }
      if (key === "glucose-trend") {
        return { data: mockGlucoseTrend, isLoading: false } as never;
      }

      return { data: undefined, isLoading: false } as never;
    });

    mockUseMyAppointments.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    mockUseConfirmAppointment.mockReturnValue({
      mutateAsync: confirmMutateAsync,
      isPending: false,
    } as never);
    mockUseCancelAppointment.mockReturnValue({
      mutateAsync: cancelMutateAsync,
      isPending: false,
    } as never);

    confirmMutateAsync.mockResolvedValue(undefined);
    cancelMutateAsync.mockResolvedValue(undefined);
    jest.spyOn(Date, "now").mockReturnValue(new Date("2026-04-10T08:00:00.000Z").getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows loading when queries are still resolving", () => {
    mockUseQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "my-doctor") {
        return { data: undefined, isLoading: true } as never;
      }
      return { data: undefined, isLoading: false } as never;
    });

    renderMobile(<DoctorScreen />);

    expect(screen.getByTestId("activity-indicator")).toBeTruthy();
  });

  it("renders no-doctor state and report cards", () => {
    renderMobile(<DoctorScreen />);

    expect(screen.getByText("Doctor y Parámetros")).toBeTruthy();
    expect(screen.getByText("123mg/dL")).toBeTruthy();
    expect(screen.getByText("21U")).toBeTruthy();
    expect(screen.getByText("mock-glucose-chart")).toBeTruthy();
    expect(screen.getByText("No tienes médico asignado")).toBeTruthy();
  });

  it("renders doctor data, navigates to key flows, and handles appointment actions", async () => {
    mockDoctorInfo = {
      createdAt: "2026-04-01T08:00:00.000Z",
      doctor: {
        id: "doctor-1",
        email: "doctor@example.com",
        firstName: "Lucía",
        lastName: "Fernández",
      },
    };

    mockUseMyAppointments.mockReturnValue({
      data: [
        {
          ...baseAppointment,
          id: "appt-1",
          scheduledAt: "2026-04-11T09:00:00.000Z",
          status: AppointmentStatus.SCHEDULED,
        },
      ],
      isLoading: false,
    } as never);

    renderMobile(<DoctorScreen />);

    expect(screen.getByText("Información del Médico")).toBeTruthy();
    expect(screen.getByText("Lucía Fernández")).toBeTruthy();
    expect(screen.getByText("doctor@example.com")).toBeTruthy();
    expect(screen.getByText("Tus Citas")).toBeTruthy();
    expect(screen.getByText("appt-1")).toBeTruthy();

    fireEvent.click(screen.getByText("Ver todas"));
    fireEvent.click(screen.getByText("Enviar mensaje al doctor"));

    expect(mockNavigate).toHaveBeenCalledWith("Appointments");
    expect(mockNavigate).toHaveBeenCalledWith("Communication");

    fireEvent.click(screen.getByRole("button", { name: "confirm appt-1" }));
    fireEvent.click(screen.getByRole("button", { name: "cancel appt-1" }));

    const confirmAlert = alertSpy.mock.calls.find(([title]) => title === "Confirmar cita");
    const cancelAlert = alertSpy.mock.calls.find(([title]) => title === "Cancelar cita");

    const confirmButtons = confirmAlert?.[2] as AlertButton[] | undefined;
    const cancelButtons = cancelAlert?.[2] as AlertButton[] | undefined;

    await confirmButtons?.[1]?.onPress?.();
    await cancelButtons?.[1]?.onPress?.();

    await waitFor(() => {
      expect(confirmMutateAsync).toHaveBeenCalledWith("appt-1");
      expect(cancelMutateAsync).toHaveBeenCalledWith("appt-1");
    });
  });

  it("shows loading and empty states for appointments when doctor exists", () => {
    mockDoctorInfo = {
      createdAt: "2026-04-01T08:00:00.000Z",
      doctor: {
        id: "doctor-1",
        email: "doctor@example.com",
      },
    };

    mockUseMyAppointments.mockReturnValue({
      data: [],
      isLoading: true,
    } as never);

    renderMobile(<DoctorScreen />);

    expect(screen.getByText("Información del Médico")).toBeTruthy();
    expect(screen.getAllByTestId("activity-indicator").length).toBeGreaterThan(0);

    mockUseMyAppointments.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    renderMobile(<DoctorScreen />);

    expect(screen.getByText("Sin citas programadas")).toBeTruthy();
  });

  it("shows upcoming-empty state when appointments exist but none are pending in the future", () => {
    mockDoctorInfo = {
      createdAt: "2026-04-01T08:00:00.000Z",
      doctor: {
        id: "doctor-1",
        email: "doctor@example.com",
      },
    };

    mockUseMyAppointments.mockReturnValue({
      data: [
        {
          ...baseAppointment,
          id: "appt-archived",
          scheduledAt: "2026-04-08T09:00:00.000Z",
          status: AppointmentStatus.CANCELLED,
        },
      ],
      isLoading: false,
    } as never);

    renderMobile(<DoctorScreen />);

    expect(screen.getByText("No tienes citas futuras pendientes.")).toBeTruthy();
  });

  it("shows mutation error alerts when confirm or cancel fail", async () => {
    mockDoctorInfo = {
      createdAt: "2026-04-01T08:00:00.000Z",
      doctor: {
        id: "doctor-1",
        email: "doctor@example.com",
      },
    };

    confirmMutateAsync.mockRejectedValue(new Error("confirm failed"));
    cancelMutateAsync.mockRejectedValue(new Error("cancel failed"));

    mockUseMyAppointments.mockReturnValue({
      data: [
        {
          ...baseAppointment,
          id: "appt-error",
          scheduledAt: "2026-04-11T09:00:00.000Z",
          status: AppointmentStatus.SCHEDULED,
        },
      ],
      isLoading: false,
    } as never);

    renderMobile(<DoctorScreen />);

    fireEvent.click(screen.getByRole("button", { name: "confirm appt-error" }));
    fireEvent.click(screen.getByRole("button", { name: "cancel appt-error" }));

    const confirmAlert = alertSpy.mock.calls.find(([title]) => title === "Confirmar cita");
    const cancelAlert = alertSpy.mock.calls.find(([title]) => title === "Cancelar cita");
    const confirmButtons = confirmAlert?.[2] as AlertButton[] | undefined;
    const cancelButtons = cancelAlert?.[2] as AlertButton[] | undefined;

    await confirmButtons?.[1]?.onPress?.();
    await cancelButtons?.[1]?.onPress?.();

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("No se pudo confirmar", "confirm failed");
      expect(alertSpy).toHaveBeenCalledWith("No se pudo cancelar", "cancel failed");
    });
  });

  it("falls back to doctor email when full name is unavailable", () => {
    mockDoctorInfo = {
      createdAt: "2026-04-01T08:00:00.000Z",
      doctor: {
        id: "doctor-1",
        email: "doctor-fallback@example.com",
      },
    };

    renderMobile(<DoctorScreen />);

    expect(screen.getAllByText("doctor-fallback@example.com").length).toBeGreaterThanOrEqual(2);
  });

  it("shows raw assignment date when backend date format is invalid", () => {
    mockDoctorInfo = {
      createdAt: "bad-date-value",
      doctor: {
        id: "doctor-1",
        email: "doctor-invalid-date@example.com",
        firstName: "Laura",
        lastName: "Campos",
      },
    };

    renderMobile(<DoctorScreen />);

    expect(screen.getByText("bad-date-value")).toBeTruthy();
  });

  it("uses generic messages when mutation failures are not Error instances", async () => {
    mockDoctorInfo = {
      createdAt: "2026-04-01T08:00:00.000Z",
      doctor: {
        id: "doctor-1",
        email: "doctor-1@example.com",
      },
    };

    confirmMutateAsync.mockRejectedValue("confirm-string-error");
    cancelMutateAsync.mockRejectedValue({ reason: "cancel-object-error" });

    mockUseMyAppointments.mockReturnValue({
      data: [
        {
          ...baseAppointment,
          id: "appt-generic-errors",
          scheduledAt: "2026-04-11T09:00:00.000Z",
          status: AppointmentStatus.SCHEDULED,
        },
      ],
      isLoading: false,
    } as never);

    renderMobile(<DoctorScreen />);

    fireEvent.click(screen.getByRole("button", { name: "confirm appt-generic-errors" }));
    fireEvent.click(screen.getByRole("button", { name: "cancel appt-generic-errors" }));

    const confirmAlert = alertSpy.mock.calls.find(([title]) => title === "Confirmar cita");
    const cancelAlert = alertSpy.mock.calls.find(([title]) => title === "Cancelar cita");
    const confirmButtons = confirmAlert?.[2] as AlertButton[] | undefined;
    const cancelButtons = cancelAlert?.[2] as AlertButton[] | undefined;

    await confirmButtons?.[1]?.onPress?.();
    await cancelButtons?.[1]?.onPress?.();

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("No se pudo confirmar", "Intenta nuevamente.");
      expect(alertSpy).toHaveBeenCalledWith("No se pudo cancelar", "Intenta nuevamente.");
    });
  });

  it("executes doctor-related query functions and retry policy branches", async () => {
    mockUseQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === "my-doctor") {
        return { data: null, isLoading: false } as never;
      }
      return { data: {}, isLoading: false } as never;
    });

    const GET = jest.fn(async (path: string) => {
      if (path === "/profile/doctor") {
        return {
          data: {
            id: "doc-link",
            doctorId: "doctor-1",
            patientId: "patient-1",
            createdAt: "2026-04-01T08:00:00.000Z",
            doctor: { id: "doctor-1", email: "doctor@example.com" },
          },
        };
      }
      if (path === "/profile") {
        return { data: { minTargetGlucose: 85, maxTargetGlucose: 135 } };
      }
      if (path === "/statistics/weekly-glucose-average") {
        return { data: { averageGlucose: 122 } };
      }
      if (path === "/statistics/daily-insulin-average") {
        return { data: { averageDose: 19 } };
      }
      if (path === "/statistics/glucose-trend") {
        return { data: { data: [{ date: "2026-04-01", averageGlucose: 120 }] } };
      }
      return { data: null };
    });

    mockCreateApiClient.mockReturnValue({ GET } as never);

    renderMobile(<DoctorScreen />);

    const findOptions = (key: string) =>
      mockUseQuery.mock.calls.find((call) => call[0].queryKey[0] === key)?.[0] as {
        queryFn: () => Promise<unknown>;
        retry?: (failureCount: number, error: unknown) => boolean;
      };

    await expect(findOptions("my-doctor").queryFn()).resolves.toMatchObject({
      doctorId: "doctor-1",
    });
    await expect(findOptions("profile").queryFn()).resolves.toMatchObject({ minTargetGlucose: 85 });
    await expect(findOptions("weekly-glucose-average").queryFn()).resolves.toMatchObject({
      averageGlucose: 122,
    });
    await expect(findOptions("daily-insulin-average").queryFn()).resolves.toMatchObject({
      averageDose: 19,
    });
    await expect(findOptions("glucose-trend").queryFn()).resolves.toMatchObject({
      data: [{ date: "2026-04-01", averageGlucose: 120 }],
    });

    expect(findOptions("my-doctor").retry?.(0, { status: 404 })).toBe(false);
    expect(findOptions("my-doctor").retry?.(0, { status: 500 })).toBe(true);
    expect(findOptions("my-doctor").retry?.(3, { status: 500 })).toBe(false);
  });

  it("renders doctor sections without chart or parameters when trend and profile are missing", () => {
    mockDoctorInfo = {
      createdAt: "2026-04-01T08:00:00.000Z",
      doctor: {
        id: "doctor-1",
        email: "doctor@example.com",
      },
    };
    mockProfile = undefined;
    mockGlucoseTrend = { data: [] };

    renderMobile(<DoctorScreen />);

    expect(screen.getByText("Información del Médico")).toBeTruthy();
    expect(screen.getAllByText("doctor@example.com").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Comunicación")).toBeTruthy();
    expect(screen.getByText("Enviar mensaje al doctor")).toBeTruthy();
    expect(screen.queryByText("Parámetros de Dosis")).toBeNull();
    expect(screen.queryByText("mock-glucose-chart")).toBeNull();
  });
});
