import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseEnv, assertDemoTarget } from "./demo-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const backend = fileURLToPath(new URL("../apps/backend/", import.meta.url));
const requireBackend = createRequire(new URL("../apps/backend/package.json", import.meta.url));
const { PrismaClient } = requireBackend("@prisma/client");
const { io } = createRequire(new URL("../apps/mobile/package.json", import.meta.url))(
  "socket.io-client",
);
let api;
let prisma;
let socket;
let apiLogs = "";

function setup() {
  const result = spawnSync("pnpm", ["demo:setup"], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  assert.equal(result.status, 0, "demo setup must finish successfully");
}

try {
  setup();
  const env = {
    ...process.env,
    ...parseEnv(readFileSync(new URL("../apps/backend/.env", import.meta.url), "utf8")),
  };
  assertDemoTarget(env);
  prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  const counts = async () =>
    Object.fromEntries(
      await Promise.all(
        [
          "user",
          "doctorPatient",
          "logEntry",
          "glucoseEntry",
          "glucoseReading",
          "alert",
          "insulinDose",
        ].map(async (name) => [name, await prisma[name].count()]),
      ),
    );
  const initial = await counts();
  assert.equal(initial.user, 11);
  assert.equal(initial.doctorPatient, 10);
  assert(initial.logEntry > 0 && initial.glucoseReading > 0);
  setup();
  assert.deepEqual(await counts(), initial, "running setup twice must not duplicate demo records");
  const port = process.env.DEMO_SMOKE_PORT ?? "3400";
  const base = `http://127.0.0.1:${port}`;
  api = spawn(process.execPath, ["dist/main.js"], {
    cwd: backend,
    env: { ...env, PORT: port },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [api.stdout, api.stderr])
    stream.on("data", (data) => {
      apiLogs = (apiLogs + data).slice(-16000);
    });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (api.exitCode !== null) throw new Error(`API exited (${api.exitCode}).\n${apiLogs}`);
    try {
      ready = (await fetch(`${base}/v1/health`, { signal: AbortSignal.timeout(1000) })).ok;
    } catch {
      /* wait for startup */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(ready, `API must become healthy.\n${apiLogs}`);
  async function request(path, token, body, method = body ? "POST" : "GET", expected = 200) {
    const response = await fetch(`${base}/v1${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, expected, `${method} ${path}: ${await response.clone().text()}`);
    return response;
  }
  const login = async (email) =>
    (await request("/auth/login", null, { email, password: "Demo123!" }, "POST", 200)).json();
  const doctor = await login("demo-doctor@glucosapp.demo");
  const patient = await login("demo-patient-1@glucosapp.demo");
  const other = await login("demo-patient-2@glucosapp.demo");
  await request("/profile", null, null, "GET", 401);
  const patients = await (await request("/doctor-patients", doctor.accessToken)).json();
  assert.equal(patients.length, 10);
  await request("/dashboard/summary", doctor.accessToken);
  await request("/alerts", doctor.accessToken);
  const profile = await (
    await request(
      "/profile",
      patient.accessToken,
      { firstName: "Paciente", lastName: "Demo" },
      "PATCH",
    )
  ).json();
  assert.equal(profile.firstName, "Paciente");
  await request(
    "/profile",
    patient.accessToken,
    { firstName: "Ana", lastName: "Martínez" },
    "PATCH",
  );
  await request(`/doctor-patients/${other.user.id}/profile`, patient.accessToken, null, "GET", 403);
  await request(
    `/dashboard/patients/${other.user.id}/glucose-evolution`,
    patient.accessToken,
    null,
    "GET",
    403,
  );
  const entry = await (
    await request(
      "/glucose-entries",
      patient.accessToken,
      { mgdl: 123, note: "Synthetic release smoke test" },
      "POST",
      201,
    )
  ).json();
  assert.equal(entry.userId, patient.user.id);
  const stored = await prisma.glucoseEntry.findUniqueOrThrow({ where: { id: entry.id } });
  assert.notEqual(stored.mgdlEncrypted, "123");
  const reportInput = {
    patientId: patient.user.id,
    startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    endDate: new Date().toISOString(),
    reportTypes: ["glucosa"],
    includeAISummary: false,
  };
  for (const format of ["csv", "pdf"]) {
    const response = await request("/reports/individual", doctor.accessToken, {
      ...reportInput,
      format,
    });
    assert((await response.arrayBuffer()).byteLength > 100);
  }
  await request(
    "/reports/individual",
    patient.accessToken,
    { ...reportInput, patientId: other.user.id, format: "csv" },
    "POST",
    403,
  );
  socket = io(`${base}/messages`, {
    query: { token: patient.accessToken },
    transports: ["websocket"],
    reconnection: false,
    timeout: 10000,
  });
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  // The server authenticates asynchronously after the transport connects.
  await new Promise((resolve) => setTimeout(resolve, 300));
  const message = await socket
    .timeout(10000)
    .emitWithAck("message:send", {
      receiverId: doctor.user.id,
      content: "Synthetic release smoke test",
    });
  assert.equal(message.success, true, JSON.stringify(message));
  const rejected = await socket
    .timeout(10000)
    .emitWithAck("message:send", { receiverId: other.user.id, content: "Must not be delivered" });
  assert.equal(rejected.success, false, "patients cannot message unrelated patients");
  await prisma.message.delete({ where: { id: message.message.id } });
  await prisma.glucoseEntry.delete({ where: { id: entry.id } });
  console.log(
    "PASS: fresh migrations, repeated demo, doctor/patient login, profile, dashboard, alerts, encrypted glucose, PDF/CSV, messaging and cross-patient authorization.",
  );
} catch (error) {
  console.error(error);
  if (apiLogs) console.error(apiLogs);
  process.exitCode = 1;
} finally {
  socket?.disconnect();
  if (api && api.exitCode === null) {
    api.kill("SIGTERM");
    await new Promise((resolve) => api.once("exit", resolve));
  }
  await prisma?.$disconnect();
}
