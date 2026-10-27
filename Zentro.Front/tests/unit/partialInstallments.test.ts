import test from "node:test";
import assert from "node:assert/strict";
import {
  installmentAmounts,
  editInstallmentAmount,
  withInstallmentAmounts,
  externalDebtTotals,
  debtAnalytics,
  debtPaymentWatch,
  installmentStatus,
  monthlyPlanning,
  applyDebtAdvance,
  completeDebt,
  currentMonth,
  validateProfile,
  type ExternalDebt,
} from "../../src/domain/index.ts";
import { testProfile } from "../fixtures/profile.ts";

const debt = (): ExternalDebt => ({
  id: "partial",
  name: "Cuota parcial",
  dueDay: 4,
  total: 10540,
  installments: [
    withInstallmentAmounts(
      { month: "2027-01", amount: 10540, status: "pending" },
      10540,
      0,
      9000,
    ),
  ],
});
test("Una cuota conserva 105,40 € con 90 € apartados y 15,40 € por preparar", () => {
  const d = debt();
  assert.deepEqual(installmentAmounts(d.installments[0]), {
    paid: 0,
    reserved: 9000,
    pending: 1540,
    remaining: 10540,
  });
  assert.deepEqual(externalDebtTotals(d), {
    total: 10540,
    paid: 0,
    reserved: 9000,
    pending: 1540,
    remaining: 10540,
  });
  assert.equal(debtAnalytics(d).unassigned, 0);
  assert.equal(
    installmentStatus(d, d.installments[0], "2026-12-20").label,
    "Parcialmente apartada",
  );
  assert.equal(debtPaymentWatch(d, "2027-01-05").overdueAmount, 10540);
  const profile = { ...testProfile(), debts: [d] };
  validateProfile(profile);
  const planning = monthlyPlanning(
    {
      ...profile,
      plan: { ...profile.plan, start: "2027-01", horizon: "2027-01" },
    },
    "2027-01",
    1,
  );
  assert.equal(planning[0].debts, 1540);
  assert.equal(planning[0].reserved, 9000);
});
test("Pagar consume lo apartado y no cambia el total ni duplica el dinero preparado", () => {
  const row = editInstallmentAmount(debt().installments[0], "paid", 1000);
  assert.deepEqual(installmentAmounts(row), {
    paid: 1000,
    reserved: 8000,
    pending: 1540,
    remaining: 9540,
  });
  const all = editInstallmentAmount(row, "paid", 10540);
  assert.deepEqual(installmentAmounts(all), {
    paid: 10540,
    reserved: 0,
    pending: 0,
    remaining: 0,
  });
  assert.equal(all.status, "paid");
  assert.throws(() => editInstallmentAmount(row, "reserved", 10000));
  assert.throws(() => editInstallmentAmount(row, "amount", 500));
});
test("Adelantos y cierre conservan los pagos parciales ya realizados", () => {
  const d = debt();
  d.installments[0] = editInstallmentAmount(d.installments[0], "paid", 1000);
  for (const strategy of ["term", "payment"] as const) {
    const next = applyDebtAdvance(d, 2000, strategy);
    assert.equal(externalDebtTotals(next).paid, 3000);
    assert.equal(externalDebtTotals(next).remaining, 7540);
    assert.equal(debtAnalytics(next).unassigned, 0);
    validateProfile({ ...testProfile(), debts: [next] });
    const closed = completeDebt(applyDebtAdvance(d, 9540, strategy));
    assert.equal(externalDebtTotals(closed).paid, 10540);
    validateProfile({ ...testProfile(), debts: [closed] });
  }
});
test("Se rechazan repartos parciales negativos, sobreasignados o con estados contradictorios", () => {
  for (const values of [
    { paidAmount: -1 },
    { reservedAmount: 11000 },
    { paidAmount: 2000, reservedAmount: 9000 },
    { status: "paid" },
  ]) {
    const d = debt();
    Object.assign(d.installments[0], values);
    assert.throws(() => validateProfile({ ...testProfile(), debts: [d] }));
  }
});

test("Cerrar una deuda con importe sin calendario actualiza también la parte pagada explícita del mes actual", () => {
  const d = debt();
  d.total += 1000;
  d.installments[0].month = currentMonth();
  const closed = completeDebt(d);
  assert.equal(closed.installments[0].amount, 11540);
  assert.equal(installmentAmounts(closed.installments[0]).paid, 11540);
  assert.equal(externalDebtTotals(closed).remaining, 0);
  validateProfile({ ...testProfile(), debts: [closed] });
});
