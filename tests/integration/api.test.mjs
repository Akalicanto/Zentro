import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { testProfile } from "../../Zentro.Front/tests/fixtures/profile.ts";
import { DatabaseSync } from "node:sqlite";
import {
  withdrawSavings,
  repayDebt,
  today,
} from "../../Zentro.Front/src/domain/index.ts";

import { runMigrationChecks } from "./migration.test.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const folder = mkdtempSync(path.join(os.tmpdir(), "zentro-api-test-"));
const server = createServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
const base = `http://127.0.0.1:${port}`;
const dotnet =
  process.platform === "win32"
    ? path.join(
        process.env.ProgramFiles || "C:/Program Files",
        "dotnet/dotnet.exe",
      )
    : "dotnet";
let child;
let sql;
let output = "";
async function start(databasePath = path.join(folder, "test.db")) {
  output = "";
  child = spawn(
    dotnet,
    [path.join(root, "Zentro.Api/bin/Debug/net10.0/Zentro.Api.dll")],
    {
      cwd: path.join(root, "Zentro.Api"),
      windowsHide: true,
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: "Development",
        ASPNETCORE_URLS: base,
        Zentro__DatabasePath: databasePath,
        Zentro__BackupDirectory: path.join(folder, "respaldos"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (data) => {
    output += data;
  });
  child.stderr.on("data", (data) => {
    output += data;
  });
  child.on("error", (error) => {
    output += error.message;
  });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(output);
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`La API no arrancó: ${output}`);
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  if (process.platform === "win32")
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
  else child.kill("SIGTERM");
  await exited;
}
async function put(data) {
  return fetch(`${base}/api/state`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
try {
  await start();
  assert.equal((await fetch(`${base}/api/state`)).status, 204);
  assert.equal((await fetch(`${base}/swagger/index.html`)).status, 200);
  assert.equal((await fetch(base)).status, 200);
  const manifest = await (await fetch(`${base}/manifest.webmanifest`)).json();
  assert.equal(manifest.name, "Zentro");
  assert.equal(
    (await fetch(`${base}/sw.js`)).headers.get("cache-control"),
    "no-cache",
  );
  const specification = await (
    await fetch(`${base}/swagger/v1/swagger.json`)
  ).json();
  assert.ok(specification.paths["/api/state"].put);
  assert.ok(specification.components.schemas.FinancialProfile);
  assert.equal(
    specification.paths["/api/state"].put.requestBody.content[
      "application/json"
    ].schema.$ref,
    "#/components/schemas/FinancialProfile",
  );
  const state = testProfile();
  state.cash = 1700;
  state.mortgageOffer = 9000000;
  state.savingsPlacements = [
    {
      id: "deposit-test",
      name: "Depósito de prueba",
      kind: "deposit",
      amount: 40000,
      annualRateBps: 400,
      rateType: "tin",
      withholdingBps: 1900,
      start: "2026-01-31",
      months: 12,
    },
    {
      id: "account-test",
      name: "Cuenta de prueba",
      kind: "remunerated",
      amount: null,
      annualRateBps: 200,
      rateType: "tin",
      dayCount: "actual360",
      withholdingBps: 1900,
      start: null,
      months: null,
    },
  ];
  state.debts = [
    {
      id: "external-test",
      name: "Dentista",
      total: 25000,
      createdOn: "2026-01-01",
      notes: "Nota de prueba",
      activity: [
        {
          id: "test-log",
          date: "2026-01-01",
          description: "Deuda de prueba creada.",
        },
      ],
      installments: [
        { month: "2026-01", amount: 10000, status: "paid" },
        { month: "2026-02", amount: 5000, status: "reserved" },
        { month: "2026-03", amount: 10000, status: "pending" },
      ],
    },
  ];
  state.possibleExpenses = [
    { id: "possible-test", concept: "Posible gasto de prueba", amount: 8000 },
  ];
  assert.equal((await put(state)).status, 204);
  for (const bad of [
    { completedOn: "2026-10-10" },
    { notes: "x".repeat(2001) },
    { activity: [{ id: "bad", date: "2026-13-01", description: "Inválido" }] },
  ]) {
    assert.equal(
      (await put({ ...state, debts: [{ ...state.debts[0], ...bad }] })).status,
      400,
    );
  }
  const oldDaily = structuredClone(state);
  oldDaily.daily.expenses[0].month = "2024-08";
  assert.equal((await put(oldDaily)).status, 204);
  assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  assert.equal(
    (await put({ ...state, customMetadata: { label: "no admitido" } })).status,
    400,
  );
  assert.equal(
    (
      await put({
        ...state,
        debts: [{ ...state.debts[0], date: "campo desconocido" }],
      })
    ).status,
    400,
  );
  assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  // Malformed nested fields must return 400 and leave the persisted profile intact.
  const malformed = [];
  for (const field of [
    "daily",
    "savings",
    "investment",
    "interest",
    "internalDebt",
    "plan",
    "commitments",
    "cash",
    "mortgageOffer",
    "debts",
    "savingsPlacements",
    "possibleExpenses",
  ]) {
    malformed.push({ ...state, [field]: null });
  }
  malformed.push(
    { ...state, cash: "1700" },
    { ...state, savings: [null] },
    { ...state, savingsPlacements: [null] },
    {
      ...state,
      savingsPlacements: [{ ...state.savingsPlacements[0], dayCount: null }],
    },
    { ...state, internalDebt: { ...state.internalDebt, items: [null] } },
    { ...state, interest: { ...state.interest, entries: [null] } },
  );
  const missingNullableAmount = structuredClone(state);
  delete missingNullableAmount.savings[0].actual;
  malformed.push(missingNullableAmount);
  const missingRequiredBoolean = structuredClone(state);
  delete missingRequiredBoolean.internalDebt.items[0].historical;
  malformed.push(missingRequiredBoolean);
  for (const invalid of malformed) {
    assert.equal((await put(invalid)).status, 400);
    assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  }
  for (const invalid of [
    [],
    { version: 2 },
    { ...state, cash: -1 },
    { ...state, mortgageOffer: -1 },
    {
      ...state,
      possibleExpenses: [{ id: "invalid", concept: "", amount: 100 }],
    },
    { ...state, savings: [{ month: "bad" }] },
    { ...state, daily: { ...state.daily, opening: 0.5 } },
    {
      ...state,
      daily: {
        ...state.daily,
        opening: Number.MAX_SAFE_INTEGER,
        incomes: [
          {
            id: "overflow",
            concept: "Ingreso",
            amount: 1,
            status: "planned",
            includedInOpening: false,
          },
        ],
        expenses: [],
      },
    },
    {
      ...state,
      possibleExpenses: [
        { id: "large", concept: "Grande", amount: Number.MAX_SAFE_INTEGER },
        { id: "extra", concept: "Extra", amount: 1 },
      ],
    },
    { ...state, plan: { ...state.plan, start: "2026-01", horizon: "2076-01" } },
    { ...state, plan: { ...state.plan, start: "0026-01" } },
  ]) {
    assert.equal((await put(invalid)).status, 400);
    assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  }
  for (const row of [
    { ...state.savings[0], month: "2026-13" },
    { ...state.savings[0], repayment: -1 },
    { ...state.savings[0], actual: 0.5 },
  ]) {
    const invalid = structuredClone(state);
    invalid.savings[0] = row;
    assert.equal((await put(invalid)).status, 400);
    assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  }
  await stop();
  await start();
  assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  for (const external of [
    { ...state.debts[0], total: 20000 },
    {
      ...state.debts[0],
      installments: [
        ...state.debts[0].installments,
        state.debts[0].installments[0],
      ],
    },
    {
      ...state.debts[0],
      installments: [{ month: "2026-13", amount: 100, status: "paid" }],
    },
    {
      ...state.debts[0],
      installments: [{ month: "2026-01", amount: 100, status: "unknown" }],
    },
  ]) {
    assert.equal((await put({ ...state, debts: [external] })).status, 400);
    assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  }
  const invalidGlobal = structuredClone(state);
  for (const placements of [
    [{ ...state.savingsPlacements[0], start: "2026-02-30" }],
    [{ ...state.savingsPlacements[0], annualRateBps: -1 }],
    [{ ...state.savingsPlacements[0], amount: null }],
    [
      state.savingsPlacements[1],
      { ...state.savingsPlacements[1], id: "another-account" },
    ],
    [{ ...state.savingsPlacements[1], rateType: "tae" }],
  ]) {
    assert.equal(
      (await put({ ...state, savingsPlacements: placements })).status,
      400,
    );
    assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  }
  invalidGlobal.savings.push({ ...invalidGlobal.savings[0] });
  assert.equal((await put(invalidGlobal)).status, 400);
  assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), state);
  const withdrawn = withdrawSavings(
    state,
    1000,
    "Retirada de prueba",
    today(),
    "work",
  );
  const repaid = repayDebt(withdrawn, 1000, today());
  assert.equal((await put(repaid)).status, 204);
  assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), repaid);
  sql = new DatabaseSync(path.join(folder, "test.db"));
  assert.equal(sql.prepare("PRAGMA user_version").get().user_version, 3);
  assert.equal(
    sql
      .prepare("PRAGMA table_info(movimientos_diarios)")
      .all()
      .some((column) => column.name === "mes"),
    false,
  );
  assert.deepEqual(sql.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(
    sql.prepare("PRAGMA integrity_check").get().integrity_check,
    "ok",
  );
  for (const [table, count] of Object.entries({
    ahorros_mensuales: 2,
    inversiones_mensuales: 1,
    reposiciones_deuda_interna: 2,
    destinos_ahorro: 2,
    deudas: 1,
    cuotas_deudas: 3,
    posibles_gastos: 1,
  })) {
    assert.equal(
      sql.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count,
      count,
    );
  }
  assert.equal(
    sql.prepare("SELECT efectivo_centimos FROM perfil").get().efectivo_centimos,
    1700,
  );
  assert.equal(
    sql.prepare("SELECT estado FROM cuotas_deudas WHERE mes='2026-02'").get()
      .estado,
    "apartado",
  );
  assert.equal(
    sql
      .prepare(
        "SELECT metodo_calculo FROM destinos_ahorro WHERE id='account-test'",
      )
      .get().metodo_calculo,
    "dias_reales_360",
  );
  assert.equal(
    sql
      .prepare(
        "SELECT capital_centimos FROM destinos_ahorro WHERE id='account-test'",
      )
      .get().capital_centimos,
    null,
  );
  assert.equal(
    sql
      .prepare(
        "SELECT fecha_inicio FROM destinos_ahorro WHERE id='account-test'",
      )
      .get().fecha_inicio,
    null,
  );
  const tables = sql
    .prepare("SELECT name FROM sqlite_schema WHERE type='table'")
    .all();
  assert.equal(tables.length, 18);
  for (const { name } of tables) {
    const columns = sql
      .prepare(`PRAGMA table_info(${name})`)
      .all()
      .map((row) => row.name);
    assert.ok(!columns.includes("payload") && !columns.includes("document"));
  }
  sql.exec("PRAGMA foreign_keys=ON");
  assert.throws(
    () =>
      sql.exec(
        "INSERT INTO cuotas_deudas VALUES(1,0,'inexistente','2029-01',100,'pendiente')",
      ),
    /FOREIGN KEY/,
  );
  assert.throws(
    () => sql.exec("UPDATE cuotas_deudas SET importe_centimos=-1"),
    /CHECK/,
  );
  // Un fallo de SQL después del borrado debe recuperar el perfil completo, incluidas sus relaciones.
  sql.exec(
    "CREATE TRIGGER fallo_controlado BEFORE INSERT ON compromisos BEGIN SELECT RAISE(ABORT,'fallo de prueba'); END",
  );
  const brokenWrite = structuredClone(repaid);
  brokenWrite.commitments.push({
    id: "abort-test",
    name: "Prueba de rollback",
    amount: 100,
  });
  assert.equal((await put(brokenWrite)).status, 500);
  assert.deepEqual(await (await fetch(`${base}/api/state`)).json(), repaid);
  sql.exec("DROP TRIGGER fallo_controlado");
  sql.close();
  sql = undefined;
  // Retiradas de intereses quedan vinculadas a su deuda mediante una clave externa.
  const interestWithdrawal = withdrawSavings(
    repaid,
    100,
    "Intereses de prueba",
    today(),
    "interest",
  );
  assert.equal((await put(interestWithdrawal)).status, 204);
  assert.deepEqual(
    await (await fetch(`${base}/api/state`)).json(),
    interestWithdrawal,
  );
  await stop();
  await runMigrationChecks({
    folder,
    start,
    stop,
    base,
    profile: interestWithdrawal,
  });
  console.log(
    "API OK: Swagger, validación, escritura/lectura y persistencia tras reiniciar. Base de pruebas independiente.",
  );
} finally {
  sql?.close();
  await stop();
  const target = path.resolve(folder);
  assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
  assert.ok(path.basename(target).startsWith("zentro-api-test-"));
  rmSync(target, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}
