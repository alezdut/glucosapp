import { getAlertSettings, updateAlertSettings } from "../alerts-api";

jest.mock("@glucosapp/api-client", () => ({
  __mockClient: {
    GET: jest.fn(),
    PATCH: jest.fn(),
  },
  makeApiClient: jest.fn(() => ({
    client: jest.requireMock("@glucosapp/api-client").__mockClient,
  })),
}));

const mockClient = jest.requireMock("@glucosapp/api-client").__mockClient as {
  GET: jest.Mock;
  PATCH: jest.Mock;
};

describe("alerts-api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets and updates doctor alert settings", async () => {
    mockClient.GET.mockResolvedValue({ data: { enabled: true } });
    mockClient.PATCH.mockResolvedValue({ data: { enabled: false } });

    await expect(getAlertSettings("token")).resolves.toEqual({ enabled: true });
    await expect(updateAlertSettings("token", { enabled: false } as never)).resolves.toEqual({
      enabled: false,
    });
  });

  it("throws descriptive errors for failed or empty responses", async () => {
    mockClient.GET.mockResolvedValueOnce({ error: { message: "fetch failed" } });
    mockClient.PATCH.mockResolvedValueOnce({ data: undefined });

    await expect(getAlertSettings("token")).rejects.toThrow("fetch failed");
    await expect(updateAlertSettings("token", {} as never)).rejects.toThrow(
      "La API no devolvió la configuración de alertas actualizada",
    );
  });
});
