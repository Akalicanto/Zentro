import { test } from "node:test";
import assert from "node:assert/strict";
import { testProfile } from "../tests/profile";
import {
  wealthTotals,
  cashTotals,
  monthSeries,
  debtTotals,
  repayDebt,
  withdrawSavings,
  cancelWithdrawal,
  editDebtItem,
  deleteDebtItem,
  setMonthlyActual,
  validateProfile,
  cents,
  today,
  currentMonth,
} from "./model";
test("Efectivo y posibles gastos se validan sin alterar saldos ni patrimonio", () => {
  const p = testProfile();
  const next = {
    ...p,
    cash: 4500,
    possibleExpenses: [
      { id: "possible", concept: "Gasto previsto de prueba", amount: 9000 },
    ],
  };
  validateProfile(next);
  assert.deepEqual(cashTotals(next), cashTotals(p));
  assert.deepEqual(wealthTotals(next), wealthTotals(p));
  assert.throws(() => validateProfile({ ...next, cash: -1 }));
  assert.throws(() =>
    validateProfile({
      ...next,
      possibleExpenses: [{ id: "possible", concept: "", amount: 9000 }],
    }),
  );
});
test("Editar deuda histórica conserva los pagos y el ahorro contabilizado", () => {
  const p = testProfile();
  const next = editDebtItem(p, "item", "Viaje", 10000, "2026-10-01");
  assert.equal(next.internalDebt.items[0].concept, "Viaje");
  assert.equal(debtTotals(next).pending, 8000);
  assert.deepEqual(wealthTotals(next), wealthTotals(p));
  assert.throws(() => editDebtItem(p, "item", "Viaje", 1000, "2026-10-01"));
  assert.equal(p.internalDebt.items[0].amount, 8000);
});
test("Editar retirada actual ajusta el ahorro y conserva reposiciones parciales", () => {
  let p = testProfile();
  p.plan.start = currentMonth();
  p = withdrawSavings(p, 5000, "Retirada", today(), "work");
  const id = p.internalDebt.items.at(-1)!.id;
  p = repayDebt(p, 8000, today());
  const next = editDebtItem(p, id, "Retirada editada", 7000, today());
  assert.equal(wealthTotals(next).work, wealthTotals(p).work - 2000);
  assert.equal(debtTotals(next).pending, debtTotals(p).pending + 2000);
  assert.throws(() => editDebtItem(p, id, "Retirada", 1000, today()));
  validateProfile(next);
});
test("Borrar deuda elimina solo su parte de pagos compartidos", () => {
  let p = testProfile();
  p.plan.start = currentMonth();
  p = withdrawSavings(p, 5000, "Otra retirada", today(), "work");
  const id = p.internalDebt.items.at(-1)!.id;
  p = repayDebt(p, 8000, today());
  const next = deleteDebtItem(p, "item");
  assert.equal(next.internalDebt.items.length, 1);
  assert.equal(next.internalDebt.payments.length, 1);
  assert.equal(next.internalDebt.payments[0].amount, 2000);
  assert.deepEqual(next.internalDebt.payments[0].allocations, [
    { item: id, amount: 2000 },
  ]);
  assert.equal(wealthTotals(next).work, wealthTotals(p).work - 6000);
  const empty = deleteDebtItem(next, id);
  assert.equal(debtTotals(empty).pending, 0);
  assert.equal(empty.internalDebt.payments.length, 0);
  assert.equal(wealthTotals(empty).work, 50000);
  validateProfile(empty);
});
test("Editar y borrar retirada de intereses mantiene el registro vinculado", () => {
  const p = withdrawSavings(
    testProfile(),
    500,
    "Intereses",
    today(),
    "interest",
  );
  const id = p.internalDebt.items.at(-1)!.id;
  const next = editDebtItem(p, id, "Intereses editados", 800, today());
  assert.equal(wealthTotals(next).interest, 600);
  assert.equal(
    next.interest.entries[0].concept,
    "Retirada: Intereses editados",
  );
  assert.equal(wealthTotals(deleteDebtItem(next, id)).interest, 1400);
});
test("Patrimonio excluye el saldo diario; separa trabajo, intereses e inversión", () => {
  const p = testProfile();
  assert.deepEqual(wealthTotals(p), {
    work: 50000,
    interest: 1400,
    savings: 51400,
    invested: 20000,
    net: 71400,
  });
  p.daily.opening = 999999;
  assert.equal(wealthTotals(p).net, 71400);
  assert.equal(debtTotals(p).pending, 6000);
});
test("El saldo actual y el previsto distinguen pendientes sin doble descuento", () => {
  const p = testProfile();
  assert.equal(cashTotals(p).current, 30000);
  assert.equal(cashTotals(p).forecast, 26000);
  p.daily.expenses[0].status = "done";
  assert.equal(cashTotals(p).current, 26000);
  assert.equal(cashTotals(p).forecast, 26000);
  p.daily.opening = 26000;
  p.daily.expenses[0].includedInOpening = true;
  assert.equal(cashTotals(p).current, 26000);
});
test("El plan añade reposiciones solo hasta saldar la deuda; no ahorra previsiones", () => {
  const p = testProfile();
  const rows = monthSeries(p, "savings");
  assert.deepEqual(
    rows.slice(1, 4).map((r) => r.planned),
    [15000, 15000, 12000],
  );
  assert.equal(wealthTotals(p).work, 50000);
  assert.equal(rows.at(-1)?.projected, 128000);
  assert.equal(monthSeries(p, "investment").at(-1)?.projected, 74000);
});
test("Reponer reduce deuda y aumenta ahorro exactamente una vez", () => {
  let p = testProfile();
  p.plan.start = currentMonth();
  p.plan.horizon = currentMonth();
  p.internalDebt.items[0].date = today();
  p.internalDebt.payments[0].date = today();
  p = repayDebt(p, 3000, today());
  assert.equal(debtTotals(p).pending, 3000);
  assert.equal(wealthTotals(p).work, 53000);
  assert.equal(monthSeries(p, "savings").at(-1)?.planned, 15000);
  assert.equal(monthSeries(p, "savings").at(-1)?.plannedRepayment, 0);
  assert.throws(() => repayDebt(p, 3001, today()));
  validateProfile(p);
});
test("Retirar ahorro aumenta deuda y conserva la aportación aún pendiente", () => {
  const p = testProfile();
  p.plan.start = currentMonth();
  p.plan.horizon = currentMonth();
  const next = withdrawSavings(p, 5000, "Retirada de prueba", today(), "work");
  assert.equal(wealthTotals(next).work, 45000);
  assert.equal(debtTotals(next).pending, 11000);
  assert.equal(monthSeries(next, "savings").at(-1)?.planned, 10000);
  assert.equal(next.savings.at(-1)?.actual, null);
  const interest = withdrawSavings(
    p,
    500,
    "Retirada de interés",
    today(),
    "interest",
  );
  assert.equal(wealthTotals(interest).interest, 900);
  assert.equal(debtTotals(interest).pending, 6500);
  assert.throws(() => withdrawSavings(p, 50001, "Exceso", today(), "work"));
});
test("Realizar la aportación sustituye la previsión y mantiene las reposiciones", () => {
  let p = testProfile();
  p.plan.start = currentMonth();
  p.plan.horizon = currentMonth();
  p = repayDebt(p, 3000, today());
  p = setMonthlyActual(p, "savings", currentMonth(), 12000, 12000);
  assert.equal(wealthTotals(p).work, 65000);
  assert.equal(monthSeries(p, "savings").at(-1)?.planned, null);
  validateProfile(p);
});
test("Una aportación realizada mantiene la reposición pendiente del mismo mes", () => {
  let p = testProfile();
  p.plan.start = currentMonth();
  p.plan.horizon = currentMonth();
  p = setMonthlyActual(p, "savings", currentMonth(), 12000, 12000);
  assert.equal(monthSeries(p, "savings").at(-1)?.plannedRepayment, 3000);
  assert.equal(monthSeries(p, "savings").at(-1)?.projected, 65000);
  const next = withdrawSavings(p, 1000, "Corrección", today(), "work");
  const cancelled = cancelWithdrawal(next, next.internalDebt.items.at(-1)!.id);
  assert.deepEqual(wealthTotals(cancelled), wealthTotals(p));
  assert.deepEqual(debtTotals(cancelled), debtTotals(p));
});
test("Historial conserva negativos y ceros, valida cuotas y referencias", () => {
  let p = testProfile();
  p = setMonthlyActual(p, "savings", "2026-08", -3000, 10000);
  p = setMonthlyActual(p, "savings", "2026-07", 0, 10000);
  validateProfile(p);
  assert.equal(
    monthSeries(p, "savings").find((r) => r.month === "2026-07")?.real,
    0,
  );
  p.savings[0].repayment = 1;
  assert.throws(() => validateProfile(p));
  p.savings[0].repayment = 0;
  p.internalDebt.payments[0].allocations[0].item = "missing";
  assert.throws(() => validateProfile(p));
  assert.equal(cents("123,45"), 12345);
  assert.throws(() => cents("1.234"));
});
