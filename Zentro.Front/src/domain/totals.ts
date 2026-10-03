import type { CashRow, ExternalDebt, Profile } from "./types.ts";
import { sum } from "../shared/utils/money.ts";

export function cashTotals(profile: Profile) {
  const change = (rows: CashRow[], status: string) =>
    sum(
      rows
        .filter((r) => r.status === status && !r.includedInOpening)
        .map((r) => r.amount),
    );
  const current =
    profile.daily.opening +
    change(profile.daily.incomes, "done") -
    change(profile.daily.expenses, "done");
  return {
    current,
    forecast:
      current +
      change(profile.daily.incomes, "planned") -
      change(profile.daily.expenses, "planned"),
    expenses: sum(
      profile.daily.expenses
        .filter((r) => r.status === "planned")
        .map((r) => r.amount),
    ),
    incomes: sum(
      profile.daily.incomes
        .filter((r) => r.status === "planned")
        .map((r) => r.amount),
    ),
  };
}
export function debtTotals(profile: Profile) {
  const original = sum(profile.internalDebt.items.map((r) => r.amount));
  const paid = sum(profile.internalDebt.payments.map((r) => r.amount));
  return { original, paid, pending: original - paid };
}
export function externalDebtTotals(debt: ExternalDebt) {
  const paid = sum(
    debt.installments.filter((r) => r.status === "paid").map((r) => r.amount),
  );
  const reserved = sum(
    debt.installments
      .filter((r) => r.status === "reserved")
      .map((r) => r.amount),
  );
  return {
    total: debt.total,
    paid,
    reserved,
    remaining: debt.total - paid,
    pending: debt.total - paid - reserved,
  };
}
export function debtItemPaid(profile: Profile, id: string) {
  return sum(
    profile.internalDebt.payments.flatMap((r) =>
      r.allocations.filter((a) => a.item === id).map((a) => a.amount),
    ),
  );
}
export function wealthTotals(profile: Profile) {
  const work = sum(
    profile.savings.map((r) => (r.actual ?? 0) + r.repayment - r.withdrawal),
  );
  const interest =
    profile.interest.opening +
    sum(profile.interest.entries.map((r) => r.amount));
  const invested = sum(profile.investment.map((r) => r.actual ?? 0));
  return {
    work,
    interest,
    savings: work + interest,
    invested,
    net: work + interest + invested,
  };
}
