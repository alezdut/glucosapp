import { assertBackendRuntimeEnv, loadBackendRuntimeEnv } from "./runtime-env";

describe("release environment boundaries", () => {
  const source = {
    DATABASE_URL: "postgresql://localhost/glucosapp_demo",
    JWT_ACCESS_SECRET: "server-only-jwt",
    JWT_REFRESH_SECRET: "server-only-refresh",
    ENCRYPTION_KEY: "server-only-encryption",
    GEMINI_API_KEY: "server-only-api-key",
    NEXT_PUBLIC_API_BASE_URL: "http://localhost:3000",
    EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000",
  };

  it("validates required backend configuration", () => {
    expect(() => assertBackendRuntimeEnv(loadBackendRuntimeEnv(source))).not.toThrow();
    expect(() => assertBackendRuntimeEnv(loadBackendRuntimeEnv({}))).toThrow("DATABASE_URL");
  });

  it("parses runtime defaults and origins without accepting invalid environments", () => {
    expect(
      loadBackendRuntimeEnv({ PORT: "3400", ALLOWED_ORIGINS: " http://localhost:3001, " }),
    ).toMatchObject({
      PORT: 3400,
      NODE_ENV: "development",
      ALLOWED_ORIGINS: ["http://localhost:3001"],
    });
    expect(loadBackendRuntimeEnv({ PORT: "bad", NODE_ENV: "production" }).PORT).toBe(3000);
    expect(loadBackendRuntimeEnv({ NODE_ENV: "test" }).NODE_ENV).toBe("test");
    expect(() => loadBackendRuntimeEnv({ NODE_ENV: "invalid" })).toThrow("Invalid NODE_ENV");
  });
});
