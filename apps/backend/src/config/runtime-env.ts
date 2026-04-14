type NodeEnv = "development" | "test" | "production";

export interface BackendRuntimeEnv {
  ALLOWED_ORIGINS: string[];
  DATABASE_URL?: string;
  ENCRYPTION_KEY?: string;
  FRONTEND_URL: string;
  JWT_ACCESS_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  NODE_ENV: NodeEnv;
  PORT: number;
}

export function loadBackendRuntimeEnv(
  source: Record<string, string | undefined> = process.env,
): BackendRuntimeEnv {
  return {
    ALLOWED_ORIGINS: (source.ALLOWED_ORIGINS ?? "http://localhost:3001,http://localhost:8082")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    DATABASE_URL: source.DATABASE_URL,
    ENCRYPTION_KEY: source.ENCRYPTION_KEY,
    FRONTEND_URL: source.FRONTEND_URL ?? "http://localhost:3001",
    JWT_ACCESS_SECRET: source.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: source.JWT_REFRESH_SECRET,
    NODE_ENV: parseNodeEnv(source.NODE_ENV),
    PORT: parsePort(source.PORT),
  };
}

export function assertBackendRuntimeEnv(env: BackendRuntimeEnv): void {
  const missing = [
    ["DATABASE_URL", env.DATABASE_URL],
    ["JWT_ACCESS_SECRET", env.JWT_ACCESS_SECRET],
    ["JWT_REFRESH_SECRET", env.JWT_REFRESH_SECRET],
    ["ENCRYPTION_KEY", env.ENCRYPTION_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missing.join(", ")}. ` +
        "Update apps/backend/.env before starting the API.",
    );
  }
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  if (value === "development" || value === "test" || value === "production") {
    return value;
  }

  return "development";
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "3000");

  if (Number.isInteger(port) && port > 0) {
    return port;
  }

  return 3000;
}
