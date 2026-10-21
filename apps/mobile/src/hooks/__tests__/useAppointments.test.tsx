import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useCancelAppointment, useConfirmAppointment, useMyAppointments } from "../useAppointments";
import { renderMobile } from "../../../test/render-mobile";
import * as appointmentsApi from "../../lib/appointments-api";
import { useSocket } from "../useSocket";

jest.mock("../../lib/appointments-api", () => ({
  getMyAppointments: jest.fn(),
  confirmMyAppointment: jest.fn(),
  cancelMyAppointment: jest.fn(),
}));

jest.mock("../useSocket", () => ({
  useSocket: jest.fn(),
}));

const mockUseSocket = useSocket as jest.MockedFunction<typeof useSocket>;
const mockGetMyAppointments = appointmentsApi.getMyAppointments as jest.MockedFunction<
  typeof appointmentsApi.getMyAppointments
>;
const mockConfirmMyAppointment = appointmentsApi.confirmMyAppointment as jest.MockedFunction<
  typeof appointmentsApi.confirmMyAppointment
>;
const mockCancelMyAppointment = appointmentsApi.cancelMyAppointment as jest.MockedFunction<
  typeof appointmentsApi.cancelMyAppointment
>;

function AppointmentsProbe() {
  const appointments = useMyAppointments(false);
  const confirm = useConfirmAppointment();
  const cancel = useCancelAppointment();

  return (
    <div>
      <span data-testid="appointments-count">{appointments.data?.length ?? 0}</span>
      <button type="button" onClick={() => confirm.mutate("appointment-1")}>
        confirm
      </button>
      <button type="button" onClick={() => cancel.mutate("appointment-2")}>
        cancel
      </button>
    </div>
  );
}

describe("useAppointments", () => {
  const socketHandlers = new Map<string, () => void>();
  const on = jest.fn((event: string, handler: () => void) => {
    socketHandlers.set(event, handler);
  });
  const off = jest.fn((event: string) => {
    socketHandlers.delete(event);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    socketHandlers.clear();
    mockUseSocket.mockReturnValue({
      socket: { on, off } as never,
      isConnected: true,
      error: null,
    });
    mockGetMyAppointments.mockResolvedValue([{ id: "appointment-1" }] as never);
    mockConfirmMyAppointment.mockResolvedValue({ id: "appointment-1" } as never);
    mockCancelMyAppointment.mockResolvedValue({ id: "appointment-2" } as never);
  });

  it("invalidates and refetches appointments when socket events arrive", async () => {
    renderMobile(<AppointmentsProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("appointments-count").textContent).toBe("1");
    });

    socketHandlers.get("appointment:updated")?.();

    await waitFor(() => {
      expect(mockGetMyAppointments).toHaveBeenCalledTimes(2);
    });
  });

  it("confirms and cancels appointments while invalidating the list", async () => {
    renderMobile(<AppointmentsProbe />);

    await waitFor(() => {
      expect(mockGetMyAppointments).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "confirm" }));
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));

    await waitFor(() => {
      expect(mockConfirmMyAppointment).toHaveBeenCalledWith("appointment-1");
      expect(mockCancelMyAppointment).toHaveBeenCalledWith("appointment-2");
    });

    expect(mockGetMyAppointments).toHaveBeenCalledTimes(3);
  });
});
