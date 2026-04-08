const mockSecureStoreState = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStoreState.set(key, value);
  }),
  getItemAsync: jest.fn(async (key: string) => mockSecureStoreState.get(key) ?? null),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStoreState.delete(key);
  }),
}));

jest.mock("@glucosapp/auth-utils", () => ({
  isTokenExpiringSoon: jest.fn(),
}));

jest.mock("expo/virtual/env", () => ({ env: {} }), { virtual: true });

jest.mock("@glucosapp/api-client", () => ({
  __mockClient: {
    GET: jest.fn(),
    POST: jest.fn(),
    PATCH: jest.fn(),
    PUT: jest.fn(),
    DELETE: jest.fn(),
  },
  makeApiClient: jest.fn(() => ({
    client: jest.requireMock("@glucosapp/api-client").__mockClient,
  })),
}));

describe("mobile api", () => {
  const secureStore = jest.requireMock("expo-secure-store") as {
    setItemAsync: jest.Mock;
    getItemAsync: jest.Mock;
    deleteItemAsync: jest.Mock;
  };
  let consoleErrorSpy: jest.SpyInstance;
  const authUtils = jest.requireMock("@glucosapp/auth-utils") as {
    isTokenExpiringSoon: jest.Mock;
  };
  const apiClient = jest.requireMock("@glucosapp/api-client") as {
    __mockClient: {
      GET: jest.Mock;
      POST: jest.Mock;
      PATCH: jest.Mock;
      PUT: jest.Mock;
      DELETE: jest.Mock;
    };
  };

  const loadApi = () => {
    let apiModule: typeof import("../api");
    jest.isolateModules(() => {
      apiModule = jest.requireActual("../api") as typeof import("../api");
    });
    return apiModule!;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStoreState.clear();
    authUtils.isTokenExpiringSoon.mockReturnValue(false);
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("stores, reads and clears tokens from secure storage", async () => {
    const api = loadApi();

    await api.storeTokens("access-1", "refresh-1");

    await expect(api.getAccessToken()).resolves.toBe("access-1");
    await expect(api.getRefreshToken()).resolves.toBe("refresh-1");

    await api.clearTokens();

    await expect(api.getAccessToken()).resolves.toBeNull();
    await expect(api.getRefreshToken()).resolves.toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
  });

  it("refreshes tokens successfully and persists the new pair", async () => {
    mockSecureStoreState.set("refreshToken", "refresh-1");
    apiClient.__mockClient.POST.mockResolvedValue({
      data: { accessToken: "access-2", refreshToken: "refresh-2" },
    });

    const api = loadApi();

    await expect(api.refreshAccessToken()).resolves.toEqual({
      accessToken: "access-2",
      refreshToken: "refresh-2",
    });
    expect(apiClient.__mockClient.POST).toHaveBeenCalledWith("/auth/refresh", {
      refreshToken: "refresh-1",
    });
    expect(mockSecureStoreState.get("accessToken")).toBe("access-2");
    expect(mockSecureStoreState.get("refreshToken")).toBe("refresh-2");
  });

  it("clears tokens only for auth refresh errors", async () => {
    mockSecureStoreState.set("accessToken", "access-1");
    mockSecureStoreState.set("refreshToken", "refresh-1");
    apiClient.__mockClient.POST.mockResolvedValueOnce({
      error: { status: 401, message: "expired" },
    }).mockResolvedValueOnce({ error: { status: 500, message: "server" } });

    const api = loadApi();

    await expect(api.refreshAccessToken()).resolves.toBeNull();
    expect(mockSecureStoreState.get("accessToken")).toBeUndefined();
    expect(mockSecureStoreState.get("refreshToken")).toBeUndefined();

    mockSecureStoreState.set("accessToken", "access-1");
    mockSecureStoreState.set("refreshToken", "refresh-1");

    await expect(api.refreshAccessToken()).resolves.toBeNull();
    expect(mockSecureStoreState.get("accessToken")).toBe("access-1");
    expect(mockSecureStoreState.get("refreshToken")).toBe("refresh-1");
  });

  it("reuses the in-flight refresh promise for concurrent refresh attempts", async () => {
    mockSecureStoreState.set("refreshToken", "refresh-1");
    let resolveRefresh: ((value: unknown) => void) | undefined;
    const refreshResponse = new Promise((resolve) => {
      resolveRefresh = resolve;
    });
    apiClient.__mockClient.POST.mockReturnValue(refreshResponse);

    const api = loadApi();

    const firstPromise = api.refreshAccessToken();
    const secondPromise = api.refreshAccessToken();

    await Promise.resolve();
    await Promise.resolve();

    expect(apiClient.__mockClient.POST).toHaveBeenCalledTimes(1);

    resolveRefresh?.({ data: { accessToken: "access-2", refreshToken: "refresh-2" } });

    await expect(Promise.all([firstPromise, secondPromise])).resolves.toEqual([
      {
        accessToken: "access-2",
        refreshToken: "refresh-2",
      },
      {
        accessToken: "access-2",
        refreshToken: "refresh-2",
      },
    ]);
  });

  it("skips refresh logic for auth endpoints", async () => {
    mockSecureStoreState.set("accessToken", "access-1");
    authUtils.isTokenExpiringSoon.mockReturnValue(true);
    apiClient.__mockClient.POST.mockResolvedValue({ data: { ok: true } });

    const api = loadApi();
    const client = api.createApiClient();

    await expect(client.POST("/auth/login", { email: "a@b.com" })).resolves.toEqual({
      data: { ok: true },
    });

    expect(apiClient.__mockClient.POST).toHaveBeenCalledTimes(1);
    expect(apiClient.__mockClient.POST).toHaveBeenCalledWith(
      "/auth/login",
      { email: "a@b.com" },
      { headers: { Authorization: "Bearer access-1" } },
    );
  });

  it("refreshes proactively before authenticated requests when the token is expiring soon", async () => {
    mockSecureStoreState.set("accessToken", "access-1");
    mockSecureStoreState.set("refreshToken", "refresh-1");
    authUtils.isTokenExpiringSoon.mockReturnValue(true);
    apiClient.__mockClient.POST.mockResolvedValue({
      data: { accessToken: "access-2", refreshToken: "refresh-2" },
    });
    apiClient.__mockClient.GET.mockResolvedValue({ data: { ok: true } });

    const api = loadApi();
    const client = api.createApiClient();

    await expect(client.GET("/profile")).resolves.toEqual({ data: { ok: true } });

    expect(apiClient.__mockClient.POST).toHaveBeenCalledWith("/auth/refresh", {
      refreshToken: "refresh-1",
    });
    expect(apiClient.__mockClient.GET).toHaveBeenCalledWith("/profile", {
      headers: { Authorization: "Bearer access-2" },
    });
  });

  it("retries once after a 401 using the refreshed access token", async () => {
    mockSecureStoreState.set("accessToken", "access-1");
    mockSecureStoreState.set("refreshToken", "refresh-1");
    apiClient.__mockClient.GET.mockResolvedValueOnce({
      error: { status: 401, message: "expired" },
    }).mockResolvedValueOnce({ data: { ok: true } });
    apiClient.__mockClient.POST.mockResolvedValue({
      data: { accessToken: "access-2", refreshToken: "refresh-2" },
    });

    const api = loadApi();
    const client = api.createApiClient();

    await expect(client.GET("/protected")).resolves.toEqual({ data: { ok: true } });

    expect(apiClient.__mockClient.GET).toHaveBeenNthCalledWith(1, "/protected", {
      headers: { Authorization: "Bearer access-1" },
    });
    expect(apiClient.__mockClient.GET).toHaveBeenNthCalledWith(2, "/protected", {
      headers: { Authorization: "Bearer access-2" },
    });
  });
});
