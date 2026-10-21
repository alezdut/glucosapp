import { AppointmentModality, AppointmentStatus } from "@glucosapp/types";
import {
  cancelPatientAppointment,
  createDoctorAppointment,
  deleteDoctorAppointment,
  getDoctorAppointmentCalendar,
  getDoctorAppointments,
  getPatientAppointments,
  updateDoctorAppointment,
} from "../appointments-api";

jest.mock("@glucosapp/api-client", () => ({
  __mockClient: {
    GET: jest.fn(),
    POST: jest.fn(),
    PUT: jest.fn(),
    DELETE: jest.fn(),
  },
  makeApiClient: jest.fn(() => ({
    client: jest.requireMock("@glucosapp/api-client").__mockClient,
  })),
}));

const mockClient = jest.requireMock("@glucosapp/api-client").__mockClient as {
  GET: jest.Mock;
  POST: jest.Mock;
  PUT: jest.Mock;
  DELETE: jest.Mock;
};

describe("appointments-api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds filtered appointment requests and passes bearer auth", async () => {
    mockClient.GET.mockResolvedValue({ data: [{ id: "apt-1" }] });

    await expect(
      getDoctorAppointments("token", {
        includePast: true,
        patientId: "patient-1",
        status: AppointmentStatus.SCHEDULED,
        from: "2026-04-01",
        to: "2026-04-30",
      }),
    ).resolves.toEqual([{ id: "apt-1" }]);

    expect(mockClient.GET).toHaveBeenCalledWith(
      "/appointments?includePast=true&patientId=patient-1&status=SCHEDULED&from=2026-04-01&to=2026-04-30",
      expect.objectContaining({
        headers: { Authorization: "Bearer token" },
      }),
    );
  });

  it("creates, updates and deletes doctor appointments", async () => {
    const payload = {
      patientId: "patient-1",
      scheduledAt: "2026-04-10T15:00:00.000Z",
      modality: AppointmentModality.VIRTUAL,
    };
    mockClient.POST.mockResolvedValue({ data: { id: "created" } });
    mockClient.PUT.mockResolvedValue({ data: { id: "updated" } });
    mockClient.DELETE.mockResolvedValue({ data: undefined });

    await expect(createDoctorAppointment("token", payload)).resolves.toEqual({ id: "created" });
    await expect(updateDoctorAppointment("token", "apt-1", payload)).resolves.toEqual({
      id: "updated",
    });
    await expect(deleteDoctorAppointment("token", "apt-1")).resolves.toEqual({
      message: "Appointment deleted successfully",
    });
  });

  it("handles calendar and patient appointment helpers", async () => {
    mockClient.GET.mockResolvedValueOnce({ data: [{ date: "2026-04-01", count: 2 }] });
    mockClient.GET.mockResolvedValueOnce({ data: [{ id: "patient-apt" }] });
    mockClient.PUT.mockResolvedValue({ data: { id: "cancelled" } });

    await expect(getDoctorAppointmentCalendar("token", "2026-04")).resolves.toEqual([
      { date: "2026-04-01", count: 2 },
    ]);
    await expect(getPatientAppointments("token", true)).resolves.toEqual([{ id: "patient-apt" }]);
    await expect(cancelPatientAppointment("token", "apt-1")).resolves.toEqual({
      id: "cancelled",
    });
  });

  it("throws normalized errors and missing-data guards", async () => {
    mockClient.POST.mockResolvedValue({ error: { message: "bad request" } });
    mockClient.PUT.mockResolvedValue({ data: undefined });

    await expect(createDoctorAppointment("token", {} as never)).rejects.toThrow("bad request");
    await expect(updateDoctorAppointment("token", "apt-1", {})).rejects.toThrow(
      "Appointment data is missing",
    );
  });
});
