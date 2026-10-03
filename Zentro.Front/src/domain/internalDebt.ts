import type { DebtPayment, Profile } from "./types.ts";
import { debtTotals, debtItemPaid, wealthTotals } from "./totals.ts";
import { validateProfile } from "./validation.ts";
import { sum } from "../shared/utils/money.ts";
import { today } from "../shared/utils/dates.ts";
import { uid } from "../shared/utils/id.ts";

export function withdrawSavings(
  profile: Profile,
  amount: number,
  concept: string,
  date: string,
  source: "work" | "interest",
): Profile {
  if (!concept.trim() || !Number.isSafeInteger(amount) || amount <= 0)
    throw Error("Introduce un concepto y un importe positivo.");
  if (date.slice(0, 7) < profile.plan.start || date > today())
    throw Error(
      "Registra retiradas actuales; el historial anterior ya está contabilizado.",
    );
  const available = wealthTotals(profile)[source];
  if (amount > available)
    throw Error("La retirada supera el ahorro disponible de ese origen.");
  let next = structuredClone(profile);
  const withdrawalId = uid();
  next.internalDebt.items.push({
    id: withdrawalId,
    date,
    amount,
    concept: concept.trim(),
    source,
    historical: false,
  });
  if (source === "interest")
    next.interest.entries.push({
      id: `withdraw-${withdrawalId}`,
      date,
      concept: `Retirada: ${concept.trim()}`,
      amount: -amount,
    });
  else {
    const month = date.slice(0, 7);
    let row = next.savings.find((r) => r.month === month);
    if (!row) {
      row = {
        month,
        goal: next.plan.saving,
        actual: null,
        repayment: 0,
        withdrawal: 0,
        approximation: null,
      };
      next.savings.push(row);
    }
    row.withdrawal += amount;
  }
  validateProfile(next);
  return next;
}
export function repayDebt(
  profile: Profile,
  amount: number,
  date: string,
): Profile {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > debtTotals(profile).pending
  )
    throw Error(
      "La reposición debe ser positiva y no superar la deuda pendiente.",
    );
  if (date.slice(0, 7) < profile.plan.start || date > today())
    throw Error("Selecciona una fecha actual del plan.");
  const next = structuredClone(profile);
  const allocations: DebtPayment["allocations"] = [];
  let remaining = amount;
  for (const item of profile.internalDebt.items) {
    const paid = Math.min(
      remaining,
      item.amount - debtItemPaid(profile, item.id),
    );
    if (paid) allocations.push({ item: item.id, amount: paid });
    remaining -= paid;
    if (!remaining) break;
  }
  next.internalDebt.payments.push({
    id: uid(),
    date,
    amount,
    allocations,
    historical: false,
  });
  const month = date.slice(0, 7);
  let row = next.savings.find((r) => r.month === month);
  if (!row) {
    row = {
      month,
      goal: next.plan.saving,
      actual: null,
      repayment: 0,
      withdrawal: 0,
      approximation: null,
    };
    next.savings.push(row);
  }
  row.repayment += amount;
  validateProfile(next);
  return next;
}
export function cancelWithdrawal(profile: Profile, id: string): Profile {
  const item = profile.internalDebt.items.find((r) => r.id === id);
  if (!item || item.historical || debtItemPaid(profile, id) > 0)
    throw Error(
      "Solo se pueden anular retiradas nuevas sin reposiciones; deshaz sus pagos primero.",
    );
  const next = structuredClone(profile);
  next.internalDebt.items = next.internalDebt.items.filter((r) => r.id !== id);
  if (item.source === "work")
    next.savings.find((r) => r.month === item.date.slice(0, 7))!.withdrawal -=
      item.amount;
  else
    next.interest.entries = next.interest.entries.filter(
      (r) => r.id !== `withdraw-${id}`,
    );
  validateProfile(next);
  return next;
}
export function editDebtItem(
  profile: Profile,
  id: string,
  concept: string,
  amount: number,
  date: string,
): Profile {
  const old = profile.internalDebt.items.find((item) => item.id === id);
  if (!old) throw Error("No se encuentra esta deuda.");
  if (!concept.trim() || !Number.isSafeInteger(amount) || amount <= 0)
    throw Error("Introduce un concepto y un importe positivo.");
  if (amount < debtItemPaid(profile, id))
    throw Error("El importe no puede ser menor que lo ya repuesto.");
  if (
    !old.historical &&
    (date.slice(0, 7) < profile.plan.start || date > today())
  )
    throw Error("Selecciona una fecha actual del plan.");
  if (
    !old.historical &&
    amount > wealthTotals(profile)[old.source] + old.amount
  )
    throw Error("La retirada supera el ahorro disponible de ese origen.");
  const next = structuredClone(profile);
  const item = next.internalDebt.items.find((item) => item.id === id)!;
  item.concept = concept.trim();
  item.amount = amount;
  item.date = date;
  if (!old.historical && old.source === "work") {
    next.savings.find(
      (row) => row.month === old.date.slice(0, 7),
    )!.withdrawal -= old.amount;
    const month = date.slice(0, 7);
    let row = next.savings.find((row) => row.month === month);
    if (!row) {
      row = {
        month,
        goal: next.plan.saving,
        actual: null,
        repayment: 0,
        withdrawal: 0,
        approximation: null,
      };
      next.savings.push(row);
    }
    row.withdrawal += amount;
  } else if (!old.historical) {
    const entry = next.interest.entries.find(
      (entry) => entry.id === `withdraw-${id}`,
    )!;
    entry.amount = -amount;
    entry.date = date;
    entry.concept = `Retirada: ${item.concept}`;
  }
  validateProfile(next);
  return next;
}
export function deleteDebtItem(profile: Profile, id: string): Profile {
  const item = profile.internalDebt.items.find((item) => item.id === id);
  if (!item) throw Error("No se encuentra esta deuda.");
  const next = structuredClone(profile);
  for (const payment of next.internalDebt.payments) {
    const removed = sum(
      payment.allocations
        .filter((allocation) => allocation.item === id)
        .map((allocation) => allocation.amount),
    );
    payment.allocations = payment.allocations.filter(
      (allocation) => allocation.item !== id,
    );
    payment.amount -= removed;
    if (!payment.historical && removed)
      next.savings.find(
        (row) => row.month === payment.date.slice(0, 7),
      )!.repayment -= removed;
  }
  next.internalDebt.payments = next.internalDebt.payments.filter(
    (payment) => payment.amount > 0,
  );
  next.internalDebt.items = next.internalDebt.items.filter(
    (item) => item.id !== id,
  );
  if (!item.historical && item.source === "work")
    next.savings.find(
      (row) => row.month === item.date.slice(0, 7),
    )!.withdrawal -= item.amount;
  else if (!item.historical)
    next.interest.entries = next.interest.entries.filter(
      (entry) => entry.id !== `withdraw-${id}`,
    );
  validateProfile(next);
  return next;
}
