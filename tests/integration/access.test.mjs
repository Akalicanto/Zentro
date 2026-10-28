import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHmac, pbkdf2Sync, randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { request as httpRequest } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { testProfile } from "../../Zentro.Front/tests/fixtures/profile.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const folder = mkdtempSync(path.join(os.tmpdir(), "zentro-access-test-"));
const listener = createServer();
await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${listener.address().port}`;
await new Promise((resolve) => listener.close(resolve));
const password = randomBytes(24).toString("base64url");
const salt = randomBytes(16);
const hash = `pbkdf2-sha256$600000$${salt.toString("base64")}$${pbkdf2Sync(password, salt, 600000, 32, "sha256").toString("base64")}`;
// RFC 6238 test key, exclusively synthetic.
const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
function code() {
  const counter = Buffer.alloc(8);
  counter.writeBigInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", "12345678901234567890")
    .update(counter)
    .digest();
  return String(
    (digest.readUInt32BE(digest.at(-1) & 15) & 0x7fffffff) % 1000000,
  ).padStart(6, "0");
}
const dotnet =
  process.platform === "win32"
    ? "C:/Program Files/dotnet/dotnet.exe"
    : "dotnet";
let child,
  output = "";
async function start(extra = {}) {
  output = "";
  child = spawn(
    dotnet,
    [
      process.env.ZENTRO_TEST_API_DLL ||
        path.join(root, "Zentro.Api/bin/Debug/net10.0/Zentro.Api.dll"),
    ],
    {
      cwd: path.join(root, "Zentro.Api"),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: "Production",
        ASPNETCORE_URLS: base,
        Zentro__DatabasePath: path.join(folder, "test.db"),
        Zentro__BackupDirectory: path.join(folder, "backups"),
        Zentro__Authentication__PasswordHash: hash,
        Zentro__Authentication__TotpSecret: secret,
        ...extra,
      },
    },
  );
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  child.on("error", (error) => (output += error.message));
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw Error(output);
    try {
      if ((await fetch(base + "/api/health")).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error("La API de prueba no inició: " + output);
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exit = new Promise((resolve) => child.once("exit", resolve));
  if (process.platform === "win32")
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
  else child.kill("SIGTERM");
  await exit;
}
const request = (url, { headers, ...options } = {}) =>
  fetch(base + url, {
    ...options,
    headers: {
      Host: "zentro.example.invalid",
      "X-Zentro-Client": "web",
      "X-Forwarded-Proto": "https",
      ...headers,
    },
  });
const login = (value = password) =>
  request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: value, code: code() }),
  });
try {
  await assert.rejects(
    start({ Zentro__Authentication__PasswordHash: "" }),
    /segundo factor/,
  );
  await stop();
  await start();
  assert.equal((await request("/api/state")).status, 401);
  assert.equal((await request("/swagger/index.html")).status, 404);
  assert.equal((await login("incorrecta")).status, 401);
  const signedIn = await login();
  assert.equal(signedIn.status, 204, output);
  const cookieHeader = signedIn.headers.get("set-cookie");
  assert.match(cookieHeader, /__Host-Zentro=/);
  assert.match(cookieHeader, /secure/i);
  assert.match(cookieHeader, /httponly/i);
  assert.match(cookieHeader, /samesite=strict/i);
  const cookie = cookieHeader.split(";")[0];
  const headers = { Cookie: cookie, "Content-Type": "application/json" };
  assert.equal(
    (await login()).status,
    401,
    "Un código ya usado no se reutiliza.",
  );
  let current = await request("/api/state", { headers });
  assert.equal(current.status, 204);
  assert.equal(current.headers.get("cache-control"), "no-store");
  assert.match(
    current.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
  // Node fetch normaliza Host a loopback, excluido de HSTS por .NET.
  const hsts = await new Promise((resolve, reject) => {
    const req = httpRequest(
      base + "/api/health",
      {
        headers: {
          Host: "zentro.example.invalid",
          "X-Forwarded-Proto": "https",
        },
      },
      (response) => {
        response.resume();
        resolve(response.headers["strict-transport-security"]);
      },
    );
    req.on("error", reject);
    req.end();
  });
  assert.match(hsts, /max-age/);
  const initial = current.headers.get("etag");
  assert.ok(initial);
  const profile = testProfile();
  assert.equal(
    (
      await request("/api/state", {
        method: "PUT",
        headers,
        body: JSON.stringify(profile),
      })
    ).status,
    428,
  );
  assert.equal(
    (
      await request("/api/state", {
        method: "PUT",
        headers: { ...headers, "If-Match": initial, "X-Zentro-Client": "" },
        body: JSON.stringify(profile),
      })
    ).status,
    400,
  );
  const saved = await request("/api/state", {
    method: "PUT",
    headers: { ...headers, "If-Match": initial },
    body: JSON.stringify(profile),
  });
  assert.equal(saved.status, 204);
  assert.notEqual(saved.headers.get("etag"), initial);
  assert.equal(
    (
      await request("/api/state", {
        method: "PUT",
        headers: { ...headers, "If-Match": initial },
        body: JSON.stringify({ ...profile, cash: 98765 }),
      })
    ).status,
    412,
  );
  current = await request("/api/state", { headers });
  assert.deepEqual(await current.json(), profile);
  assert.equal(current.headers.get("etag"), saved.headers.get("etag"));
  await stop();
  await start();
  assert.equal(
    (await request("/api/state", { headers })).status,
    200,
    "Sesión persiste tras reinicio con claves persistidas.",
  );
  assert.equal(
    (await login()).status,
    401,
    "El contador TOTP también persiste.",
  );
  assert.equal(
    (await request("/api/auth/logout", { method: "POST", headers })).status,
    204,
  );
  assert.equal((await request("/api/state")).status, 401);
  for (let i = 0; i < 4; i++)
    assert.equal((await login("incorrecta")).status, 401);
  assert.equal((await login()).status, 429);
  await stop();
  const newSalt = randomBytes(16);
  const newHash = `pbkdf2-sha256$600000$${newSalt.toString("base64")}$${pbkdf2Sync(password, newSalt, 600000, 32, "sha256").toString("base64")}`;
  await start({ Zentro__Authentication__PasswordHash: newHash });
  assert.equal(
    (await request("/api/state", { headers })).status,
    401,
    "Cambiar acceso invalida la cookie antigua.",
  );
  console.log(
    "Acceso OK: producción cerrada sin secretos, contraseña + TOTP sin replay, cookie segura persistente, CSRF, límite de intentos, ETag y cambio de credenciales. SQLite temporal.",
  );
} finally {
  await stop();
  assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(folder).startsWith("zentro-access-test-"));
  rmSync(folder, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}
