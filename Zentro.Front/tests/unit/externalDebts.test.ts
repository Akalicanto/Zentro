import { test } from "node:test";
import assert from "node:assert/strict";
import { testProfile } from "../fixtures/profile.ts";
import {
  planDebtInstallments,
  completeDebt,
  reopenDebt,
  archiveDebt,
  restoreDebt,
  debtStatus,
  externalDebtTotals,
  monthlyPlanning,
  validateProfile,
  type ExternalDebt,
} from "../../src/domain/index.ts";
test("Planificar conserva cuotas y reparte céntimos sin superar el total", () => {
  const debt: ExternalDebt = {
    id: "loan",
    name: "Prueba",
    total: 10001,
    installments: [{ month: "2026-10", amount: 2000, status: "paid" }],
  };
  const planned = planDebtInstallments(debt, "2026-11", 3);
  assert.deepEqual(
    planned.installments.map((r) => r.amount),
    [2000, 2667, 2667, 2667],
  );
  assert.equal(
    planned.installments.reduce((n, r) => n + r.amount, 0),
    10001,
  );
  assert.throws(() => planDebtInstallments(debt, "2026-10", 2), /coincide/);
  assert.throws(() => planDebtInstallments(debt, "2026-11", 121));
  assert.equal(debt.installments.length, 1);
});
test("Completar, eliminar y recuperar conservan cuotas e historial sin tocar otros saldos", () => {
  const profile = testProfile();
  const original = structuredClone(profile);
  const debt: ExternalDebt = {
    id: "loan",
    name: "Prueba",
    total: 10001,
    installments: [
      { month: "2026-10", amount: 2000, status: "paid" },
      { month: "2026-11", amount: 2000, status: "reserved" },
    ],
  };
  const closed = completeDebt(debt);
  assert.equal(externalDebtTotals(closed).remaining, 0);
  assert.equal(debtStatus(closed), "completed");
  const reopened = reopenDebt(closed);
  assert.equal(debtStatus(reopened), "active");
  assert.equal(reopened.activity?.length, 2);
  const archived = archiveDebt(debt);
  assert.equal(debtStatus(archived), "archived");
  assert.deepEqual(archived.installments, debt.installments);
  assert.equal(debtStatus(restoreDebt(archived)), "active");
  validateProfile({ ...profile, debts: [closed] });
  assert.throws(() =>
    validateProfile({
      ...profile,
      debts: [{ ...debt, completedOn: "2026-10-10" }],
    }),
  );
  assert.deepEqual(profile, original);
});
test("Una deuda eliminada deja de participar en el calendario financiero", () => {
  const profile = testProfile();
  const debt: ExternalDebt = {
    id: "loan",
    name: "Prueba",
    total: 10000,
    installments: [
      { month: profile.plan.start, amount: 10000, status: "pending" },
    ],
  };
  const withDebt = monthlyPlanning(
    { ...profile, debts: [debt] },
    profile.plan.start,
    6,
  );
  const archived = monthlyPlanning(
    { ...profile, debts: [archiveDebt(debt)] },
    profile.plan.start,
    6,
  );
  assert.equal(withDebt[0].debts, 10000);
  assert.equal(archived[0].debts, 0);
});
