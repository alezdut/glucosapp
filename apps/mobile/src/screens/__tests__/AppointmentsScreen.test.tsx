import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Alert, type AlertButton } from "react-native";
import { AppointmentModality, AppointmentStatus, type PatientAppointment } from "@glucosapp/types";
import AppointmentsScreen from "../AppointmentsScreen";
import { renderMobile } from "../../../test/render-mobile";
import * as appointmentsHooks from "../../hooks/useAppointments";

const mockGoBack = jest.fn();

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("../../hooks/useAppointments", () => ({
  useMyAppointments: jest.fn(),
  useConfirmAppointment: jest.fn(),
  useCancelAppointment: jest.fn(),
}));

jest.mock("../../components/ScreenHeader", () => ({
  __esModule: true,
  default: ({ title, onBack }: { title: string; onBack?: () => void }) => (
    <div>
      <span>{title}</span>
      <button type="button" onClick={onBack}>
        back
      </button>
    </div>
  ),
}));

jest.mock("../../components/AppointmentCard", () => ({
  __esModule: true,
  default: ({
    appointment,
    onConfirm,
    onCancel,
  }: {
    appointment: PatientAppointment;
    onConfirm?: (appointmentId: string) => void;
    onCancel?: (appointmentId: string) => void;
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

const mockUseMyAppointments = appointmentsHooks.useMyAppointments as jest.MockedFunction<
  typeof appointmentsHooks.useMyAppointments
>;
const mockUseConfirmAppointment = appointmentsHooks.useConfirmAppointment as jest.MockedFunction<
  typeof appointmentsHooks.useConfirmAppointment
>;
const mockUseCancelAppointment = appointmentsHooks.useCancelAppointment as jest.MockedFunction<
  typeof appointmentsHooks.useCancelAppointment
>;

const baseAppointment = {
  doctorId: "doctor-1",
  patientId: "patient-1",
  notes: "Traer registro de glucosa",
  modality: AppointmentModality.IN_PERSON,
  location: "Consultorio 3",
  createdAt: "2026-04-01T08:00:00.000Z",
  updatedAt: "2026-04-01T08:00:00.000Z",
  doctor: {
    id: "doctor-1",
    email: "doctor@example.com",
    firstName: "Lucía",
    lastName: "Fernández",
  },
} satisfies Omit<PatientAppointment, "id" | "scheduledAt" | "status">;

function buildAppointment(
  overrides: Partial<PatientAppointment> &
    Pick<PatientAppointment, "id" | "scheduledAt" | "status">,
): PatientAppointment {
  return {
    ...baseAppointment,
    ...overrides,
  };
}

describe("AppointmentsScreen", () => {
  const confirmMutateAsync = jest.fn();
  const cancelMutateAsync = jest.fn();
  const alertSpy = jest.spyOn(Alert, "alert");
  const now = new Date("2026-04-10T12:00:00.000Z").getTime();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(now);
    alertSpy.mockImplementation(jest.fn());
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows a loading state while appointments are resolving", () => {
    mockUseMyAppointments.mockReturnValue({
      data: [],
      isLoading: true,
    } as never);

    renderMobile(<AppointmentsScreen navigation={{ goBack: mockGoBack } as never} />);

    expect(screen.getByTestId("activity-indicator")).toBeTruthy();
  });

  it("renders upcoming, future, and archived appointments and handles confirm/cancel actions", async () => {
    const appointments = [
      buildAppointment({
        id: "next",
        scheduledAt: "2026-04-10T13:00:00.000Z",
        status: AppointmentStatus.SCHEDULED,
      }),
      buildAppointment({
        id: "future",
        scheduledAt: "2026-04-11T09:00:00.000Z",
        status: AppointmentStatus.CONFIRMED,
      }),
      buildAppointment({
        id: "archived-1",
        scheduledAt: "2026-04-09T10:00:00.000Z",
        status: AppointmentStatus.COMPLETED,
      }),
      buildAppointment({
        id: "archived-2",
        scheduledAt: "2026-04-08T10:00:00.000Z",
        status: AppointmentStatus.CANCELLED,
      }),
    ];

    mockUseMyAppointments.mockReturnValue({
      data: appointments,
      isLoading: false,
    } as never);

    renderMobile(<AppointmentsScreen navigation={{ goBack: mockGoBack } as never} />);

    expect(screen.getByText("Citas")).toBeTruthy();
    expect(screen.getByText("Próxima cita")).toBeTruthy();
    expect(screen.getByText("Más adelante")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("Citas anteriores")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();

    expect(screen.queryByText("archived-1")).toBeNull();
    fireEvent.click(screen.getByText("Citas anteriores"));
    expect(screen.getByText("archived-1")).toBeTruthy();
    expect(screen.getByText("archived-2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "confirm next" }));
    fireEvent.click(screen.getByRole("button", { name: "cancel next" }));

    const confirmAlert = alertSpy.mock.calls.find(([title]) => title === "Confirmar cita");
    const cancelAlert = alertSpy.mock.calls.find(([title]) => title === "Cancelar cita");

    expect(confirmAlert).toBeTruthy();
    expect(cancelAlert).toBeTruthy();

    const confirmButtons = confirmAlert?.[2] as AlertButton[] | undefined;
    const cancelButtons = cancelAlert?.[2] as AlertButton[] | undefined;

    await confirmButtons?.[1]?.onPress?.();
    await cancelButtons?.[1]?.onPress?.();

    await waitFor(() => {
      expect(confirmMutateAsync).toHaveBeenCalledWith("next");
      expect(cancelMutateAsync).toHaveBeenCalledWith("next");
    });
  });

  it("shows the empty state when there are no appointments", () => {
    renderMobile(<AppointmentsScreen navigation={{ goBack: mockGoBack } as never} />);

    expect(screen.getByText("Nada más por mostrar")).toBeTruthy();
    expect(screen.getByText("Todavía no tienes citas registradas.")).toBeTruthy();
  });
});
