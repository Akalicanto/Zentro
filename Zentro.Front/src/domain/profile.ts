import type { Profile } from "./types.ts";
import { addMonth, today, currentMonth } from "../shared/utils/dates.ts";

export function blankProfile(): Profile {
  return {
    version: 2,
    cash: 0,
    mortgageOffer: 0,
    debts: [],
    savingsPlacements: [],
    possibleExpenses: [],
    daily: { opening: 0, asOf: today(), expenses: [], incomes: [] },
    savings: [],
    investment: [],
    interest: { opening: 0, asOf: today(), entries: [] },
    internalDebt: { items: [], payments: [], schedule: [] },
    plan: {
      start: currentMonth(),
      saving: 0,
      investment: 0,
      repayment: 0,
      horizon: addMonth(currentMonth(), 12),
      savingsTarget: null,
    },
    commitments: [],
  };
}
