import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { assertDemoTarget, createBackendEnv, writeEnvIfMissing } from "./demo-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);

function run(command, args, env) {
  const result = spawnSync(command, args, { stdio: "inherit", env, cwd: root });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} failed (${result.status ?? result.signal}).`);
}

try {
  if (process.env.NODE_ENV === "production") throw new Error("Demo cannot run in production.");
  const databaseUrl =
    process.env.DEMO_DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:55432/glucosapp_demo?schema=public";
  const proposed = createBackendEnv(databaseUrl);
  assertDemoTarget(proposed);
  const env = writeEnvIfMissing(resolve(root, "apps/backend/.env"), proposed);
  assertDemoTarget({ ...env, NODE_ENV: process.env.NODE_ENV ?? env.NODE_ENV });
  if (env.DATABASE_URL !== databaseUrl) {
    throw new Error(
      "Existing backend configuration uses a different database. Set DEMO_DATABASE_URL to that local demo URL; configuration was preserved.",
    );
  }
  const effective = { ...process.env, ...env };
  if (!process.env.DEMO_DATABASE_URL) {
    run(
      "docker",
      ["compose", "-p", "glucosapp-demo", "-f", "docker-compose.demo.yml", "up", "-d", "--wait"],
      effective,
    );
  }
  writeEnvIfMissing(resolve(root, "apps/web/.env.local"), {
    NEXT_PUBLIC_API_BASE_URL: "http://localhost:3000",
  });
  writeEnvIfMissing(resolve(root, "apps/mobile/.env"), {
    EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000",
  });
  run("pnpm", ["--filter", "./packages/**", "build"], effective);
  run("pnpm", ["-C", "apps/backend", "prisma:generate"], effective);
  run("pnpm", ["-C", "apps/backend", "prisma:deploy"], effective);
  run("pnpm", ["-C", "apps/backend", "demo:populate"], effective);
  console.log(
    "Demo ready. Doctor: demo-doctor@glucosapp.demo; patients: demo-patient-1@glucosapp.demo … demo-patient-10@glucosapp.demo. Password: Demo123!",
  );
  console.log(
    "Start pnpm dev, then pnpm dev:mobile in another terminal. All records are synthetic.",
  );
} catch (error) {
  console.error(`Demo setup failed: ${error.message}`);
  process.exitCode = 1;
}
