import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadServerEnv,
  loadWebEnv,
  loadMobileEnv,
  assertServerRuntimeEnv,
} from "../packages/env/dist/index.js";

test("client configuration excludes backend secrets and honors explicit public endpoints", () => {
  const source = {
    DATABASE_URL: "postgresql://localhost/glucosapp_demo",
    JWT_ACCESS_SECRET: "server-only-jwt",
    JWT_REFRESH_SECRET: "server-only-refresh",
    ENCRYPTION_KEY: "server-only-encryption",
    GEMINI_API_KEY: "server-only-api-key",
    NEXT_PUBLIC_API_BASE_URL: "https://web-api.example.com",
    EXPO_PUBLIC_API_BASE_URL: "https://mobile-api.example.com",
  };
  const web = loadWebEnv(source);
  const mobile = loadMobileEnv(source);
  assert.equal(web.NEXT_PUBLIC_API_BASE_URL, source.NEXT_PUBLIC_API_BASE_URL);
  assert.equal(mobile.EXPO_PUBLIC_API_BASE_URL, source.EXPO_PUBLIC_API_BASE_URL);
  for (const client of [web, mobile]) {
    assert(!JSON.stringify(client).includes("server-only"));
    assert(!("DATABASE_URL" in client));
  }
  assert.doesNotThrow(() => assertServerRuntimeEnv(loadServerEnv(source)));
  assert.throws(() => assertServerRuntimeEnv(loadServerEnv({})), /ENCRYPTION_KEY/);
});
