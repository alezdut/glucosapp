"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppointmentModality, AppointmentStatus } from "@glucosapp/types";
import { AppointmentsManager } from "../AppointmentsManager";
import { usePatients } from "@/hooks/usePatients";
import {
  useCreateDoctorAppointment,
  useDoctorAppointments,
  useUpdateDoctorAppointment,
} from "@/hooks/useAppointments";

const mockAppointmentFormModal = jest.fn();
const mockFeedbackSnackbar = jest.fn();

jest.mock("@/hooks/usePatients", () => ({
  usePatients: jest.fn(),
}));

jest.mock("@/hooks/useAppointments", () => ({
  APPOINTMENT_STATUS_OPTIONS: [
    { value: "SCHEDULED", label: "Programada" },
    { value: "CONFIRMED", label: "Confirmada" },
    { value: "COMPLETED", label: "Completada" },
    { value: "CANCELLED", label: "Cancelada" },
  ],
  useCreateDoctorAppointment: jest.fn(),
  useDoctorAppointments: jest.fn(),
  useUpdateDoctorAppointment: jest.fn(),
}));

jest.mock("@/components/dashboard/AppointmentFormModal", () => ({
  AppointmentFormModal: (props: unknown) => {
    mockAppointmentFormModal(props);
    const typedProps = props as {
      isOpen: boolean;
      notesOnly?: boolean;
      appointment?: { id: string } | null;
      onSubmit: (payload: {
        patientId: string;
        scheduledAt: string;
        modality: AppointmentModality;
      }) => Promise<void>;
      onClose: () => void;
    };

    if (!typedProps.isOpen) {
      return null;
    }

    return (
      <div>
        <span>Modal abierta {typedProps.appointment?.id || "new"}</span>
        <span>notes-only:{String(typedProps.notesOnly)}</span>
        <button
          onClick={() =>
            typedProps.onSubmit({
              patientId: "patient-1",
              scheduledAt: "2026-04-14T10:00:00.000Z",
              modality: AppointmentModality.VIRTUAL,
            })
          }
        >
          submit modal
        </button>
        <button onClick={typedProps.onClose}>close modal</button>
      </div>
    );
  },
}));

jest.mock("@/components/FeedbackSnackbar", () => ({
  FeedbackSnackbar: (props: unknown) => {
    mockFeedbackSnackbar(props);
    const typedProps = props as { open: boolean; message: string; severity: string };
    return typedProps.open ? <div>{`${typedProps.severity}:${typedProps.message}`}</div> : null;
  },
}));

const mockUsePatients = usePatients as jest.MockedFunction<typeof usePatients>;
const mockUseDoctorAppointments = useDoctorAppointments as jest.MockedFunction<
  typeof useDoctorAppointments
>;
const mockUseCreateDoctorAppointment = useCreateDoctorAppointment as jest.MockedFunction<
  typeof useCreateDoctorAppointment
>;
const mockUseUpdateDoctorAppointment = useUpdateDoctorAppointment as jest.MockedFunction<
  typeof useUpdateDoctorAppointment
>;

const patients = [
  { id: "patient-1", firstName: "Ana", lastName: "Paz", email: "ana@example.com" },
  { id: "patient-2", firstName: "Luis", lastName: "Vega", email: "luis@example.com" },
];

const appointments = [
  {
    id: "apt-1",
    patientId: "patient-1",
    scheduledAt: "2026-04-14T10:00:00.000Z",
    notes: "Seguimiento",
    status: AppointmentStatus.CONFIRMED,
    modality: AppointmentModality.VIRTUAL,
    meetingUrl: "https://meet.example/1",
    patient: patients[0],
  },
  {
    id: "apt-2",
    patientId: "patient-2",
    scheduledAt: "2026-04-20T12:00:00.000Z",
    notes: "",
    status: AppointmentStatus.COMPLETED,
    modality: AppointmentModality.IN_PERSON,
    location: "Consultorio",
    patient: patients[1],
  },
];

