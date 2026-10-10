import test from "node:test";
import assert from "node:assert/strict";
import {
  installmentDueDate,
  installmentStatus,
  debtPaymentWatch,
  blankProfile,
  validateProfile,
  type ExternalDebt,
} from "../../src/domain/index.ts";

const debt: ExternalDebt = {
  id: "test",
  name: "Prueba",
  dueDay: 31,
  total: 50000,
  installments: [
    { month: "2026-09", amount: 10000, status: "pending" },
    { month: "2026-10", amount: 10000, status: "reserved" },
    { month: "2026-11", amount: 10000, status: "paid" },
    { month: "2026-12", amount: 10000, status: "pending" },
  ],
};
test("El día de cobro se ajusta al último día, incluidos años bisiestos", () => {
  assert.equal(installmentDueDate("2027-02", 31), "2027-02-28");
  assert.equal(installmentDueDate("2028-02", 31), "2028-02-29");
  assert.equal(installmentDueDate("2026-04", 31), "2026-04-30");
  assert.equal(installmentDueDate("2026-01", 31), "2026-01-31");
  assert.equal(installmentDueDate("2026-02", 4), "2026-02-04");
  for (const day of [0, 32, 1.5, NaN])
    assert.throws(() => installmentDueDate("2026-02", day));
});
test("Los avisos distinguen pagado, adelantado, apartado, hoy y retraso", () => {
  assert.equal(
    installmentStatus(debt, debt.installments[0], "2026-10-10").key,
    "overdue",
  );
  assert.equal(
    installmentStatus(debt, debt.installments[1], "2026-10-10").key,
    "reserved",
  );
  assert.equal(
    installmentStatus(debt, debt.installments[1], "2026-11-01").key,
    "overdue",
  );
  assert.equal(
    installmentStatus(debt, debt.installments[2], "2026-10-10").key,
    "early",
  );
  assert.equal(
    installmentStatus(debt, debt.installments[2], "2026-12-01").key,
    "paid",
  );
  assert.equal(
    installmentStatus(debt, debt.installments[3], "2026-12-31").key,
    "today",
  );
  assert.equal(
    installmentStatus(debt, debt.installments[3], "2026-12-30").key,
    "upcoming",
  );
  assert.equal(
    installmentStatus(
      { ...debt, dueDay: undefined },
      debt.installments[0],
      "2026-10-10",
    ).key,
    "unknown",
  );
});
test("El seguimiento incluye este mes, el siguiente y el total vencido sin modificar datos", () => {
  const before = structuredClone(debt);
  const watch = debtPaymentWatch(debt, "2026-10-10");
  assert.deepEqual(
    watch.rows.map((row) => row.month),
    ["2026-10", "2026-11"],
  );
  assert.equal(watch.overdueAmount, 10000);
  assert.equal(watch.overdue.length, 1);
  assert.deepEqual(debt, before);
});
test("Solo se guardan días de cobro enteros del 1 al 31", () => {
  const profile = blankProfile();
  profile.debts = [debt];
  assert.doesNotThrow(() => validateProfile(profile));
  for (const dueDay of [0, 32, 1.5])
    assert.throws(() =>
      validateProfile({ ...profile, debts: [{ ...debt, dueDay }] }),
    );
});
