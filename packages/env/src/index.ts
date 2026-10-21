import { z } from "zod";

/**
 * Base schema with values shared across server and client runtimes.
 */
const BaseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const ServerEnvSchema = BaseEnvSchema.extend({
  DATABASE_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  JWT_ACCESS_EXPIRATION: z.string().default("15m"),
  JWT_REFRESH_EXPIRATION: z.string().default("7d"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  GOOGLE_MOBILE_CALLBACK_URL: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  RESEND_REPLY_TO: z.string().optional(),
  FRONTEND_URL: z.string().url().default("http://localhost:3001"),
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3001,http://localhost:8082")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  PORT: z.coerce.number().int().positive().default(3000),
  GEMINI_API_KEY: z.string().optional(),
});

const WebEnvSchema = BaseEnvSchema.extend({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:3000"),
});

const MobileEnvSchema = BaseEnvSchema.extend({
  EXPO_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:3000"),
  EXPO_PUBLIC_IMAGE_ANALYSIS_BASE_URL: z.string().url().default("http://localhost:8000"),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_EAS_PROJECT_ID: z.string().optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;
export type WebEnv = z.infer<typeof WebEnvSchema>;
export type MobileEnv = z.infer<typeof MobileEnvSchema>;

/**
 * Returns validated env variables using the provided source (defaults to process.env).
 */
export function loadServerEnv(source: Record<string, unknown> = process.env): ServerEnv {
  return ServerEnvSchema.parse(source);
}

export function loadWebEnv(source: Record<string, unknown> = process.env): WebEnv {
  return WebEnvSchema.parse(source);
}

export function loadMobileEnv(source: Record<string, unknown> = process.env): MobileEnv {
  return MobileEnvSchema.parse(source);
}

export function assertServerRuntimeEnv(env: ServerEnv): void {
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

export function loadEnv(source: Record<string, unknown> = process.env): ServerEnv {
  return loadServerEnv(source);
}
