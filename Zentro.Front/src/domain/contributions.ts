import type { MonthRow, Profile } from "./types.ts";
import { debtTotals } from "./totals.ts";
import { sum } from "../shared/utils/money.ts";
import { addMonth } from "../shared/utils/dates.ts";

export function monthSeries(profile: Profile, kind: "savings" | "investment") {
  const existing = profile[kind];
  const months = new Set(existing.map((r) => r.month));
  // El plan añade meses aún no registrados sin inventar aportaciones realizadas.
  for (
    let month = profile.plan.start, count = 0;
    month <= profile.plan.horizon && count < 600;
    month = addMonth(month, 1), count++
  ) {
    months.add(month);
    if (month === profile.plan.horizon) break;
  }
  let actual = 0,
    ideal = 0,
    forecast = 0,
    pending = debtTotals(profile).pending;
  return [...months].sort().map((month) => {
    const stored = existing.find((r) => r.month === month);
    const inPlan = month >= profile.plan.start && month <= profile.plan.horizon;
    const goal =
      stored?.goal ??
      (inPlan
        ? kind === "savings"
          ? profile.plan.saving
          : profile.plan.investment
        : null);
    const row: MonthRow = stored || {
      month,
      goal,
      actual: null,
      repayment: 0,
      withdrawal: 0,
      approximation: null,
    };
    const recorded = row.actual !== null;
    const base = recorded ? row.actual! : inPlan ? (goal ?? 0) : 0;
    const alreadyPaid = sum(
      profile.internalDebt.payments
        .filter((r) => !r.historical && r.date.startsWith(month))
        .map((r) => r.amount),
    );
    const scheduled =
      profile.internalDebt.schedule.find((r) => r.month === month)?.amount ??
      profile.plan.repayment;
    const repayment =
      kind === "savings" && inPlan
        ? Math.min(pending, Math.max(0, scheduled - alreadyPaid))
        : 0;
    pending -= repayment;
    const real =
      (row.actual ?? 0) +
      (kind === "savings" ? row.repayment - row.withdrawal : 0);
    actual += real;
    ideal += goal ?? 0;
    forecast +=
      base +
      (kind === "savings" ? row.repayment + repayment - row.withdrawal : 0);
    const hasPending = inPlan && (!recorded || repayment > 0);
    return {
      ...row,
      goal,
      accumulatedGoal: goal === null ? null : ideal,
      real: recorded || row.repayment || row.withdrawal ? real : null,
      planned: hasPending
        ? base + row.repayment + repayment - row.withdrawal
        : null,
      plannedBase: inPlan ? base : null,
      plannedRepayment: repayment,
      accumulated: recorded || row.repayment || row.withdrawal ? actual : null,
      projected: hasPending ? forecast : null,
    };
  });
}
export function setMonthlyActual(
  profile: Profile,
  kind: "savings" | "investment",
  month: string,
  actual: number | null,
  goal: number | null,
): Profile {
  const old = profile[kind].find((r) => r.month === month);
  return {
    ...profile,
    [kind]: [
      ...profile[kind].filter((r) => r.month !== month),
      {
        month,
        actual,
        goal,
        repayment: old?.repayment || 0,
        withdrawal: old?.withdrawal || 0,
        approximation: old?.approximation ?? null,
      },
    ].sort((a, b) => a.month.localeCompare(b.month)),
  };
}
