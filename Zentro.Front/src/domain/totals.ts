import type { CashRow, ExternalDebt, Profile } from "./types.ts";
import { sum } from "../shared/utils/money.ts";

export function cashTotals(profile: Profile) {
  const realizedChange = (rows: CashRow[]) =>
    sum(
      rows
        .filter((r) => r.status === "done" && !r.includedInOpening)
        .map((r) => r.amount),
    );
  const current = sum([
    profile.daily.opening,
    realizedChange(profile.daily.incomes),
    -realizedChange(profile.daily.expenses),
  ]);
  const pendingTotal = (rows: CashRow[]) =>
    sum(
      rows.filter((row) => row.status === "planned").map((row) => row.amount),
    );
  const expenses = pendingTotal(profile.daily.expenses);
  const incomes = pendingTotal(profile.daily.incomes);
  return {
    current,
    forecast: sum([current, -expenses, incomes]),
    expenses,
    incomes,
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
    profile.savings.flatMap((r) => [r.actual ?? 0, r.repayment, -r.withdrawal]),
  );
  const interest = sum([
    profile.interest.opening,
    ...profile.interest.entries.map((r) => r.amount),
  ]);
  const invested = sum(profile.investment.map((r) => r.actual ?? 0));
  return {
    work,
    interest,
    savings: sum([work, interest]),
    invested,
    net: sum([work, interest, invested]),
  };
}
