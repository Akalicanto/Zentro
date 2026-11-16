import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import nodemailer from "nodemailer";
import {
  monthlyPeriod,
  checkMonthlyBackup,
  backupStatus,
  claimBackupPrompt,
  postponeBackup,
} from "../../scripts/monthly-backup.mjs";
import { backupEmail } from "../../scripts/backup-email.mjs";

test("solo después del 15, con fecha de Madrid, también al volver meses después", () => {
  assert.equal(monthlyPeriod(new Date("2026-11-15T22:59:59Z")), null);
  assert.equal(monthlyPeriod(new Date("2026-11-15T23:00:00Z")), "2026-11");
  assert.equal(monthlyPeriod(new Date("2026-06-15T22:00:00Z")), "2026-06");
  assert.equal(monthlyPeriod(new Date("2027-02-22T12:00:00Z")), "2027-02");
});

test("copia WAL restaurable, adjunto real, reintento y una sola entrega por mes", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "zentro-mail-test-"));
  const source = path.join(directory, "source.sqlite");
  const db = new DatabaseSync(source);
  try {
    db.exec(
      "PRAGMA journal_mode=WAL; CREATE TABLE prueba (id INTEGER PRIMARY KEY, concepto TEXT); INSERT INTO prueba VALUES (1, 'Datos ficticios en WAL');",
    );
    const config = { database: source, recipient: "test@example.invalid" };
    const options = {
      confirmed: true,
      config,
      directory,
      now: new Date("2026-11-19T10:00:00Z"),
    };
    let attempts = 0;
    let firstRecord;
    let firstArchive;
    const fail = async (_, record, archive) => {
      attempts++;
      firstRecord = record;
      firstArchive = readFileSync(archive);
      throw Error("SMTP simulado sin conexion");
    };
    await assert.rejects(checkMonthlyBackup({ ...options, sender: fail }));
    assert.equal(existsSync(path.join(directory, "2026-11.sent.json")), false);
    assert.equal(
      existsSync(path.join(directory, "2026-11.pending.json")),
      true,
    );
    const sender = async (_, record, archive) => {
      attempts++;
      assert.equal(record.messageId, firstRecord.messageId);
      assert.deepEqual(readFileSync(archive), firstArchive);
      const restoredPath = path.join(directory, "restored.sqlite");
      writeFileSync(restoredPath, gunzipSync(readFileSync(archive)));
      const restored = new DatabaseSync(restoredPath, { readOnly: true });
      try {
        assert.equal(
          restored.prepare("SELECT concepto FROM prueba").get().concepto,
          "Datos ficticios en WAL",
        );
      } finally {
        restored.close();
      }
      const email = backupEmail(record);
      assert.doesNotMatch(email.html, /href=|https?:|<script|<img/i);
      const transport = nodemailer.createTransport({
        streamTransport: true,
        buffer: true,
      });
      const result = await transport.sendMail({
        from: "test@example.invalid",
        to: config.recipient,
        ...email,
        attachments: [{ filename: record.filename, path: archive }],
      });
      const mime = result.message.toString();
      assert.match(mime, /multipart\/mixed/);
      assert.match(mime, /multipart\/alternative/);
      assert.match(mime, /Content-Disposition: attachment;/);
      assert.match(mime, /\.sqlite\.gz/);
      assert.ok(
        mime.replace(/\s/g, "").includes(firstArchive.toString("base64")),
        "El MIME lleva los bytes reales del archivo",
      );
    };
    assert.equal(await checkMonthlyBackup({ ...options, sender }), "sent");
    assert.equal(
      await checkMonthlyBackup({ ...options, sender }),
      "already-sent",
    );
    assert.equal(attempts, 2);
    // La apertura de un mes posterior crea solo la copia actual.
    let later;
    assert.equal(
      await checkMonthlyBackup({
        ...options,
        now: new Date("2027-02-20T12:00:00Z"),
        sender: async (_, record) => {
          later = record.period;
        },
      }),
      "sent",
    );
    assert.equal(later, "2027-02");
    assert.equal(existsSync(path.join(directory, "2026-12.sent.json")), false);
    assert.equal(
      await checkMonthlyBackup({
        ...options,
        now: new Date("2027-03-15T12:00:00Z"),
        sender,
      }),
      "not-due",
    );
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("dos aperturas simultáneas no duplican el correo; origen ausente no crea copia vacía", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "zentro-mail-lock-test-"));
  try {
    const source = path.join(directory, "source.sqlite");
    const db = new DatabaseSync(source);
    db.exec("CREATE TABLE prueba(id INTEGER)");
    db.close();
    const options = {
      confirmed: true,
      config: { database: source },
      directory,
      now: new Date("2026-11-16T12:00:00Z"),
    };
    let sends = 0;
    const sender = async () => {
      sends++;
      await new Promise((resolve) => setTimeout(resolve, 30));
    };
    const results = await Promise.all([
      checkMonthlyBackup({ ...options, sender }),
      checkMonthlyBackup({ ...options, sender }),
    ]);
    assert.deepEqual(results.sort(), ["busy", "sent"]);
    assert.equal(sends, 1);
    await assert.rejects(
      checkMonthlyBackup({
        ...options,
        now: new Date("2026-12-16T12:00:00Z"),
        config: { database: path.join(directory, "missing.sqlite") },
        sender,
      }),
    );
    assert.equal(existsSync(path.join(directory, "missing.sqlite")), false);
    assert.equal(existsSync(path.join(directory, "2026-12.sent.json")), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("sin confirmación no se crea ni se envía una copia; recordar tras 24 horas y reinicios", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "zentro-mail-consent-"));
  try {
    const config = {
      enabled: true,
      recipient: "test@example.invalid",
      database: path.join(directory, "source.sqlite"),
    };
    const now = new Date("2026-11-16T10:00:00Z");
    const options = { config, directory, now };
    let sends = 0;
    assert.equal(
      await checkMonthlyBackup({
        ...options,
        sender: async () => {
          sends++;
        },
      }),
      "confirmation-required",
    );
    assert.equal(sends, 0);
    assert.equal(backupStatus(options).shouldPrompt, true);
    const first = claimBackupPrompt(options);
    assert.equal(first.claimed, true);
    assert.equal(first.remindAfter, "2026-11-17T10:00:00.000Z");
    assert.equal(
      claimBackupPrompt(options).claimed,
      false,
      "Otra pestaña no abre el mismo aviso",
    );
    assert.equal(
      backupStatus({ ...options, now: new Date("2026-11-17T09:59:59Z") })
        .shouldPrompt,
      false,
    );
    assert.equal(
      backupStatus({ ...options, now: new Date("2026-11-17T10:00:00Z") })
        .shouldPrompt,
      true,
    );
    postponeBackup({ directory, now: new Date("2026-11-16T10:10:00Z") });
    assert.equal(
      backupStatus({ ...options, now: new Date("2026-11-17T10:00:00Z") })
        .shouldPrompt,
      false,
    );
    assert.equal(
      backupStatus({ ...options, now: new Date("2026-11-17T10:10:00Z") })
        .shouldPrompt,
      true,
    );
    assert.equal(
      backupStatus({ ...options, config: { enabled: false } }).shouldPrompt,
      false,
    );
    assert.equal(
      backupStatus({ ...options, now: new Date("2026-12-10T10:00:00Z") })
        .shouldPrompt,
      false,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("el envío manual funciona antes del 16 y aunque exista una copia mensual", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "zentro-mail-manual-"));
  try {
    const database = path.join(directory, "source.sqlite");
    const db = new DatabaseSync(database);
    db.exec("CREATE TABLE prueba(id INTEGER)");
    db.close();
    const config = { enabled: true, database };
    const now = new Date("2026-11-10T12:00:00Z");
    let sends = 0;
    const options = {
      directory,
      config,
      now,
      sender: async () => {
        sends++;
      },
      confirmed: true,
      manual: true,
    };
    assert.equal(await checkMonthlyBackup(options), "sent");
    assert.equal(await checkMonthlyBackup(options), "sent");
    assert.equal(sends, 2);
    assert.equal(
      backupStatus({ directory, config, now: new Date("2026-11-20T12:00:00Z") })
        .shouldPrompt,
      false,
    );
    assert.equal(
      await checkMonthlyBackup({
        ...options,
        manual: false,
        now: new Date("2026-11-20T12:00:00Z"),
      }),
      "already-sent",
    );
    assert.equal(sends, 2);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
