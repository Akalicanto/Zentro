import type { DebtInstallment, ExternalDebt, DebtAdvance } from "./types.ts";
import { externalDebtTotals } from "./totals.ts";
import { sum } from "../shared/utils/money.ts";
import { today } from "../shared/utils/dates.ts";
import { uid } from "../shared/utils/id.ts";

export function simulateDebtAdvance(
  debt: ExternalDebt,
  amount: number,
  strategy: DebtAdvance["strategy"],
) {
  const remaining = externalDebtTotals(debt).remaining;
  if (!["term", "payment"].includes(strategy))
    throw Error("Elige cómo repartir el adelanto.");
  if (
    debt.archivedOn ||
    debt.completedOn ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > remaining
  )
    throw Error(
      "Introduce un adelanto mayor que cero y que no supere lo pendiente.",
    );
  const outstanding = debt.installments
    .filter((r) => r.status !== "paid")
    .sort((a, b) => a.month.localeCompare(b.month));
  if (
    !outstanding.length ||
    sum(outstanding.map((r) => r.amount)) !== remaining
  )
    throw Error(
      "Planifica primero todas las cuotas pendientes para comparar las dos opciones.",
    );
  const balance = remaining - amount;
  if (strategy === "payment" && balance > 0 && balance < outstanding.length)
    throw Error(
      "No se pueden mantener todas las cuotas con menos de un céntimo por cuota. Elige reducir cuotas.",
    );
  let left = balance;
  const base = Math.floor(balance / outstanding.length);
  const extra = balance % outstanding.length;
  const installments: DebtInstallment[] = outstanding.flatMap((row, index) => {
    const value =
      strategy === "term"
        ? Math.min(left, row.amount)
        : base + (index < extra ? 1 : 0);
    left -= value;
    return value > 0 ? [{ ...row, amount: value }] : [];
  });
  return {
    balance,
    count: installments.length,
    removed: outstanding.length - installments.length,
    firstAmount: installments[0]?.amount ?? 0,
    lastAmount: installments.at(-1)?.amount ?? 0,
    lastMonth: installments.at(-1)?.month,
    installments: [
      ...debt.installments
        .filter((r) => r.status === "paid")
        .map((r) => ({ ...r })),
      ...installments,
    ].sort((a, b) => a.month.localeCompare(b.month)),
  };
}

export function applyDebtAdvance(
  debt: ExternalDebt,
  amount: number,
  strategy: DebtAdvance["strategy"],
): ExternalDebt {
  const simulation = simulateDebtAdvance(debt, amount, strategy);
  return {
    ...debt,
    installments: simulation.installments,
    advances: [
      ...(debt.advances ?? []),
      { id: uid(), date: today(), amount, strategy },
    ],
  };
}
