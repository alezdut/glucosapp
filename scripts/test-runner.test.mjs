import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, delimiter } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("test summary runner preserves an underlying failure for CI", () => {
  const dir = mkdtempSync(join(tmpdir(), "glucosapp-runner-"));
  try {
    writeFileSync(
      join(dir, "pnpm"),
      "#!/bin/sh\necho 'backend:test: Tests: 1 failed, 2 passed, 3 total'\nexit 7\n",
      { mode: 0o755 },
    );
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./run-tests-with-summary.mjs", import.meta.url))],
      {
        env: { ...process.env, PATH: dir + delimiter + process.env.PATH },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 7, result.stderr);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
