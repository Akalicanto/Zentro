import {
  type Profile,
  cents,
  type CashRow,
  uid,
  today,
  setMonthlyActual,
  sum,
  withdrawSavings,
  editDebtItem,
  deleteDebtItem,
  repayDebt,
  validateProfile,
} from "../../../domain/index.ts";
import { type Modal } from "../types.ts";

export function applyProfileForm(
  data: Profile,
  modal: NonNullable<Modal>,
  f: FormData,
  monthSelection: string,
): Profile {
  const text = (key: string) => String(f.get(key) || "").trim();
  const money = (key: string) => cents(text(key) || "0");
  const nullable = (key: string) => (text(key) ? money(key) : null);
  let next = structuredClone(data);
  if (modal.type === "cash") {
    const kind = modal.kind,
      old = modal.item;
    const row: CashRow = {
      id: old?.id || uid(),
      concept: text("concept"),
      amount: money("amount"),
      month: text("month"),
      status: text("status") as CashRow["status"],
      includedInOpening:
        text("status") === "done" && (old?.includedInOpening || false),
    };
    next.daily[kind] = [
      ...next.daily[kind].filter((r) => r.id !== row.id),
      row,
    ];
  } else if (modal.type === "mortgageBalance") {
    next.mortgageOffer = money("amount");
  } else if (modal.type === "cashBalance") {
    next.cash = money("amount");
  } else if (modal.type === "possibleExpense") {
    const amount = money("amount");
    if (amount <= 0) throw Error("Introduce un importe positivo.");
    next.possibleExpenses = [
      ...(next.possibleExpenses ?? []).filter((r) => r.id !== modal.item?.id),
      { id: modal.item?.id ?? uid(), concept: text("concept"), amount },
    ];
  } else if (modal.type === "balance") {
    next.daily.opening = money("amount");
    next.daily.asOf = today();
    for (const row of [...next.daily.expenses, ...next.daily.incomes])
      if (row.status === "done") row.includedInOpening = true;
  } else if (modal.type === "month") {
    const kind = modal.kind,
      month = monthSelection;
    if (modal.item?.month && modal.item.month !== month)
      throw Error(
        "Edita el importe del mes existente; para otra fecha usa Añadir mes.",
      );
    next = setMonthlyActual(
      next,
      kind,
      month,
      nullable("actual"),
      nullable("goal"),
    );
  } else if (modal.type === "interestBalance") {
    next.interest.opening =
      money("amount") - sum(next.interest.entries.map((r) => r.amount));
  } else if (modal.type === "withdraw")
    next = withdrawSavings(
      next,
      money("amount"),
      text("concept"),
      text("date"),
      "work",
    );
  else if (modal.type === "editDebt")
    next = editDebtItem(
      next,
      modal.item.id,
      text("concept"),
      money("amount"),
      text("date"),
    );
  else if (modal.type === "deleteDebt")
    next = deleteDebtItem(next, modal.item.id);
  else if (modal.type === "repay")
    next = repayDebt(next, money("amount"), text("date"));
  else if (modal.type === "schedule")
    next.internalDebt.schedule = [
      ...next.internalDebt.schedule.filter((r) => r.month !== text("month")),
      { month: text("month"), amount: money("amount") },
    ];
  else if (modal.type === "plan") {
    next.plan = {
      start: text("start"),
      horizon: text("horizon"),
      saving: money("saving"),
      investment: money("investment"),
      repayment: money("repayment"),
      savingsTarget: nullable("target"),
    };
    // El nuevo plan sustituye objetivos futuros; el historial realizado se conserva.
    next.savings = next.savings.map((r) =>
      r.actual === null && r.month >= next.plan.start
        ? { ...r, goal: next.plan.saving }
        : r,
    );
    next.investment = next.investment.map((r) =>
      r.actual === null && r.month >= next.plan.start
        ? { ...r, goal: next.plan.investment }
        : r,
    );
    next.internalDebt.schedule = next.internalDebt.schedule.filter(
      (r) => r.month < next.plan.start,
    );
  }

  return validateProfile(next);
}
