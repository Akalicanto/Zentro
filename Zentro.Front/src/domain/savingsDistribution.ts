import type { SavingsPlacement, Profile } from "./types.ts";
import { wealthTotals } from "./totals.ts";
import { sum } from "../shared/utils/money.ts";
import { addMonth, currentMonth } from "../shared/utils/dates.ts";

export function placementReturn(
  placement: SavingsPlacement,
  amount: number,
  months: number,
  fromMonth = currentMonth(),
) {
  const rate = placement.annualRateBps / 10000;
  const days =
    placement.dayCount === "actual360"
      ? sum(
          Array.from({ length: months }, (_, i) => {
            const [year, month] = addMonth(fromMonth, i).split("-").map(Number);
            return new Date(Date.UTC(year, month, 0)).getUTCDate();
          }),
        )
      : 0;
  const gross = Math.round(
    amount *
      (placement.dayCount === "actual360"
        ? (rate * days) / 360
        : placement.rateType === "tae"
          ? Math.pow(1 + rate, months / 12) - 1
          : (rate * months) / 12),
  );
  const withheld = Math.round((gross * placement.withholdingBps) / 10000);
  return { gross, withheld, net: gross - withheld };
}
export function placementMaturity(placement: SavingsPlacement) {
  if (!placement.start || !placement.months) return null;
  const [year, month, day] = placement.start.split("-").map(Number);
  const last = new Date(Date.UTC(year, month - 1 + placement.months + 1, 0));
  return new Date(
    Date.UTC(
      last.getUTCFullYear(),
      last.getUTCMonth(),
      Math.min(day, last.getUTCDate()),
    ),
  )
    .toISOString()
    .slice(0, 10);
}
export function savingsDistribution(profile: Profile) {
  const total = wealthTotals(profile).savings;
  const fixed = sum(
    (profile.savingsPlacements ?? []).map((r) => r.amount ?? 0),
  );
  const rows = (profile.savingsPlacements ?? []).map((row) => {
    const amount = row.amount ?? Math.max(0, total - fixed);
    return {
      ...row,
      balance: amount,
      maturity: placementMaturity(row),
      yield: placementReturn(
        row,
        amount,
        row.kind === "deposit" ? row.months! : 1,
      ),
    };
  });
  const assigned = sum(rows.map((r) => r.balance));
  return {
    total,
    rows,
    assigned,
    unassigned: Math.max(0, total - assigned),
    excess: Math.max(0, assigned - total),
    depositNet: sum(
      rows.filter((r) => r.kind === "deposit").map((r) => r.yield.net),
    ),
    monthlyNet: sum(
      rows.filter((r) => r.kind === "remunerated").map((r) => r.yield.net),
    ),
  };
}
