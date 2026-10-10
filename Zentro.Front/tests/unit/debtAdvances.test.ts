import assert from "node:assert/strict";
import test from "node:test";
import {
  simulateDebtAdvance,
  applyDebtAdvance,
  externalDebtTotals,
  debtAnalytics,
  completeDebt,
  validateProfile,
  type ExternalDebt,
} from "../../src/domain/index.ts";
import { testProfile } from "../fixtures/profile.ts";

const loan = (): ExternalDebt => ({
  id: "advance-test",
  name: "Prueba",
  total: 10001,
  installments: [
    { month: "2026-09", amount: 2000, status: "paid" },
    { month: "2026-10", amount: 2000, status: "reserved" },
    { month: "2026-11", amount: 2000, status: "pending" },
    { month: "2026-12", amount: 2000, status: "pending" },
    { month: "2027-01", amount: 2001, status: "pending" },
  ],
});
test("Simular no cambia la deuda: menos cuotas conserva pagos y primeras cuotas", () => {
  const debt = loan(),
    original = structuredClone(debt);
  const result = simulateDebtAdvance(debt, 3000, "term");
  assert.equal(result.balance, 5001);
  assert.equal(result.count, 3);
  assert.equal(result.removed, 1);
  assert.equal(result.lastAmount, 1001);
  assert.equal(result.lastMonth, "2026-12");
  assert.deepEqual(result.installments[0], debt.installments[0]);
  assert.equal(result.installments[1].status, "reserved");
  assert.deepEqual(debt, original);
});
test("Reducir importes reparte céntimos sin cambiar meses y guarda adelantos aparte", () => {
  const debt = loan();
  const result = simulateDebtAdvance(debt, 3000, "payment");
  assert.deepEqual(
    result.installments.slice(1).map((r) => r.amount),
    [1251, 1250, 1250, 1250],
  );
  const saved = applyDebtAdvance(debt, 3000, "payment");
  assert.equal(saved.total, 10001);
  assert.equal(saved.advances?.length, 1);
  assert.equal(externalDebtTotals(saved).paid, 5000);
  assert.equal(externalDebtTotals(saved).remaining, 5001);
  assert.equal(debtAnalytics(saved).unassigned, 0);
  validateProfile({ ...testProfile(), debts: [saved] });
  const again = applyDebtAdvance(saved, 1000, "term");
  assert.equal(externalDebtTotals(again).remaining, 4001);
  assert.equal(again.advances?.length, 2);
});
test("Adelantar todo permite completar sin registrar el mismo pago dos veces", () => {
  const debt = loan();
  const saved = applyDebtAdvance(debt, 8001, "term");
  assert.equal(saved.installments.length, 1);
  assert.equal(externalDebtTotals(saved).remaining, 0);
  const closed = completeDebt(saved);
  assert.equal(externalDebtTotals(closed).paid, 10001);
  assert.equal(closed.advances?.length, 1);
  validateProfile({ ...testProfile(), debts: [closed] });
});
test("Se rechazan adelantos inválidos, calendario incompleto y cuotas menores de un céntimo", () => {
  const debt = loan();
  for (const amount of [0, -1, 8002, NaN, 1.5])
    assert.throws(() => simulateDebtAdvance(debt, amount, "term"));
  assert.throws(() =>
    simulateDebtAdvance({ ...debt, completedOn: "2026-10-10" }, 1, "term"),
  );
  assert.throws(
    () =>
      simulateDebtAdvance(
        { ...debt, installments: debt.installments.slice(0, 2) },
        100,
        "term",
      ),
    /Planifica/,
  );
  assert.throws(() => simulateDebtAdvance(debt, 8000, "payment"), /céntimo/);
  const saved = applyDebtAdvance(debt, 3000, "term");
  for (const advances of [
    [{ ...saved.advances![0], amount: 9000 }],
    [{ ...saved.advances![0], date: "2026-02-30" }],
    [saved.advances![0], saved.advances![0]],
  ])
    assert.throws(() =>
      validateProfile({ ...testProfile(), debts: [{ ...saved, advances }] }),
    );
});
