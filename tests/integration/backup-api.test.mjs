import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { get } from "node:http";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const directory = mkdtempSync(path.join(tmpdir(), "zentro-backup-api-"));
const database = path.join(directory, "test.sqlite");
const outbox = path.join(directory, "mail");
mkdirSync(outbox);
const configPath = path.join(outbox, "config.json");
const config = {
  enabled: true,
  recipient: "test@example.invalid",
  database,
  smtpHost: "smtp.invalid",
  smtpPort: 465,
  credentialFile: path.join(directory, "missing.credential.xml"),
};
writeFileSync(configPath, JSON.stringify(config));
const listener = createServer();
await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${listener.address().port}`;
await new Promise((resolve) => listener.close(resolve));
const child = spawn(
  "C:/Program Files/dotnet/dotnet.exe",
  [path.join(root, "Zentro.Api/bin/Debug/net10.0/Zentro.Api.dll")],
  {
    cwd: path.join(root, "Zentro.Api"),
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ASPNETCORE_ENVIRONMENT: "Development",
      ASPNETCORE_URLS: base,
      Zentro__DatabasePath: database,
      Zentro__MailBackupDirectory: outbox,
    },
  },
);
let output = "";
child.stdout.on("data", (chunk) => {
  output += chunk;
});
child.stderr.on("data", (chunk) => {
  output += chunk;
});
try {
  for (let attempt = 0; ; attempt++) {
    if (child.exitCode !== null || attempt > 100)
      throw Error(output || "La API no arranca");
    try {
      if ((await fetch(base + "/api/health")).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const status = await (await fetch(base + "/api/backups/status")).json();
  assert.equal(status.configured, true);
  assert.equal(status.recipient, config.recipient);
  const invalidHostStatus = await new Promise((resolve, reject) => {
    get(
      base + "/api/backups/status",
      { headers: { Host: "example.invalid" } },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    ).on("error", reject);
  });
  assert.equal(invalidHostStatus, 400);
  assert.doesNotMatch(
    JSON.stringify(status),
    /credential|smtpHost|password|database/,
  );
  assert.equal(
    (await fetch(base + "/api/backups/send-now", { method: "POST" })).status,
    400,
  );
  assert.equal(
    (
      await fetch(base + "/api/backups/send-now", {
        method: "POST",
        headers: {
          "X-Zentro-Client": "web",
          Origin: "https://example.invalid",
        },
      })
    ).status,
    400,
  );
  const prompt = await (
    await fetch(base + "/api/backups/prompt", {
      method: "POST",
      headers: { "X-Zentro-Client": "web", Origin: "http://127.0.0.1:5187" },
    })
  ).json();
  assert.equal(prompt.claimed, status.shouldPrompt);
  assert.equal(
    (
      await (
        await fetch(base + "/api/backups/prompt", {
          method: "POST",
          headers: { "X-Zentro-Client": "web" },
        })
      ).json()
    ).claimed,
    false,
  );
  const deferred = await (
    await fetch(base + "/api/backups/defer", {
      method: "POST",
      headers: { "X-Zentro-Client": "web" },
    })
  ).json();
  assert.ok(
    Date.parse(deferred.remindAfter) > Date.now() + 23.9 * 60 * 60 * 1000,
  );
  assert.equal(
    (await (await fetch(base + "/api/backups/status")).json()).shouldPrompt,
    false,
  );
  // The credential intentionally does not exist. Sending fails before any SMTP
  // connection; all data lives in a disposable directory, never the user's DB.
  const failed = await fetch(base + "/api/backups/send-now", {
    method: "POST",
    headers: { "X-Zentro-Client": "web" },
  });
  assert.equal(failed.status, 400);
  const error = await failed.json();
  assert.ok(error.error);
  assert.doesNotMatch(
    JSON.stringify(error),
    /missing\.credential|Import-Clixml|smtp\.invalid/,
  );
  assert.equal(
    (await (await fetch(base + "/api/backups/status")).json()).sentAt,
    null,
  );
  writeFileSync(configPath, JSON.stringify({ ...config, enabled: false }));
  assert.equal(
    (await (await fetch(base + "/api/backups/status")).json()).configured,
    false,
  );
  assert.equal(
    (
      await fetch(base + "/api/backups/send-now", {
        method: "POST",
        headers: { "X-Zentro-Client": "web" },
      })
    ).status,
    400,
  );
  assert.equal(existsSync(path.join(outbox, "smtp.credential.xml")), false);
  console.log(
    "API de copias OK: estado, reserva del aviso, 24 horas, protección de origen y fallos sin envío real.",
  );
} finally {
  if (child.exitCode === null) {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    await exited;
  }
  assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
  assert.ok(path.basename(directory).startsWith("zentro-backup-api-"));
  rmSync(directory, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}
