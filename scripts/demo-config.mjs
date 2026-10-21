import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

export function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z_0-9]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    env[match[1]] = value;
  }
  return env;
}

export function assertDemoTarget(env) {
  if (env.NODE_ENV === "production" || env.DEMO_MODE !== "true") {
    throw new Error("Demo requires DEMO_MODE=true and a non-production environment.");
  }
  const url = new URL(env.DATABASE_URL);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/glucosapp_demo"
  ) {
    throw new Error("Demo requires a local database named glucosapp_demo.");
  }
  if (!/^[a-fA-F0-9]{64}$/.test(env.ENCRYPTION_KEY ?? "")) {
    throw new Error("Demo ENCRYPTION_KEY must contain 64 hexadecimal characters.");
  }
  for (const name of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
    if ((env[name]?.length ?? 0) < 32 || env[name].startsWith("replace-")) {
      throw new Error(`Demo ${name} must be a generated secret of at least 32 characters.`);
    }
  }
}

export function createBackendEnv(databaseUrl) {
  return {
    DATABASE_URL: databaseUrl,
    NODE_ENV: "development",
    DEMO_MODE: "true",
    JWT_ACCESS_SECRET: randomBytes(32).toString("hex"),
    JWT_REFRESH_SECRET: randomBytes(32).toString("hex"),
    ENCRYPTION_KEY: randomBytes(32).toString("hex"),
    PORT: "3000",
    FRONTEND_URL: "http://localhost:3001",
    ALLOWED_ORIGINS: "http://localhost:3001,http://localhost:8082",
  };
}

export function writeEnvIfMissing(path, env) {
  if (existsSync(path)) return parseEnv(readFileSync(path, "utf8"));
  writeFileSync(
    path,
    Object.entries(env)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join("\n") + "\n",
    {
      flag: "wx",
      mode: 0o600,
    },
  );
  return env;
}
