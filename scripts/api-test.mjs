import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { demo } from "../Zentro.Front/src/finance.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const folder = mkdtempSync(path.join(os.tmpdir(), "zentro-api-test-"));
const server = createServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
const base = `http://127.0.0.1:${port}`;
const dotnet = process.platform === "win32" ? path.join(process.env.ProgramFiles || "C:/Program Files", "dotnet/dotnet.exe") : "dotnet";
let child;
let output = "";
async function start() {
  child = spawn(dotnet, [path.join(root, "Zentro.Api/bin/Debug/net10.0/Zentro.Api.dll")], {
    cwd: path.join(root, "Zentro.Api"), windowsHide: true,
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: "Development", ASPNETCORE_URLS: base, Zentro__DatabasePath: path.join(folder, "test.db") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });
  child.on("error", (error) => { output += error.message; });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(output);
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`La API no arrancó: ${output}`);
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  else child.kill("SIGTERM");
  await exited;
}
async function put(data) {
  return fetch(`${base}/api/state`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}
try {
  await start();
  assert.equal((await fetch(`${base}/api/state`)).status, 204);
  assert.equal((await fetch(`${base}/swagger/index.html`)).status, 200);
  const specification = await (await fetch(`${base}/swagger/v1/swagger.json`)).json();
  assert.ok(specification.paths["/api/state"].put);
  const state = demo();
  assert.equal((await put(state)).status, 204);
  assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  for (const invalid of [[], { version: 2 }, { ...state, accounts: [{ id: "bad" }] }, { ...state, categories: [123] }]) {
    assert.equal((await put(invalid)).status, 400);
    assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  }
  await stop();
  await start();
  assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  console.log("API OK: Swagger, validación, escritura/lectura y persistencia tras reiniciar. Base de pruebas independiente.");
} finally {
  await stop();
  for (const file of readdirSync(folder)) unlinkSync(path.join(folder, file));
  rmdirSync(folder);
}
