import type { ExternalDebt } from "./types.ts";
import { externalDebtTotals } from "./totals.ts";
import { sum } from "../shared/utils/money.ts";

export function debtAnalytics(debt: ExternalDebt) {
  const totals = externalDebtTotals(debt);
  const calendar = [...debt.installments].sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  const outstanding = calendar.filter((row) => row.status !== "paid");
  return {
    totals,
    calendar,
    paidPercent: totals.total ? (100 * totals.paid) / totals.total : 0,
    preparedPercent: totals.total
      ? (100 * (totals.paid + totals.reserved)) / totals.total
      : 0,
    outstandingCount: outstanding.length,
    installmentCount: calendar.length,
    next: outstanding[0],
    last: outstanding.at(-1),
    unassigned:
      totals.total -
      sum([
        ...calendar.map((row) => row.amount),
        ...(debt.advances ?? []).map((row) => row.amount),
      ]),
  };
}
