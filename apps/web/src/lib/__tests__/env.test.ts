describe("web env helpers", () => {
  const originalEnv = { ...process.env };

  const loadEnvModule = () => {
    let envModule: typeof import("../env");
    jest.isolateModules(() => {
      envModule = jest.requireActual("../env") as typeof import("../env");
    });
    return envModule!;
  };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("builds a versioned API base URL from an origin", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

    const env = loadEnvModule();

    expect(env.getWebApiOrigin()).toBe("http://localhost:3000");
    expect(env.getWebApiBaseUrl()).toBe("http://localhost:3000/v1");
  });

  it("does not duplicate /v1 when the env value is already versioned", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000/v1";

    const env = loadEnvModule();

    expect(env.getWebApiOrigin()).toBe("http://localhost:3000");
    expect(env.getWebApiBaseUrl()).toBe("http://localhost:3000/v1");
  });
});
