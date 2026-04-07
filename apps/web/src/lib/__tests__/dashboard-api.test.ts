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
  acknowledgeBatchAlerts,
  getAlerts,
  getCriticalAlerts,
  getDashboardSummary,
  getRecentAlerts,
  getUnacknowledgedAlerts,
  generateGroupReport,
  generateIndividualReport,
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
