import { getAssignedDoctor, updateProfile } from "../profile-api";

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

describe("profile-api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates profile with bearer auth", async () => {
    mockClient.PATCH.mockResolvedValue({ data: { id: "user-1", language: "ES" } });

    await expect(updateProfile("token", { language: "ES" as never })).resolves.toEqual({
      id: "user-1",
      language: "ES",
    });
    expect(mockClient.PATCH).toHaveBeenCalledWith(
      "/profile",
      { language: "ES" },
      expect.objectContaining({
        headers: { Authorization: "Bearer token" },
      }),
    );
  });

  it("returns assigned doctor or null and surfaces API failures", async () => {
    mockClient.GET.mockResolvedValueOnce({ data: null });
    mockClient.GET.mockResolvedValueOnce({ error: { message: "boom" } });
    mockClient.PATCH.mockResolvedValueOnce({ data: undefined });

    await expect(getAssignedDoctor("token")).resolves.toBeNull();
    await expect(getAssignedDoctor("token")).rejects.toThrow("boom");
    await expect(updateProfile("token", {})).rejects.toThrow(
      "La API no devolvió información del perfil actualizada",
    );
  });
});
