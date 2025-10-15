import { z } from "zod";

/**
 * Parses and validates environment variables for both server and client contexts.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  EXPO_PUBLIC_API_BASE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Returns validated env variables using the provided source (defaults to process.env).
 */
export function loadEnv(source: Record<string, unknown> = process.env): Env {
  return EnvSchema.parse(source);
}

export const env = loadEnv();
