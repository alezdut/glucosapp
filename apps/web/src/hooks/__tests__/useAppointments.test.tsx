"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/contexts/auth-context";
import {
  createDoctorAppointment,
  deleteDoctorAppointment,
  getDoctorAppointmentCalendar,
  getDoctorAppointments,
  updateDoctorAppointment,
} from "@/lib/appointments-api";
import {
  APPOINTMENT_STATUS_OPTIONS,
  useCreateDoctorAppointment,
  useDeleteDoctorAppointment,
  useDoctorAppointmentCalendar,
  useDoctorAppointments,
  useUpdateDoctorAppointment,
} from "../useAppointments";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/appointments-api", () => ({
  createDoctorAppointment: jest.fn(),
  deleteDoctorAppointment: jest.fn(),
  getDoctorAppointmentCalendar: jest.fn(),
  getDoctorAppointments: jest.fn(),
  updateDoctorAppointment: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetDoctorAppointments = getDoctorAppointments as jest.MockedFunction<
  typeof getDoctorAppointments
>;
const mockCreateDoctorAppointment = createDoctorAppointment as jest.MockedFunction<
  typeof createDoctorAppointment
>;
const mockGetDoctorAppointmentCalendar = getDoctorAppointmentCalendar as jest.MockedFunction<
  typeof getDoctorAppointmentCalendar
>;
const mockUpdateDoctorAppointment = updateDoctorAppointment as jest.MockedFunction<
  typeof updateDoctorAppointment
>;
const mockDeleteDoctorAppointment = deleteDoctorAppointment as jest.MockedFunction<
  typeof deleteDoctorAppointment
>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "AppointmentsHookWrapper";
  return Wrapper;
};

describe("useAppointments hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("accessToken", "stored-access");
    mockUseAuth.mockReturnValue({
      user: { id: "doctor-1" },
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    } as never);
  });

  it("fetches doctor appointments and calendar data", async () => {
    mockGetDoctorAppointments.mockResolvedValue([{ id: "apt-1" }] as never);
    mockGetDoctorAppointmentCalendar.mockResolvedValue([{ date: "2026-04-01", count: 2 }] as never);

    const { result: appointmentsResult } = renderHook(
      () => useDoctorAppointments({ includePast: true }),
      {
        wrapper: createWrapper(),
      },
    );
    const { result: calendarResult } = renderHook(() => useDoctorAppointmentCalendar("2026-04"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(appointmentsResult.current.data).toEqual([{ id: "apt-1" }]));
    await waitFor(() =>
      expect(calendarResult.current.data).toEqual([{ date: "2026-04-01", count: 2 }]),
    );
    expect(APPOINTMENT_STATUS_OPTIONS).toHaveLength(4);
  });

  it("runs appointment mutations with the stored access token", async () => {
    mockCreateDoctorAppointment.mockResolvedValue({ id: "created" } as never);
    mockUpdateDoctorAppointment.mockResolvedValue({ id: "updated" } as never);
    mockDeleteDoctorAppointment.mockResolvedValue({ message: "ok" } as never);

    const { result: createResult } = renderHook(() => useCreateDoctorAppointment(), {
      wrapper: createWrapper(),
    });
    const { result: updateResult } = renderHook(() => useUpdateDoctorAppointment(), {
      wrapper: createWrapper(),
    });
    const { result: deleteResult } = renderHook(() => useDeleteDoctorAppointment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await createResult.current.mutateAsync({
        patientId: "patient-1",
        scheduledAt: "2026-04-10T10:00:00.000Z",
        modality: "VIRTUAL" as never,
      });
      await updateResult.current.mutateAsync({
        appointmentId: "apt-1",
        payload: { notes: "updated" },
      });
      await deleteResult.current.mutateAsync("apt-1");
    });

    expect(mockCreateDoctorAppointment).toHaveBeenCalledWith(
      "stored-access",
      expect.objectContaining({ patientId: "patient-1" }),
    );
    expect(mockUpdateDoctorAppointment).toHaveBeenCalledWith("stored-access", "apt-1", {
      notes: "updated",
    });
    expect(mockDeleteDoctorAppointment).toHaveBeenCalledWith("stored-access", "apt-1");
  });
});
