import type { Profile } from "./types.ts";
import { monthSeries } from "./contributions.ts";
import { addMonth } from "../shared/utils/dates.ts";
import { sum } from "../shared/utils/money.ts";

// Solo importes aún por preparar: lo aportado y lo apartado no se repiten.
export function monthlyPlanning(
  profile: Profile,
  start: string,
  count: number,
) {
  const savings = monthSeries(profile, "savings");
  const investments = monthSeries(profile, "investment");
  return Array.from({ length: count }, (_, index) => {
    const month = addMonth(start, index);
    const saving = savings.find((row) => row.month === month);
    const investment = investments.find((row) => row.month === month);
    const base = saving?.actual == null ? (saving?.plannedBase ?? 0) : 0;
    const invested =
      investment?.actual == null ? (investment?.plannedBase ?? 0) : 0;
    const repayment = saving?.plannedRepayment ?? 0;
    const installments = (profile.debts ?? [])
      .filter((debt) => !debt.archivedOn && !debt.completedOn)
      .flatMap((debt) => debt.installments)
      .filter((row) => row.month === month);
    const debts = sum(
      installments
        .filter((row) => row.status === "pending")
        .map((row) => row.amount),
    );
    const reserved = sum(
      installments
        .filter((row) => row.status === "reserved")
        .map((row) => row.amount),
    );
    return {
      month,
      saving: base,
      investment: invested,
      repayment,
      debts,
      reserved,
      total: base + invested + repayment + debts,
      inPlan: month >= profile.plan.start && month <= profile.plan.horizon,
    };
  });
}
