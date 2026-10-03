import { blankProfile, type Profile } from "../../src/domain/index.ts";
export function testProfile(): Profile {
  const p = blankProfile();
  p.daily = {
    opening: 30000,
    asOf: "2026-10-01",
    expenses: [
      {
        id: "expense",
        month: "2026-10",
        concept: "Gasto de prueba",
        amount: 4000,
        status: "planned",
        includedInOpening: false,
      },
    ],
    incomes: [],
  };
  p.plan = {
    start: "2026-10",
    horizon: "2027-03",
    saving: 12000,
    investment: 9000,
    repayment: 3000,
    savingsTarget: 100000,
  };
  p.savings = [
    {
      month: "2026-09",
      goal: 12000,
      actual: 50000,
      repayment: 0,
      withdrawal: 0,
      approximation: null,
    },
  ];
  p.investment = [
    {
      month: "2026-09",
      goal: 9000,
      actual: 20000,
      repayment: 0,
      withdrawal: 0,
      approximation: null,
    },
  ];
  p.interest = { opening: 1400, asOf: "2026-10-01", entries: [] };
  p.internalDebt = {
    items: [
      {
        id: "item",
        date: "2026-10-01",
        concept: "Retirada histórica de prueba",
        amount: 8000,
        source: "work",
        historical: true,
      },
    ],
    payments: [
      {
        id: "paid",
        date: "2026-10-01",
        amount: 2000,
        historical: true,
        allocations: [{ item: "item", amount: 2000 }],
      },
    ],
    schedule: [],
  };
  return p;
}
