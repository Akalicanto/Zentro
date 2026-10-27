import type { DebtInstallment } from "./types.ts";

export function installmentAmounts(row: DebtInstallment) {
  const paid = row.paidAmount ?? (row.status === "paid" ? row.amount : 0);
  const reserved =
    row.reservedAmount ?? (row.status === "reserved" ? row.amount : 0);
  return {
    paid,
    reserved,
    pending: row.amount - paid - reserved,
    remaining: row.amount - paid,
  };
}

export function withInstallmentAmounts(
  row: DebtInstallment,
  amount: number,
  paid: number,
  reserved: number,
): DebtInstallment {
  if (
    ![amount, paid, reserved].every(Number.isSafeInteger) ||
    amount <= 0 ||
    paid < 0 ||
    reserved < 0 ||
    paid + reserved > amount
  )
    throw Error("Pagado y apartado no pueden superar el importe de la cuota.");
  const status =
    paid === amount ? "paid" : reserved > 0 ? "reserved" : "pending";
  const { paidAmount: _, reservedAmount: __, ...original } = row;
  const partial =
    (paid > 0 && paid < amount) || (reserved > 0 && reserved < amount);
  return {
    ...original,
    amount,
    status,
    ...(partial ||
    row.paidAmount !== undefined ||
    row.reservedAmount !== undefined
      ? { paidAmount: paid, reservedAmount: reserved }
      : {}),
  };
}

export function editInstallmentAmount(
  row: DebtInstallment,
  field: "amount" | "paid" | "reserved",
  value: number,
) {
  const current = installmentAmounts(row);
  return withInstallmentAmounts(
    row,
    field === "amount" ? value : row.amount,
    field === "paid" ? value : current.paid,
    field === "reserved"
      ? value
      : field === "paid"
        ? Math.max(0, current.reserved - Math.max(0, value - current.paid))
        : current.reserved,
  );
}