describe("AppointmentsManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePatients.mockReturnValue({ data: patients } as never);
    mockUseCreateDoctorAppointment.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    } as never);
    mockUseUpdateDoctorAppointment.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    } as never);
    mockUseDoctorAppointments.mockImplementation((filters?: Record<string, unknown>) => {
      const isCalendarQuery =
        typeof filters?.from === "string" &&
        typeof filters?.to === "string" &&
        filters.includePast === true;

      return {
        data: isCalendarQuery ? appointments : appointments,
        isLoading: false,
        error: null,
      } as never;
    });
    jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders appointments, day filters and creates a new appointment", async () => {
    const createMutation = jest.fn().mockResolvedValue({});
    mockUseCreateDoctorAppointment.mockReturnValue({
      mutateAsync: createMutation,
      isPending: false,
    } as never);

    render(<AppointmentsManager />);

    expect(screen.getByText(/gestión de citas/i)).toBeInTheDocument();
    expect(screen.getAllByText("Ana Paz")).not.toHaveLength(0);
    expect(screen.getByText(/virtual/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /nueva cita/i }));
    expect(screen.getByText("Modal abierta new")).toBeInTheDocument();

    fireEvent.click(screen.getByText("submit modal"));

    await waitFor(() => expect(createMutation).toHaveBeenCalledWith(expect.any(Object)));
    expect(createMutation).toHaveBeenCalledWith({
      patientId: "patient-1",
      scheduledAt: "2026-04-14T10:00:00.000Z",
      modality: AppointmentModality.VIRTUAL,
    });
    expect(await screen.findByText(/success:cita creada correctamente/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "14 1" }));
    expect(screen.getByText(/filtrando citas del día/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /limpiar día/i }));
    expect(screen.queryByText(/filtrando citas del día/i)).not.toBeInTheDocument();
  });

  it("shows loading, error and empty states", () => {
    mockUseDoctorAppointments.mockReturnValueOnce({
      data: [],
      isLoading: true,
      error: null,
    } as never);
    mockUseDoctorAppointments.mockReturnValueOnce({
      data: [],
      isLoading: false,
      error: null,
    } as never);

    const { rerender } = render(<AppointmentsManager />);
    expect(screen.getByText(/cargando citas/i)).toBeInTheDocument();

    mockUseDoctorAppointments.mockReturnValueOnce({
      data: [],
      isLoading: false,
      error: new Error("fetch failed"),
    } as never);
    mockUseDoctorAppointments.mockReturnValueOnce({
      data: [],
      isLoading: false,
      error: null,
    } as never);
    rerender(<AppointmentsManager />);
    expect(screen.getByText("fetch failed")).toBeInTheDocument();

    mockUseDoctorAppointments.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as never);
    rerender(<AppointmentsManager />);
    expect(screen.getByText(/no hay citas para mostrar/i)).toBeInTheDocument();
  });

  it("handles complete, cancel and notes-only editing flows", async () => {
    const updateMutation = jest.fn().mockResolvedValue({});
    mockUseUpdateDoctorAppointment.mockReturnValue({
      mutateAsync: updateMutation,
      isPending: false,
    } as never);

    render(<AppointmentsManager />);

    fireEvent.click(screen.getAllByRole("button", { name: /acciones/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /completar/i }));

    await waitFor(() =>
      expect(updateMutation).toHaveBeenCalledWith({
        appointmentId: "apt-1",
        payload: { status: AppointmentStatus.COMPLETED },
      }),
    );
    expect(await screen.findByText(/success:cita marcada como completada/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /acciones/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    await waitFor(() =>
      expect(updateMutation).toHaveBeenCalledWith({
        appointmentId: "apt-1",
        payload: { status: AppointmentStatus.CANCELLED },
      }),
    );

    fireEvent.click(screen.getAllByRole("button", { name: /acciones/i })[1]);
    fireEvent.click(screen.getByRole("button", { name: /editar notas/i }));
    expect(screen.getByText("Modal abierta apt-2")).toBeInTheDocument();
    expect(screen.getByText("notes-only:true")).toBeInTheDocument();
  });

  it("shows mutation errors when complete or cancel fail", async () => {
    const updateMutation = jest
      .fn()
      .mockRejectedValueOnce(new Error("complete failed"))
      .mockRejectedValueOnce(new Error("cancel failed"));
    mockUseUpdateDoctorAppointment.mockReturnValue({
      mutateAsync: updateMutation,
      isPending: false,
    } as never);

    render(<AppointmentsManager />);

    fireEvent.click(screen.getAllByRole("button", { name: /acciones/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /completar/i }));
    expect(await screen.findByText(/error:complete failed/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /acciones/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(await screen.findByText(/error:cancel failed/i)).toBeInTheDocument();
  });

  it("reconfirms confirmed appointments when schedule details change", async () => {
    const updateMutation = jest.fn().mockResolvedValue({});
    mockUseUpdateDoctorAppointment.mockReturnValue({
      mutateAsync: updateMutation,
      isPending: false,
    } as never);

    render(<AppointmentsManager />);

    fireEvent.click(screen.getAllByRole("button", { name: /acciones/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /editar/i }));
    fireEvent.click(screen.getByText("submit modal"));

    await waitFor(() =>
      expect(updateMutation).toHaveBeenCalledWith({
        appointmentId: "apt-1",
        payload: {
          scheduledAt: "2026-04-14T10:00:00.000Z",
          notes: undefined,
          status: undefined,
          modality: AppointmentModality.VIRTUAL,
          location: undefined,
          meetingUrl: undefined,
        },
      }),
    );
    expect(
      await screen.findByText(/success:la cita fue actualizada y volvió a estado programada/i),
    ).toBeInTheDocument();
  });

  it("closes the actions menu when clicking outside", () => {
    render(
      <div>
        <AppointmentsManager />
        <button>outside</button>
      </div>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /acciones/i })[0]);
    expect(screen.getByRole("button", { name: /completar/i })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("button", { name: /completar/i })).not.toBeInTheDocument();
  });
});
