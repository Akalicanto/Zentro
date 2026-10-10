import type { ExternalDebt, DebtInstallment } from "./types.ts";
import { addMonth, today } from "../shared/utils/dates.ts";
import { sum } from "../shared/utils/money.ts";

export function installmentDueDate(month: string, day: number): string {
  if (
    !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month) ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > 31
  )
    throw Error("Revisa el mes y el día de cobro (1–31).");
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function installmentStatus(
  debt: ExternalDebt,
  row: DebtInstallment,
  date = today(),
) {
  const due =
    debt.dueDay === undefined
      ? undefined
      : installmentDueDate(row.month, debt.dueDay);
  if (row.status === "paid")
    return {
      key:
        (due && due > date) || row.month > date.slice(0, 7) ? "early" : "paid",
      label:
        (due && due > date) || row.month > date.slice(0, 7)
          ? "Pagada por adelantado"
          : "Pagada",
      due,
    } as const;
  if (due && due < date)
    return {
      key: "overdue",
      label:
        row.status === "reserved" ? "Con retraso · apartada" : "Con retraso",
      due,
    } as const;
  if (row.status === "reserved")
    return { key: "reserved", label: "Dinero apartado", due } as const;
  if (!due) return { key: "unknown", label: "Sin día definido", due } as const;
  if (due === date) return { key: "today", label: "Vence hoy", due } as const;
  return { key: "upcoming", label: "Próxima", due } as const;
}

export function debtPaymentWatch(debt: ExternalDebt, date = today()) {
  const month = date.slice(0, 7);
  const next = addMonth(month, 1);
  const rows = debt.installments
    .filter((row) => row.month === month || row.month === next)
    .sort((a, b) => a.month.localeCompare(b.month));
  const overdue = debt.installments.filter(
    (row) => installmentStatus(debt, row, date).key === "overdue",
  );
  return {
    rows,
    overdue,
    overdueAmount: sum(overdue.map((row) => row.amount)),
  };
}
