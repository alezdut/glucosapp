import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertDemoTarget, createBackendEnv, writeEnvIfMissing } from "./demo-config.mjs";

const url = "postgresql://postgres:postgres@127.0.0.1:55432/glucosapp_demo";
test("rejects production, remote and non-demo targets before seeding", () => {
  const env = createBackendEnv(url);
  assert.doesNotThrow(() => assertDemoTarget(env));
  for (const change of [
    { NODE_ENV: "production" },
    { DEMO_MODE: "false" },
    { DATABASE_URL: url.replace("127.0.0.1", "example.com") },
    { DATABASE_URL: url.replace("glucosapp_demo", "glucosapp") },
    { ENCRYPTION_KEY: "replace-me" },
    { JWT_ACCESS_SECRET: "replace-with-a-secret-of-at-least-32-characters" },
  ])
    assert.throws(() => assertDemoTarget({ ...env, ...change }));
});

test("repeated setup preserves existing configuration and encryption keys", () => {
  const dir = mkdtempSync(join(tmpdir(), "glucosapp-demo-"));
  try {
    const path = join(dir, ".env");
    const first = createBackendEnv(url);
    writeEnvIfMissing(path, first);
    const bytes = readFileSync(path, "utf8");
    assert.deepEqual(writeEnvIfMissing(path, createBackendEnv(url)), first);
    assert.equal(readFileSync(path, "utf8"), bytes);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
