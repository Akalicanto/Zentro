import type { ExternalDebt } from "./types.ts";
import { today, currentMonth, addMonth } from "../shared/utils/dates.ts";
import { uid } from "../shared/utils/id.ts";
import { sum } from "../shared/utils/money.ts";

export function debtStatus(debt: ExternalDebt) {
  if (debt.archivedOn) return "archived";
  if (debt.completedOn) return "completed";
  return "active";
}
export function recordDebtActivity(
  debt: ExternalDebt,
  description: string,
): ExternalDebt {
  return {
    ...debt,
    activity: [
      ...(debt.activity ?? []),
      { id: uid(), date: today(), description },
    ],
  };
}
export function planDebtInstallments(
  debt: ExternalDebt,
  start: string,
  count: number,
): ExternalDebt {
  const remaining =
    debt.total -
    sum([
      ...debt.installments.map((r) => r.amount),
      ...(debt.advances ?? []).map((r) => r.amount),
    ]);
  if (
    !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(start) ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 120 ||
    remaining < count
  )
    throw Error(
      "Indica entre 1 y 120 cuotas y un importe pendiente suficiente.",
    );
  const base = Math.floor(remaining / count);
  const rows = Array.from({ length: count }, (_, i) => ({
    month: addMonth(start, i),
    amount: base + (i === count - 1 ? remaining - base * count : 0),
    status: "pending" as const,
  }));
  if (rows.some((r) => debt.installments.some((old) => old.month === r.month)))
    throw Error(
      "El calendario coincide con una cuota existente. Elige otro mes de inicio.",
    );
  return recordDebtActivity(
    {
      ...debt,
      installments: [...debt.installments, ...rows].sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
    },
    `Planificadas ${count} cuotas para el importe sin calendario.`,
  );
}
export function completeDebt(debt: ExternalDebt): ExternalDebt {
  const missing =
    debt.total -
    sum([
      ...debt.installments.map((r) => r.amount),
      ...(debt.advances ?? []).map((r) => r.amount),
    ]);
  const installments = debt.installments.map((r) => ({
    ...r,
    status: "paid" as const,
  }));
  if (missing > 0) {
    const row = installments.find((r) => r.month === currentMonth());
    if (row) row.amount += missing;
    else
      installments.push({
        month: currentMonth(),
        amount: missing,
        status: "paid",
      });
  }
  return recordDebtActivity(
    {
      ...debt,
      installments: installments.sort((a, b) => a.month.localeCompare(b.month)),
      completedOn: today(),
    },
    "Deuda completada. Todo el importe queda registrado como pagado.",
  );
}
export function reopenDebt(debt: ExternalDebt): ExternalDebt {
  const { completedOn: _, ...open } = debt;
  return recordDebtActivity(
    open,
    "Deuda reabierta para revisar su importe o sus cuotas.",
  );
}
export function archiveDebt(debt: ExternalDebt): ExternalDebt {
  return recordDebtActivity(
    { ...debt, archivedOn: today() },
    "Deuda eliminada de las activas y conservada en el historial.",
  );
}
export function restoreDebt(debt: ExternalDebt): ExternalDebt {
  const { archivedOn: _, ...restored } = debt;
  return recordDebtActivity(restored, "Deuda recuperada del historial.");
}
