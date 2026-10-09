import { test } from "node:test";
import assert from "node:assert/strict";
import { monthlyPlanning } from "../../src/domain/index.ts";
import { testProfile } from "../fixtures/profile.ts";

test("El calendario excluye aportaciones cerradas y cuotas pagadas o apartadas", () => {
  const profile = testProfile();
  profile.savings.push({
    month: "2026-10",
    goal: 12000,
    actual: 0,
    repayment: 0,
    withdrawal: 0,
    approximation: null,
  });
  profile.investment.push({
    month: "2026-10",
    goal: 9000,
    actual: 5000,
    repayment: 0,
    withdrawal: 0,
    approximation: null,
  });
  profile.debts = [
    {
      id: "debt",
      name: "Prueba",
      total: 6000,
      installments: [
        { month: "2026-10", amount: 1000, status: "paid" },
        { month: "2026-10", amount: 2000, status: "reserved" },
        { month: "2026-10", amount: 3000, status: "pending" },
      ],
    },
  ];
  const snapshot = structuredClone(profile);
  const [row] = monthlyPlanning(profile, "2026-10", 1);
  assert.equal(row.saving, 0);
  assert.equal(row.investment, 0);
  assert.equal(row.reserved, 2000);
  assert.equal(row.debts, 3000);
  assert.equal(row.repayment, 3000);
  assert.equal(row.total, 6000);
  assert.deepEqual(profile, snapshot);
});

test("Respeta objetivos mensuales, limita reposiciones y no extiende el plan", () => {
  const profile = testProfile();
  profile.savings.push({
    month: "2026-11",
    goal: 7000,
    actual: null,
    repayment: 0,
    withdrawal: 0,
    approximation: null,
  });
  const rows = monthlyPlanning(profile, "2026-10", 7);
  assert.equal(rows[0].total, 24000);
  assert.equal(rows[1].saving, 7000);
  assert.equal(rows[1].repayment, 3000);
  assert.equal(rows[2].repayment, 0);
  assert.equal(rows[6].inPlan, false);
  assert.equal(rows[6].total, 0);
  profile.debts = [
    {
      id: "later",
      name: "Prueba",
      total: 5000,
      installments: [{ month: "2027-04", amount: 5000, status: "pending" }],
    },
  ];
  assert.equal(monthlyPlanning(profile, "2027-04", 1)[0].total, 5000);
});
