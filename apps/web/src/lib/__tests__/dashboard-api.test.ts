jest.mock("@glucosapp/api-client", () => ({
  __mockApiClient: {
    GET: jest.fn(),
    POST: jest.fn(),
    PATCH: jest.fn(),
    DELETE: jest.fn(),
  },
  makeApiClient: jest.fn(() => ({
    client: {
      GET: jest.requireMock("@glucosapp/api-client").__mockApiClient.GET,
      POST: jest.requireMock("@glucosapp/api-client").__mockApiClient.POST,
      PATCH: jest.requireMock("@glucosapp/api-client").__mockApiClient.PATCH,
      DELETE: jest.requireMock("@glucosapp/api-client").__mockApiClient.DELETE,
    },
  })),
}));

import {
  acknowledgeAlert,
  acknowledgeBatchAlerts,
  assignPatient,
  getGlucoseEvolution,
  getInsulinStats,
  getMealStats,
  getAlerts,
  getCriticalAlerts,
  getDashboardSummary,
  getPatientDetails,
  getPatientGlucoseEvolution,
  getPatientInsulinStats,
  getPatientLogEntries,
  getPatientMeals,
  getPatientProfile,
  getPatientsWithFilters,
  getRecentAlerts,
  getUnacknowledgedAlerts,
  generateGroupReport,
  generateIndividualReport,
  removePatient,
  searchGlobalPatients,
  updatePatientProfile,
} from "@/lib/dashboard-api";

const { __mockApiClient } = jest.requireMock("@glucosapp/api-client") as {
  __mockApiClient: {
    GET: jest.Mock;
    POST: jest.Mock;
    PATCH: jest.Mock;
    DELETE: jest.Mock;
  };
};

const mockGet = __mockApiClient.GET;
const mockPost = __mockApiClient.POST;
const mockPatch = __mockApiClient.PATCH;
const mockDelete = __mockApiClient.DELETE;

