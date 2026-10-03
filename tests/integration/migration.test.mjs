import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, mkdirSync } from "node:fs";
import path from "node:path";

const collections = [
  ["savings_months", ["savings"]],
  ["investment_months", ["investment"]],
  ["daily_expenses", ["daily", "expenses"]],
  ["daily_incomes", ["daily", "incomes"]],
  ["interest_entries", ["interest", "entries"]],
  ["internal_debt_items", ["internalDebt", "items"]],
  ["internal_debt_payments", ["internalDebt", "payments"]],
  ["internal_debt_schedule", ["internalDebt", "schedule"]],
  ["commitments", ["commitments"]],
  ["possible_expenses", ["possibleExpenses"]],
  ["external_debts", ["debts"]],
  ["savings_placements", ["savingsPlacements"]],
];

function makeLegacy(file, profile, monolithic = false) {
  const db = new DatabaseSync(file);
  // Deja datos en el WAL para comprobar que la copia nativa también los conserva.
  db.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE app_state(id INTEGER PRIMARY KEY,document TEXT,updated_at TEXT)",
  );
  db.prepare("INSERT INTO app_state VALUES(1,?,'fecha de prueba')").run(
    JSON.stringify(monolithic ? profile : { version: 2 }),
  );
  if (!monolithic) {
    const metadata = structuredClone(profile);
    for (const [table, keys] of collections) {
      let parent = metadata;
      for (const key of keys.slice(0, -1)) parent = parent[key];
      const rows = parent[keys.at(-1)] ?? [];
      delete parent[keys.at(-1)];
      db.exec(
        `CREATE TABLE ${table}(record_key TEXT PRIMARY KEY,row_order INTEGER,month TEXT,amount INTEGER,payload TEXT)`,
      );
      const insert = db.prepare(`INSERT INTO ${table} VALUES(?,?,NULL,NULL,?)`);
      rows.forEach((row, index) =>
        insert.run(String(index), index, JSON.stringify(row)),
      );
    }
    db.exec(
      "CREATE TABLE profile_settings(id INTEGER PRIMARY KEY,document TEXT)",
    );
    db.prepare("INSERT INTO profile_settings VALUES(1,?)").run(
      JSON.stringify(metadata),
    );
  }
  return db;
}

export async function runMigrationChecks({
  folder,
  start,
  stop,
  base,
  profile,
}) {
  const snapshots = path.join(folder, "respaldos");
  mkdirSync(snapshots, { recursive: true });
  // Preserva NULL, cero y una aportación negativa, así como el orden de los registros.
  const original = structuredClone(profile);
  original.savings.push(
    {
      month: "2026-08",
      goal: null,
      actual: -500,
      repayment: 0,
      withdrawal: 0,
      approximation: null,
    },
    {
      month: "2026-07",
      goal: 0,
      actual: 0,
      repayment: 0,
      withdrawal: 0,
      approximation: null,
    },
    {
      month: "2027-01",
      goal: 12000,
      actual: null,
      repayment: 0,
      withdrawal: 0,
      approximation: 12000,
    },
  );
  for (const monolithic of [false, true]) {
    const file = path.join(
      folder,
      monolithic ? "legacy-document.db" : "legacy-collections.db",
    );
    const legacy = makeLegacy(file, original, monolithic);
    const before = readdirSync(snapshots).length;
    try {
      await start(file);
      assert.deepEqual(
        await (await fetch(`${base}/api/state`)).json(),
        original,
      );
      const migrated = new DatabaseSync(file, { readOnly: true });
      assert.equal(
        migrated.prepare("PRAGMA user_version").get().user_version,
        1,
      );
      assert.deepEqual(migrated.prepare("PRAGMA foreign_key_check").all(), []);
      assert.equal(
        migrated
          .prepare("SELECT COUNT(*) AS n FROM sqlite_schema WHERE type='table'")
          .get().n,
        17,
      );
      assert.equal(
        migrated
          .prepare(
            "SELECT aportacion_centimos FROM ahorros_mensuales WHERE mes='2026-08'",
          )
          .get().aportacion_centimos,
        -500,
      );
      assert.equal(
        migrated
          .prepare(
            "SELECT aportacion_centimos FROM ahorros_mensuales WHERE mes='2026-07'",
          )
          .get().aportacion_centimos,
        0,
      );
      assert.equal(
        migrated
          .prepare(
            "SELECT aportacion_centimos FROM ahorros_mensuales WHERE mes='2027-01'",
          )
          .get().aportacion_centimos,
        null,
      );
      assert.equal(
        migrated
          .prepare(
            "SELECT COUNT(*) AS n FROM sqlite_schema WHERE name IN ('app_state','profile_settings','savings_months')",
          )
          .get().n,
        0,
      );
      migrated.close();
      assert.equal(readdirSync(snapshots).length, before + 1);
      await stop();
      await start(file);
      assert.deepEqual(
        await (await fetch(`${base}/api/state`)).json(),
        original,
      );
      assert.equal(readdirSync(snapshots).length, before + 1);
    } finally {
      await stop();
      legacy.close();
    }
  }
  const invalid = structuredClone(original);
  delete invalid.savings[0].actual;
  const file = path.join(folder, "invalid-legacy.db");
  const legacy = makeLegacy(file, invalid, true);
  try {
    const before = new Set(readdirSync(snapshots));
    await assert.rejects(start(file), /perfil anterior no cumple/);
    assert.equal(legacy.prepare("PRAGMA user_version").get().user_version, 0);
    assert.equal(
      legacy
        .prepare("SELECT COUNT(*) AS n FROM sqlite_schema WHERE name='perfil'")
        .get().n,
      0,
    );
    assert.deepEqual(
      JSON.parse(
        legacy.prepare("SELECT document FROM app_state").get().document,
      ),
      invalid,
    );
    const backup = readdirSync(snapshots).find((name) => !before.has(name));
    assert.ok(backup);
    const restored = new DatabaseSync(path.join(snapshots, backup), {
      readOnly: true,
    });
    assert.deepEqual(
      JSON.parse(
        restored.prepare("SELECT document FROM app_state").get().document,
      ),
      invalid,
    );
    assert.equal(
      restored.prepare("PRAGMA integrity_check").get().integrity_check,
      "ok",
    );
    restored.close();
  } finally {
    await stop();
    legacy.close();
  }
  console.log(
    "Migración OK: formatos antiguos, respaldo con WAL, relaciones, NULL/cero/negativos, reinicio y cancelación sin pérdida de datos.",
  );
}
