import { AppointmentStatus } from "@glucosapp/types";
import {
  cancelMyAppointment,
  confirmMyAppointment,
  getMyAppointments,
  isAppointmentCancelable,
  isAppointmentConfirmable,
} from "../appointments-api";
import { createApiClient } from "../api";

jest.mock("../api", () => ({
  createApiClient: jest.fn(),
}));

const mockCreateApiClient = createApiClient as jest.MockedFunction<typeof createApiClient>;

describe("mobile appointments-api", () => {
  const GET = jest.fn();
  const PUT = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateApiClient.mockReturnValue({ GET, PUT } as never);
  });

  it("fetches current patient appointments and confirms/cancels them", async () => {
    GET.mockResolvedValue({ data: [{ id: "apt-1" }] });
    PUT.mockResolvedValueOnce({ data: { id: "confirmed" } });
    PUT.mockResolvedValueOnce({ data: { id: "cancelled" } });

    await expect(getMyAppointments(true)).resolves.toEqual([{ id: "apt-1" }]);
    await expect(confirmMyAppointment("apt-1")).resolves.toEqual({ id: "confirmed" });
    await expect(cancelMyAppointment("apt-1")).resolves.toEqual({ id: "cancelled" });
    expect(GET).toHaveBeenCalledWith("/appointments/my?includePast=true");
  });

  it("guards appointment actions and helper predicates", async () => {
    PUT.mockResolvedValue({ data: undefined });

    await expect(confirmMyAppointment("apt-2")).rejects.toThrow("Appointment data is missing");
    expect(isAppointmentConfirmable(AppointmentStatus.SCHEDULED)).toBe(true);
    expect(isAppointmentConfirmable(AppointmentStatus.CONFIRMED)).toBe(false);
    expect(isAppointmentCancelable(AppointmentStatus.SCHEDULED)).toBe(true);
    expect(isAppointmentCancelable(AppointmentStatus.CONFIRMED)).toBe(true);
    expect(isAppointmentCancelable(AppointmentStatus.CANCELLED)).toBe(false);
  });
});
