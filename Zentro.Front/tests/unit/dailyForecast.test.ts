import { test } from "node:test";
import assert from "node:assert/strict";
import { cashTotals, validateProfile } from "../../src/domain/index.ts";
import { testProfile } from "../fixtures/profile.ts";

test("Las previsiones no requieren mes y las copias antiguas lo descartan sin cambiar importes", () => {
  const profile = testProfile();
  const legacy = structuredClone(profile);
  Object.assign(legacy.daily.expenses[0], { month: "2024-08" });
  legacy.daily.incomes = [
    {
      id: "income",
      concept: "Ingreso",
      amount: 5000,
      status: "planned",
      includedInOpening: false,
    },
  ];
  const normalized = validateProfile(legacy);
  assert.equal("month" in normalized.daily.expenses[0], false);
  assert.equal("month" in normalized.daily.incomes[0], false);
  assert.equal(cashTotals(normalized).forecast, 31000);
  assert.equal(normalized.daily.expenses[0].amount, 4000);
});
