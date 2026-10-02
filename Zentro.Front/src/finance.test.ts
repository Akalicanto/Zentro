import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demo,
  empty,
  balance,
  totals,
  debtState,
  projected,
  cents,
  validateData,
  validateEntry,
  type Entry,
} from "./finance";
test("Céntimos y formato decimal español", () => {
  assert.equal(cents("123,45"), 12345);
  assert.equal(cents("0.29"), 29);
  assert.throws(() => cents("1.001"));
});
test("Saldo inicial incluye intereses sin duplicarlos", () => {
  const d = demo();
  assert.equal(totals(d).savings, 800000);
  assert.equal(totals(d).invested, 250000);
  assert.equal(
    projected(
      {
        ...d,
        entries: d.entries.filter(
          (e) => !["saving", "investment"].includes(e.kind),
        ),
      },
      "daily",
      "2026-10",
    ),
    123500,
  );
});
test("Reservar no amortiza deuda", () => {
  const d = demo();
  assert.equal(debtState(d, "loan").paid, 120000);
  assert.equal(debtState(d, "loan").pending, 180000);
  assert.equal(debtState(d, "loan").reserved, 20000);
});
test("Devolución interna conserva patrimonio y reduce deuda exactamente", () => {
  const d = demo(),
    before = totals(d);
  d.entries.push({
    id: "r",
    kind: "repayment",
    concept: "Reposición",
    amount: 5000,
    date: "2026-10-05",
    status: "done",
    category: "Otros",
    from: "daily",
    to: "savings",
    debt: "trip",
    reserved: 0,
  });
  const after = totals(d);
  assert.equal(after.net, before.net);
  assert.equal(after.savings, before.savings + 5000);
  assert.equal(after.available, before.available - 5000);
  assert.equal(after.internal, before.internal - 5000);
});
test("Realizar un movimiento previsto no duplica la previsión", () => {
  const d = demo(),
    p = projected(d, "daily", "2026-10");
  d.entries[0].status = "done";
  assert.equal(projected(d, "daily", "2026-10"), p);
  assert.equal(balance(d, "daily"), 144000);
});
test("Editar y eliminar pagos recalcula sin tocar meses anteriores", () => {
  const d = demo(),
    e = d.entries.find((e) => e.kind === "debt")!;
  e.status = "done";
  e.amount = 5000;
  assert.equal(debtState(d, "loan").pending, 175000);
  assert.equal(balance(d, "daily", "2026-10-01"), 150000);
  e.amount = 6000;
  assert.equal(debtState(d, "loan").pending, 174000);
  d.entries = d.entries.filter((x) => x.id !== e.id);
  assert.equal(debtState(d, "loan").pending, 180000);
});
test("Intereses incrementan ahorro y patrimonio una sola vez", () => {
  const d = demo(),
    before = totals(d);
  d.entries.push({
    id: "i",
    kind: "interest",
    concept: "Intereses",
    amount: 2856,
    date: "2026-10-31",
    status: "done",
    category: "Otros",
    from: "",
    to: "savings",
    debt: "",
    reserved: 0,
  });
  assert.equal(totals(d).net, before.net + 2856);
  assert.equal(totals(d).savings, before.savings + 2856);
});
test("Valida copias y rechaza pagos excesivos y referencias inválidas", () => {
  const d = demo();
  assert.doesNotThrow(() => validateData(d));
  assert.doesNotThrow(() => validateData(empty()));
  const e = { ...d.entries.find((e) => e.kind === "debt")!, amount: 9999999 };
  assert.throws(() => validateEntry(d, e));
  assert.throws(() => validateData({ ...d, accounts: [] }));
  assert.throws(() =>
    validateData({ ...d, entries: [{ ...d.entries[0], date: "2026-02-31" }] }),
  );
});
