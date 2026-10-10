import type { Profile } from "./types.ts";
import {
  cashTotals,
  debtItemPaid,
  debtTotals,
  wealthTotals,
} from "./totals.ts";
import { sum } from "../shared/utils/money.ts";
import { monthDistance } from "../shared/utils/dates.ts";

export function validateProfile(raw: unknown): Profile {
  const profile = raw as Profile;
  const integer = (n: unknown) => Number.isSafeInteger(n);
  const text = (value: unknown) => typeof value === "string" && !!value.trim();
  const collection = (value: unknown) =>
    Array.isArray(value) &&
    value.every(
      (row) => row !== null && typeof row === "object" && !Array.isArray(row),
    );
  const nonnegative = (n: unknown) => integer(n) && Number(n) >= 0;
  const month = (s: unknown) =>
    typeof s === "string" && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(s);
  const date = (s: unknown) =>
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  const unique = (rows: { id: string }[]) =>
    rows.every((r) => r !== null && text(r.id)) &&
    new Set(rows.map((r) => r.id)).size === rows.length;
  if (
    !profile ||
    profile.version !== 2 ||
    !profile.daily ||
    !profile.interest ||
    !profile.internalDebt ||
    !profile.plan ||
    !collection(profile.savings) ||
    !collection(profile.investment) ||
    !collection(profile.daily.expenses) ||
    !collection(profile.daily.incomes) ||
    !collection(profile.interest.entries) ||
    !collection(profile.internalDebt.items) ||
    !collection(profile.internalDebt.payments) ||
    !collection(profile.internalDebt.schedule) ||
    !collection(profile.commitments)
  )
    throw Error("Perfil no válido.");
  if (
    (profile.cash !== undefined && !nonnegative(profile.cash)) ||
    (profile.mortgageOffer !== undefined &&
      !nonnegative(profile.mortgageOffer)) ||
    (profile.possibleExpenses !== undefined &&
      (!collection(profile.possibleExpenses) ||
        !unique(profile.possibleExpenses) ||
        profile.possibleExpenses.some(
          (r) => !text(r.concept) || !nonnegative(r.amount) || r.amount === 0,
        )))
  )
    throw Error("Revisa el efectivo y los posibles gastos.");
  if (
    !integer(profile.daily.opening) ||
    !date(profile.daily.asOf) ||
    !nonnegative(profile.interest.opening) ||
    !date(profile.interest.asOf) ||
    !month(profile.plan.start) ||
    !month(profile.plan.horizon) ||
    profile.plan.horizon < profile.plan.start ||
    monthDistance(profile.plan.start, profile.plan.horizon) >= 600 ||
    ![
      profile.plan.saving,
      profile.plan.investment,
      profile.plan.repayment,
    ].every(nonnegative) ||
    (profile.plan.savingsTarget !== null &&
      !nonnegative(profile.plan.savingsTarget))
  )
    throw Error("Revisa saldos y plan mensual.");
  if (profile.savingsPlacements !== undefined) {
    if (
      !collection(profile.savingsPlacements) ||
      !unique(profile.savingsPlacements) ||
      profile.savingsPlacements.filter((r) => r.amount === null).length > 1 ||
      profile.savingsPlacements.some(
        (r) =>
          !text(r.name) ||
          !["deposit", "remunerated"].includes(r.kind) ||
          (r.amount !== null && !nonnegative(r.amount)) ||
          !nonnegative(r.annualRateBps) ||
          r.annualRateBps > 10000 ||
          !nonnegative(r.withholdingBps) ||
          r.withholdingBps > 10000 ||
          !["tin", "tae"].includes(r.rateType) ||
          (r.dayCount !== undefined &&
            !["monthly", "actual360"].includes(r.dayCount)) ||
          (r.dayCount === "actual360" &&
            (r.kind !== "remunerated" || r.rateType !== "tin")) ||
          (r.kind === "deposit"
            ? r.amount === null ||
              !date(r.start) ||
              !nonnegative(r.months) ||
              r.months === 0 ||
              r.months! > 600
            : r.start !== null || r.months !== null),
      )
    )
      throw Error(
        "Revisa los destinos del ahorro, sus tipos y plazos. Solo una cuenta puede recibir el resto automáticamente.",
      );
  }
  if (profile.debts !== undefined) {
    if (!collection(profile.debts) || !unique(profile.debts))
      throw Error("Deuda no válida o duplicada.");
    for (const debt of profile.debts) {
      if (
        debt.advances !== undefined &&
        (!collection(debt.advances) ||
          !unique(debt.advances) ||
          debt.advances.some(
            (row) =>
              !date(row.date) ||
              !nonnegative(row.amount) ||
              row.amount === 0 ||
              !["term", "payment"].includes(row.strategy),
          ))
      )
        throw Error(
          "Revisa los adelantos de la deuda: fecha, importe y opción elegida.",
        );
      if (
        !text(debt.name) ||
        (debt.dueDay !== undefined &&
          (!Number.isInteger(debt.dueDay) ||
            debt.dueDay < 1 ||
            debt.dueDay > 31)) ||
        !nonnegative(debt.total) ||
        !collection(debt.installments) ||
        new Set(debt.installments.map((r) => r.month)).size !==
          debt.installments.length ||
        debt.installments.some(
          (r) =>
            !month(r.month) ||
            !nonnegative(r.amount) ||
            r.amount === 0 ||
            !["paid", "reserved", "pending"].includes(r.status),
        ) ||
        sum([
          ...debt.installments.map((r) => r.amount),
          ...(debt.advances ?? []).map((row) => row.amount),
        ]) > debt.total
      )
        throw Error(
          "Revisa la deuda y sus cuotas: no pueden superar el total ni repetir un mes.",
        );
      if (
        [debt.createdOn, debt.completedOn, debt.archivedOn].some(
          (d) => d !== undefined && !date(d),
        ) ||
        (debt.notes !== undefined &&
          (typeof debt.notes !== "string" || debt.notes.length > 2000)) ||
        (debt.completedOn !== undefined &&
          debt.installments
            .filter((r) => r.status === "paid")
            .reduce((n, r) => n + r.amount, 0) +
            sum((debt.advances ?? []).map((row) => row.amount)) !==
            debt.total) ||
        (debt.activity !== undefined &&
          (!collection(debt.activity) ||
            !unique(debt.activity) ||
            debt.activity.some(
              (r) =>
                !date(r.date) ||
                typeof r.description !== "string" ||
                !r.description.trim() ||
                r.description.length > 1000,
            )))
      )
        throw Error(
          "Revisa las fechas, notas e historial. Una deuda completada debe estar pagada por entero.",
        );
    }
  }
  for (const rows of [profile.savings, profile.investment]) {
    if (
      new Set(rows.map((r) => r.month)).size !== rows.length ||
      rows.some(
        (r) =>
          !month(r.month) ||
          (r.actual !== null && !integer(r.actual)) ||
          (r.goal !== null && !nonnegative(r.goal)) ||
          !nonnegative(r.repayment) ||
          !nonnegative(r.withdrawal) ||
          (r.approximation !== null && !nonnegative(r.approximation)),
      )
    )
      throw Error("Mes del historial no válido o duplicado.");
  }
  if (profile.investment.some((r) => r.repayment !== 0 || r.withdrawal !== 0))
    throw Error("La inversión no admite reposiciones de deuda interna.");
  for (const rows of [profile.daily.expenses, profile.daily.incomes])
    if (
      !unique(rows) ||
      rows.some(
        (r) =>
          !text(r.concept) ||
          !integer(r.amount) ||
          r.amount <= 0 ||
          !["planned", "done"].includes(r.status) ||
          typeof r.includedInOpening !== "boolean" ||
          (r.includedInOpening && r.status !== "done"),
      )
    )
      throw Error("Gasto o ingreso no válido.");
  if (
    !unique(profile.interest.entries) ||
    profile.interest.entries.some(
      (r) =>
        !date(r.date) ||
        r.date < profile.interest.asOf ||
        !text(r.concept) ||
        !integer(r.amount),
    )
  )
    throw Error("Registro de intereses no válido.");
  if (
    !unique(profile.internalDebt.items) ||
    profile.internalDebt.items.some(
      (r) =>
        !date(r.date) ||
        !text(r.concept) ||
        !integer(r.amount) ||
        r.amount <= 0 ||
        !["work", "interest"].includes(r.source) ||
        typeof r.historical !== "boolean",
    )
  )
    throw Error("Retirada no válida.");
  if (
    !unique(profile.internalDebt.payments) ||
    profile.internalDebt.payments.some(
      (r) =>
        !date(r.date) ||
        !integer(r.amount) ||
        r.amount <= 0 ||
        typeof r.historical !== "boolean" ||
        !collection(r.allocations) ||
        sum(r.allocations.map((a) => a.amount)) !== r.amount ||
        r.allocations.some(
          (a) =>
            !profile.internalDebt.items.some((i) => i.id === a.item) ||
            !integer(a.amount) ||
            a.amount <= 0,
        ),
    )
  )
    throw Error("Reposición no válida.");
  if (
    profile.internalDebt.items.some(
      (i) => debtItemPaid(profile, i.id) > i.amount,
    )
  )
    throw Error("Una reposición supera la deuda de su concepto.");
  for (const row of profile.savings) {
    const paid = sum(
      profile.internalDebt.payments
        .filter((r) => !r.historical && r.date.startsWith(row.month))
        .map((r) => r.amount),
    );
    if (row.repayment !== paid)
      throw Error(
        "Las reposiciones mensuales deben coincidir con los pagos de deuda.",
      );
    const withdrawals = sum(
      profile.internalDebt.items
        .filter(
          (i) =>
            !i.historical &&
            i.source === "work" &&
            i.date.startsWith(row.month),
        )
        .map((i) => i.amount),
    );
    if (row.withdrawal !== withdrawals)
      throw Error(
        "Las retiradas mensuales deben coincidir con la deuda interna.",
      );
  }
  for (const item of profile.internalDebt.items.filter((i) => !i.historical)) {
    if (
      item.source === "work" &&
      !profile.savings.some((r) => r.month === item.date.slice(0, 7))
    )
      throw Error("Falta el mes de una retirada.");
    if (
      item.source === "interest" &&
      !profile.interest.entries.some(
        (r) =>
          r.id === `withdraw-${item.id}` &&
          r.amount === -item.amount &&
          r.date === item.date,
      )
    )
      throw Error("La retirada de intereses no coincide con su registro.");
  }
  if (
    profile.interest.entries.some(
      (r) =>
        r.amount < 0 &&
        !profile.internalDebt.items.some(
          (i) =>
            !i.historical &&
            i.source === "interest" &&
            r.id === `withdraw-${i.id}`,
        ),
    )
  )
    throw Error("Registra las retiradas de intereses desde Deuda interna.");
  if (
    profile.internalDebt.payments.some(
      (r) =>
        !r.historical &&
        !profile.savings.some((s) => s.month === r.date.slice(0, 7)),
    )
  )
    throw Error("Falta el mes de una reposición.");
  if (
    new Set(profile.internalDebt.schedule.map((r) => r.month)).size !==
      profile.internalDebt.schedule.length ||
    profile.internalDebt.schedule.some(
      (r) => !month(r.month) || !nonnegative(r.amount),
    )
  )
    throw Error("Distribución de deuda no válida.");
  if (
    !unique(profile.commitments) ||
    profile.commitments.some(
      (r) => !text(r.name) || (r.amount !== null && !nonnegative(r.amount)),
    )
  )
    throw Error("Compromiso no válido.");
  if (!Object.values(wealthTotals(profile)).every(nonnegative))
    throw Error("Los importes acumulados deben ser válidos y no negativos.");
  cashTotals(profile);
  debtTotals(profile);
  sum((profile.possibleExpenses ?? []).map((row) => row.amount));
  sum((profile.debts ?? []).map((debt) => debt.total));
  // Las copias antiguas pueden traer mes; se descarta sin cambiar importes.
  return {
    ...profile,
    daily: {
      ...profile.daily,
      expenses: profile.daily.expenses.map(
        ({ id, concept, amount, status, includedInOpening }) => ({
          id,
          concept,
          amount,
          status,
          includedInOpening,
        }),
      ),
      incomes: profile.daily.incomes.map(
        ({ id, concept, amount, status, includedInOpening }) => ({
          id,
          concept,
          amount,
          status,
          includedInOpening,
        }),
      ),
    },
  };
}