describe("dashboard-api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("builds alert query params and sends bearer auth", async () => {
    mockGet.mockResolvedValue({ data: [] });

    await getAlerts("token-123", {
      limit: 10,
      acknowledged: false,
      severity: ["CRITICAL", "HIGH"],
      sinceHours: 24,
      patientId: "patient-1",
    });

    expect(mockGet).toHaveBeenCalledWith(
      "/alerts?limit=10&acknowledged=false&severity=CRITICAL%2CHIGH&sinceHours=24&patientId=patient-1",
      {
        headers: { Authorization: "Bearer token-123" },
      },
    );
  });

  it("delegates convenience alert helpers to the unified alerts endpoint", async () => {
    mockGet.mockResolvedValue({ data: [{ id: "alert-1" }] });

    await expect(getRecentAlerts("token-123", 5)).resolves.toEqual([{ id: "alert-1" }]);
    await expect(getCriticalAlerts("token-123")).resolves.toEqual([{ id: "alert-1" }]);
    await expect(getUnacknowledgedAlerts("token-123", 3)).resolves.toEqual([{ id: "alert-1" }]);

    expect(mockGet).toHaveBeenNthCalledWith(
      1,
      "/alerts?limit=5",
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      2,
      "/alerts?acknowledged=false&severity=CRITICAL%2CHIGH",
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      3,
      "/alerts?limit=3&acknowledged=false",
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );
  });

  it("throws normalized errors for dashboard summary and batch acknowledge failures", async () => {
    mockGet.mockResolvedValueOnce({ error: { message: "summary failed" } });
    mockPost.mockResolvedValueOnce({ error: { message: "ack failed" } });

    await expect(getDashboardSummary("token-123")).rejects.toThrow("summary failed");
    await expect(acknowledgeBatchAlerts("token-123", { alertIds: ["alert-1"] })).rejects.toThrow(
      "ack failed",
    );
  });

  it("returns dashboard metrics and patient collections with bearer auth", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { activePatients: 8, criticalAlerts: 2, upcomingAppointments: 4 },
      })
      .mockResolvedValueOnce({ data: { data: [{ date: "2026-04-01", averageGlucose: 120 }] } })
      .mockResolvedValueOnce({
        data: { averageDose: 18, unit: "U", days: 7, description: "weekly" },
      })
      .mockResolvedValueOnce({
        data: { totalMeals: 12, unit: "meals", description: "weekly" },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "patient-1",
            email: "patient@example.com",
            status: "Estable",
            activityStatus: "Activo",
            registrationDate: "2026-01-01",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "patient-2",
            email: "search@example.com",
            status: "Riesgo",
            activityStatus: "Activo",
            registrationDate: "2026-02-01",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: {
          id: "patient-1",
          email: "patient@example.com",
          status: "Estable",
          activityStatus: "Activo",
          registrationDate: "2026-01-01",
          totalGlucoseReadings: 10,
          totalInsulinDoses: 12,
          totalMeals: 14,
          totalAlerts: 2,
          unacknowledgedAlerts: 1,
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ month: "2026-04", averageGlucose: 124, minGlucose: 70, maxGlucose: 180 }],
        },
      })
      .mockResolvedValueOnce({
        data: { data: [{ month: "2026-04", averageBasal: 10, averageBolus: 5 }] },
      })
      .mockResolvedValueOnce({
        data: [{ id: "meal-1", recordedAt: "2026-04-01T10:00:00.000Z" }],
      })
      .mockResolvedValueOnce({
        data: {
          id: "profile-1",
          email: "patient@example.com",
          icRatioBreakfast: 10,
          icRatioLunch: 12,
          icRatioDinner: 14,
          insulinSensitivityFactor: 50,
          diaHours: 4,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
      })
      .mockResolvedValueOnce({
        data: [{ id: "log-1", recordedAt: "2026-04-01T10:00:00.000Z" }],
      });

    await expect(getDashboardSummary("token-123", 30)).resolves.toEqual({
      activePatients: 8,
      criticalAlerts: 2,
      upcomingAppointments: 4,
    });
    await expect(getGlucoseEvolution("token-123", 7)).resolves.toEqual({
      data: [{ date: "2026-04-01", averageGlucose: 120 }],
    });
    await expect(getInsulinStats("token-123", 7)).resolves.toEqual({
      averageDose: 18,
      unit: "U",
      days: 7,
      description: "weekly",
    });
    await expect(getMealStats("token-123", 7)).resolves.toEqual({
      totalMeals: 12,
      unit: "meals",
      description: "weekly",
    });
    await expect(
      getPatientsWithFilters("token-123", {
        search: "ana",
        diabetesType: "TYPE_1",
        activeOnly: true,
        registrationDate: "2026-01-01",
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: "patient-1", email: "patient@example.com" }),
    ]);
    await expect(searchGlobalPatients("token-123", "ana paz")).resolves.toEqual([
      expect.objectContaining({ id: "patient-2", email: "search@example.com" }),
    ]);
    await expect(getPatientDetails("token-123", "patient-1")).resolves.toEqual(
      expect.objectContaining({ id: "patient-1", totalMeals: 14 }),
    );
    await expect(getPatientGlucoseEvolution("token-123", "patient-1", 6)).resolves.toEqual({
      data: [{ month: "2026-04", averageGlucose: 124, minGlucose: 70, maxGlucose: 180 }],
    });
    await expect(getPatientInsulinStats("token-123", "patient-1", 6)).resolves.toEqual({
      data: [{ month: "2026-04", averageBasal: 10, averageBolus: 5 }],
    });
    await expect(
      getPatientMeals("token-123", "patient-1", "2026-04-01", "2026-04-30"),
    ).resolves.toEqual([{ id: "meal-1", recordedAt: "2026-04-01T10:00:00.000Z" }]);
    await expect(getPatientProfile("token-123", "patient-1")).resolves.toEqual(
      expect.objectContaining({ id: "profile-1", maxTargetGlucose: 140 }),
    );
    await expect(
      getPatientLogEntries("token-123", "patient-1", "2026-04-01", "2026-04-30"),
    ).resolves.toEqual([{ id: "log-1", recordedAt: "2026-04-01T10:00:00.000Z" }]);

    expect(mockGet).toHaveBeenNthCalledWith(
      1,
      "/dashboard/summary?days=30",
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      5,
      "/doctor-patients?search=ana&diabetesType=TYPE_1&activeOnly=true&registrationDate=2026-01-01",
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      6,
      "/doctor-patients/search?q=ana+paz",
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      10,
      "/doctor-patients/patient-1/meals?startDate=2026-04-01&endDate=2026-04-30",
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );
  });

  it("posts mutations for alerts and patients and normalizes mutation failures", async () => {
    mockPost
      .mockResolvedValueOnce({ data: { id: "alert-1", acknowledged: true } })
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ error: { message: "assign failed" } });
    mockDelete
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ error: { message: "remove failed" } });
    mockPatch
      .mockResolvedValueOnce({
        data: {
          id: "profile-1",
          email: "patient@example.com",
          icRatioBreakfast: 9,
          icRatioLunch: 11,
          icRatioDinner: 13,
          insulinSensitivityFactor: 60,
          diaHours: 5,
          minTargetGlucose: 80,
          maxTargetGlucose: 140,
        },
      })
      .mockResolvedValueOnce({ error: { message: "profile failed" } })
      .mockResolvedValueOnce({ data: null });

    await expect(acknowledgeAlert("token-123", "alert-1")).resolves.toEqual({
      id: "alert-1",
      acknowledged: true,
    });
    await expect(assignPatient("token-123", "patient-1")).resolves.toBeUndefined();
    await expect(assignPatient("token-123", "patient-2")).rejects.toThrow("assign failed");
    await expect(removePatient("token-123", "patient-1")).resolves.toBeUndefined();
    await expect(removePatient("token-123", "patient-2")).rejects.toThrow("remove failed");
    await expect(
      updatePatientProfile("token-123", "patient-1", { icRatioBreakfast: 9 }),
    ).resolves.toEqual(expect.objectContaining({ icRatioBreakfast: 9 }));
    await expect(
      updatePatientProfile("token-123", "patient-1", { icRatioBreakfast: 9 }),
    ).rejects.toThrow("profile failed");
    await expect(
      updatePatientProfile("token-123", "patient-1", { icRatioBreakfast: 9 }),
    ).rejects.toThrow("No data returned from update patient profile endpoint");

    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      "/alerts/alert-1/acknowledge",
      undefined,
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      "/doctor-patients",
      { patientId: "patient-1" },
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );
    expect(mockDelete).toHaveBeenNthCalledWith(
      1,
      "/doctor-patients/patient-1",
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );
    expect(mockPatch).toHaveBeenNthCalledWith(
      1,
      "/doctor-patients/patient-1/profile",
      { icRatioBreakfast: 9 },
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );
  });

  it("surfaces normalized fetch errors and missing-data guards for patient analytics", async () => {
    mockGet
      .mockResolvedValueOnce({ error: { message: "glucose failed" } })
      .mockResolvedValueOnce({ error: { message: "insulin failed" } })
      .mockResolvedValueOnce({ error: { message: "meal failed" } })
      .mockResolvedValueOnce({ error: { message: "patients failed" } })
      .mockResolvedValueOnce({ error: { message: "search failed" } })
      .mockResolvedValueOnce({ error: { message: "details failed" } })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ error: { message: "meals failed" } })
      .mockResolvedValueOnce({ error: { message: "profile failed" } })
      .mockResolvedValueOnce({ error: { message: "logs failed" } });

    await expect(getGlucoseEvolution("token-123")).rejects.toThrow("glucose failed");
    await expect(getInsulinStats("token-123")).rejects.toThrow("insulin failed");
    await expect(getMealStats("token-123")).rejects.toThrow("meal failed");
    await expect(getPatientsWithFilters("token-123")).rejects.toThrow("patients failed");
    await expect(searchGlobalPatients("token-123", "ana")).rejects.toThrow("search failed");
    await expect(getPatientDetails("token-123", "patient-1")).rejects.toThrow("details failed");
    await expect(getPatientGlucoseEvolution("token-123", "patient-1")).rejects.toThrow(
      "No data returned from patient glucose evolution endpoint",
    );
    await expect(getPatientInsulinStats("token-123", "patient-1")).rejects.toThrow(
      "No data returned from patient insulin stats endpoint",
    );
    await expect(getPatientMeals("token-123", "patient-1")).rejects.toThrow("meals failed");
    await expect(getPatientProfile("token-123", "patient-1")).rejects.toThrow("profile failed");
    await expect(getPatientLogEntries("token-123", "patient-1")).rejects.toThrow("logs failed");
  });

  it("posts report requests and surfaces API errors", async () => {
    const reportBlob = new Blob(["pdf"], { type: "application/pdf" });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        blob: jest.fn().mockResolvedValue(reportBlob),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({ message: "group failed" }),
      });

    await expect(
      generateIndividualReport("token-123", "patient-1", {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        reportTypes: ["glucosa"],
        format: "pdf",
      }),
    ).resolves.toBe(reportBlob);

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/v1/reports/individual",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: "patient-1",
          startDate: "2026-01-01",
          endDate: "2026-01-31",
          reportTypes: ["glucosa"],
          format: "pdf",
        }),
      }),
    );

    await expect(
      generateGroupReport("token-123", {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        reportTypes: ["glucosa"],
        format: "csv",
      }),
    ).rejects.toThrow("group failed");
  });
});
