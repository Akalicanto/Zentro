import test from "node:test";
import assert from "node:assert/strict";
import {
  validateProfile,
  cashTotals,
  wealthTotals,
  monthlyPlanning,
  externalDebtTotals,
  type ExternalDebt,
} from "../../src/domain/index.ts";
import { applyProfileForm } from "../../src/features/profile/forms/applyProfileForm.ts";
import { testProfile } from "../fixtures/profile.ts";

test("Tipo de deuda e información hipotecaria se conservan sin cambiar cálculos", () => {
  const debt: ExternalDebt = {
    id: "test",
    name: "Deuda de prueba",
    total: 120000,
    installments: [{ month: "2026-11", amount: 10000, status: "pending" }],
  };
  const original = { ...testProfile(), debts: [debt] };
  const form = new FormData();
  form.set("amount", "90000");
  form.set("mortgageBank", "  Banco de prueba  ");
  form.set("mortgageYears", "30");
  const next = applyProfileForm(
    original,
    { type: "mortgageBalance" },
    form,
    "2026-11",
  );
  next.debts![0].kind = "fictional";
  validateProfile(next);
  assert.equal(next.mortgageOffer, 9000000);
  assert.equal(next.mortgageBank, "Banco de prueba");
  assert.equal(next.mortgageYears, 30);
  assert.deepEqual(cashTotals(next), cashTotals(original));
  assert.deepEqual(wealthTotals(next), wealthTotals(original));
  assert.deepEqual(
    monthlyPlanning(next, "2026-11", 6),
    monthlyPlanning(original, "2026-11", 6),
  );
  assert.deepEqual(
    externalDebtTotals(next.debts![0]),
    externalDebtTotals(debt),
  );
  form.set("mortgageBank", "");
  form.set("mortgageYears", "");
  const cleared = applyProfileForm(
    next,
    { type: "mortgageBalance" },
    form,
    "2026-11",
  );
  assert.equal(cleared.mortgageBank, undefined);
  assert.equal(cleared.mortgageYears, undefined);
  validateProfile(original);
  for (const kind of ["real", "fictional"] as const)
    validateProfile({ ...original, debts: [{ ...debt, kind }] });
  assert.throws(() =>
    validateProfile({ ...original, debts: [{ ...debt, kind: "other" }] }),
  );
  for (const mortgageYears of [0, -1, 1.5, 61, null, "30"])
    assert.throws(() => validateProfile({ ...original, mortgageYears }));
  for (const mortgageBank of [null, 42, " ", "x".repeat(101)])
    assert.throws(() => validateProfile({ ...original, mortgageBank }));
});
