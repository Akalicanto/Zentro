import { DatabaseSync, backup } from "node:sqlite";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { backupEmail } from "./backup-email.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
export const localDirectory =
  process.env.ZENTRO_MAIL_DIRECTORY ||
  path.join(
    process.env.LOCALAPPDATA || process.env.HOME || root,
    "Zentro",
    "mail-backups",
  );
const execute = promisify(execFile);

export function monthlyPeriod(now = new Date(), includeEarly = false) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return includeEarly || Number(values.day) > 15
    ? `${values.year}-${values.month}`
    : null;
}

function saveJson(filename, value) {
  const temporary = filename + ".tmp-" + randomUUID();
  writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  renameSync(temporary, filename);
}

function acquireLock(directory) {
  const lock = path.join(directory, ".lock");
  try {
    mkdirSync(lock);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    try {
      const pid = Number(readFileSync(path.join(lock, "pid"), "utf8"));
      if (!Number.isSafeInteger(pid) || pid <= 0) return null;
      process.kill(pid, 0);
      return null;
    } catch (error) {
      if (
        error.code !== "ESRCH" &&
        !(
          error.code === "ENOENT" &&
          Date.now() - statSync(lock).mtimeMs > 300_000
        )
      )
        return null;
    }
    rmSync(lock, { recursive: true });
    return acquireLock(directory);
  }
  writeFileSync(path.join(lock, "pid"), String(process.pid));
  return () => rmSync(lock, { recursive: true, force: true });
}

async function makeArchive(databasePath, directory, period, now) {
  // readOnly refuses to create an empty database if the original is missing.
  const source = new DatabaseSync(databasePath, { readOnly: true });
  const temporary = path.join(
    directory,
    ".snapshot-" + randomUUID() + ".sqlite",
  );
  try {
    await backup(source, temporary);
    const copy = new DatabaseSync(temporary, { readOnly: true });
    try {
      const integrity = copy.prepare("PRAGMA integrity_check").all();
      if (
        integrity.length !== 1 ||
        Object.values(integrity[0])[0] !== "ok" ||
        copy.prepare("PRAGMA foreign_key_check").all().length
      )
        throw Error("La copia no supera la comprobación de integridad.");
    } finally {
      copy.close();
    }
    const filename = `zentro-${period}-${randomUUID().slice(0, 8)}.sqlite.gz`;
    const archive = path.join(directory, filename);
    const content = gzipSync(readFileSync(temporary));
    writeFileSync(archive, content, { mode: 0o600, flag: "wx" });
    return {
      period,
      filename,
      createdAt: now.toISOString(),
      bytes: content.length,
      messageId: `<${randomUUID()}@zentro.local>`,
    };
  } finally {
    source.close();
    rmSync(temporary, { force: true });
  }
}

export async function sendBackup(config, record, archive) {
  if (![465, 587].includes(Number(config.smtpPort)))
    throw Error("SMTP requiere TLS: puerto 465 o 587.");
  // DPAPI: the credential can only be decrypted by this Windows user on this PC.
  const { stdout } = await execute(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.Encoding]::UTF8; (Import-Clixml -LiteralPath $env:ZENTRO_MAIL_CREDENTIAL).GetNetworkCredential().Password",
    ],
    {
      windowsHide: true,
      timeout: 15_000,
      env: { ...process.env, ZENTRO_MAIL_CREDENTIAL: config.credentialFile },
    },
  );
  const { default: nodemailer } = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: Number(config.smtpPort),
    secure: Number(config.smtpPort) === 465,
    requireTLS: true,
    auth: { user: config.smtpUser, pass: stdout.replace(/\r?\n$/, "") },
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 60_000,
    tls: { minVersion: "TLSv1.2" },
    disableUrlAccess: true,
  });
  const result = await transport.sendMail({
    from: { name: "Zentro", address: config.smtpUser },
    to: config.recipient,
    subject: `Zentro · Tu copia de seguridad · ${record.period}`,
    messageId: record.messageId,
    ...backupEmail(record),
    attachments: [
      {
        filename: record.filename,
        path: archive,
        contentType: "application/gzip",
      },
    ],
  });
  if (result.rejected?.length || !result.accepted?.length)
    throw Error("SMTP no aceptó el destinatario.");
}

export async function checkMonthlyBackup({
  config,
  directory = localDirectory,
  now = new Date(),
  sender = sendBackup,
  confirmed = false,
  manual = false,
}) {
  const period = monthlyPeriod(now, manual);
  if (!period) return "not-due";
  if (!confirmed) return "confirmation-required";
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const unlock = acquireLock(directory);
  if (!unlock) return "busy";
  try {
    const receipt = path.join(directory, period + ".sent.json");
    if (!manual && existsSync(receipt)) return "already-sent";
    const pending = path.join(directory, period + ".pending.json");
    let record = existsSync(pending)
      ? JSON.parse(readFileSync(pending, "utf8"))
      : null;
    if (!record || manual) {
      record = await makeArchive(config.database, directory, period, now);
      saveJson(pending, record);
    }
    const archive = path.join(directory, record.filename);
    if (
      path.dirname(archive) !== path.resolve(directory) ||
      !record.filename.endsWith(".sqlite.gz")
    )
      throw Error("Archivo de copia inválido.");
    if (statSync(archive).size > 18 * 1024 * 1024)
      throw Error("La copia supera el límite de 18 MB del adjunto.");
    await sender(config, record, archive);
    saveJson(receipt, {
      ...record,
      sentAt: new Date().toISOString(),
      recipient: config.recipient,
    });
    rmSync(pending, { force: true });
    return "sent";
  } finally {
    unlock();
  }
}

export function backupStatus({
  config,
  directory = localDirectory,
  now = new Date(),
}) {
  if (!config?.enabled)
    return { configured: false, due: false, shouldPrompt: false };
  const period = monthlyPeriod(now, true);
  const receipt = path.join(directory, period + ".sent.json");
  const reminder = path.join(directory, "reminder.json");
  const sent = existsSync(receipt)
    ? JSON.parse(readFileSync(receipt, "utf8"))
    : null;
  const remindAfter = existsSync(reminder)
    ? JSON.parse(readFileSync(reminder, "utf8")).remindAfter
    : null;
  const due = !!monthlyPeriod(now) && !sent;
  return {
    configured: true,
    recipient: config.recipient,
    due,
    shouldPrompt:
      due && (!remindAfter || Date.parse(remindAfter) <= now.getTime()),
    remindAfter,
    sentAt: sent?.sentAt ?? null,
  };
}

export function postponeBackup({
  directory = localDirectory,
  now = new Date(),
} = {}) {
  const remindAfter = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  saveJson(path.join(directory, "reminder.json"), { remindAfter });
  return remindAfter;
}

export function claimBackupPrompt(options) {
  const directory = options.directory ?? localDirectory;
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const unlock = acquireLock(directory);
  if (!unlock) return { claimed: false };
  try {
    const status = backupStatus(options);
    if (!status.shouldPrompt) return { ...status, claimed: false };
    // Reserve the reminder before displaying it: closing the app or ignoring
    // the dialog still postpones the next question, including in other tabs.
    const remindAfter = postponeBackup(options);
    return { ...status, claimed: true, remindAfter };
  } finally {
    unlock();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const actionIndex = process.argv.indexOf("--action");
    const action = actionIndex < 0 ? "status" : process.argv[actionIndex + 1];
    if (!["status", "prompt", "defer", "send", "manual"].includes(action))
      throw Error("Acción inválida.");
    const configPath = path.join(localDirectory, "config.json");
    const config = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, "utf8"))
      : null;
    const expected = process.env.ZENTRO_MAIL_DATABASE;
    const configured =
      config?.enabled &&
      (!expected ||
        path.resolve(config.database).toLowerCase() ===
          path.resolve(expected).toLowerCase());
    if (!configured) {
      if (action !== "status")
        throw Error("Configura primero las copias para esta base de datos.");
      console.log(
        JSON.stringify({ configured: false, due: false, shouldPrompt: false }),
      );
    } else {
      const options = { config };
      let result;
      if (action === "status") result = backupStatus(options);
      else if (action === "prompt") result = claimBackupPrompt(options);
      else if (action === "defer") result = { remindAfter: postponeBackup() };
      else
        result = {
          result: await checkMonthlyBackup({
            ...options,
            confirmed: true,
            manual: action === "manual",
          }),
        };
      console.log(JSON.stringify(result));
    }
  } catch {
    // Never expose SMTP responses, filesystem paths, credentials or financial data.
    console.log(
      JSON.stringify({
        error:
          "No se pudo completar la operación de copia. Comprueba la conexión y la configuración del correo.",
      }),
    );
    process.exitCode = 1;
  }
}
