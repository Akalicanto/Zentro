import { addMonth, cents, euro, monthName, sum, uid } from "./format.ts";
export { addMonth, cents, euro, monthName, sum, uid };
export type MonthRow = {
  month: string;
  goal: number | null;
  actual: number | null;
  repayment: number;
  withdrawal: number;
  approximation: number | null;
};
export type CashRow = {
  id: string;
  month: string;
  concept: string;
  amount: number;
  status: "planned" | "done";
  includedInOpening: boolean;
};
export type InterestRow = {
  id: string;
  date: string;
  concept: string;
  amount: number;
};
export type DebtItem = {
  id: string;
  date: string;
  concept: string;
  amount: number;
  source: "work" | "interest";
  historical: boolean;
};
export type DebtPayment = {
  id: string;
  date: string;
  amount: number;
  historical: boolean;
  allocations: { item: string; amount: number }[];
};
export type Profile = {
  version: 2;
  cash?: number;
  mortgageOffer?: number;
  possibleExpenses?: { id: string; concept: string; amount: number }[];
  daily: {
    opening: number;
    asOf: string;
    expenses: CashRow[];
    incomes: CashRow[];
  };
  savings: MonthRow[];
  investment: MonthRow[];
  interest: { opening: number; asOf: string; entries: InterestRow[] };
  internalDebt: {
    items: DebtItem[];
    payments: DebtPayment[];
    schedule: { month: string; amount: number }[];
  };
  plan: {
    start: string;
    saving: number;
    investment: number;
    repayment: number;
    horizon: string;
    savingsTarget: number | null;
  };
  commitments: { id: string; name: string; amount: number | null }[];
};
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
export const currentMonth = () => today().slice(0, 7);
export function blankProfile(): Profile {
  return {
    version: 2,
    cash: 0,
    mortgageOffer: 0,
    possibleExpenses: [],
    daily: { opening: 0, asOf: today(), expenses: [], incomes: [] },
    savings: [],
    investment: [],
    interest: { opening: 0, asOf: today(), entries: [] },
    internalDebt: { items: [], payments: [], schedule: [] },
    plan: {
      start: currentMonth(),
      saving: 0,
      investment: 0,
      repayment: 0,
      horizon: addMonth(currentMonth(), 12),
      savingsTarget: null,
    },
    commitments: [],
  };
}
export function cashTotals(p: Profile) {
  const change = (rows: CashRow[], status: string) =>
    sum(
      rows
        .filter((r) => r.status === status && !r.includedInOpening)
        .map((r) => r.amount),
    );
  const current =
    p.daily.opening +
    change(p.daily.incomes, "done") -
    change(p.daily.expenses, "done");
  return {
    current,
    forecast:
      current +
      change(p.daily.incomes, "planned") -
      change(p.daily.expenses, "planned"),
    expenses: sum(
      p.daily.expenses
        .filter((r) => r.status === "planned")
        .map((r) => r.amount),
    ),
    incomes: sum(
      p.daily.incomes
        .filter((r) => r.status === "planned")
        .map((r) => r.amount),
    ),
  };
}
export function debtTotals(p: Profile) {
  const original = sum(p.internalDebt.items.map((r) => r.amount));
  const paid = sum(p.internalDebt.payments.map((r) => r.amount));
  return { original, paid, pending: original - paid };
}
export function debtItemPaid(p: Profile, id: string) {
  return sum(
    p.internalDebt.payments.flatMap((r) =>
      r.allocations.filter((a) => a.item === id).map((a) => a.amount),
    ),
  );
}
export function wealthTotals(p: Profile) {
  const work = sum(
    p.savings.map((r) => (r.actual ?? 0) + r.repayment - r.withdrawal),
  );
  const interest =
    p.interest.opening + sum(p.interest.entries.map((r) => r.amount));
  const invested = sum(p.investment.map((r) => r.actual ?? 0));
  return {
    work,
    interest,
    savings: work + interest,
    invested,
    net: work + interest + invested,
  };
}
export function monthSeries(p: Profile, kind: "savings" | "investment") {
  const existing = p[kind];
  const months = new Set(existing.map((r) => r.month));
  // El plan añade meses aún no registrados sin inventar aportaciones realizadas.
  for (
    let month = p.plan.start, count = 0;
    month <= p.plan.horizon && count < 600;
    month = addMonth(month, 1), count++
  )
    months.add(month);
  let actual = 0,
    ideal = 0,
    forecast = 0,
    pending = debtTotals(p).pending;
  return [...months].sort().map((month) => {
    const stored = existing.find((r) => r.month === month);
    const inPlan = month >= p.plan.start && month <= p.plan.horizon;
    const goal =
      stored?.goal ??
      (inPlan
        ? kind === "savings"
          ? p.plan.saving
          : p.plan.investment
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
      p.internalDebt.payments
        .filter((r) => !r.historical && r.date.startsWith(month))
        .map((r) => r.amount),
    );
    const scheduled =
      p.internalDebt.schedule.find((r) => r.month === month)?.amount ??
      p.plan.repayment;
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
  p: Profile,
  kind: "savings" | "investment",
  month: string,
  actual: number | null,
  goal: number | null,
): Profile {
  const old = p[kind].find((r) => r.month === month);
  return {
    ...p,
    [kind]: [
      ...p[kind].filter((r) => r.month !== month),
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
export function withdrawSavings(
  p: Profile,
  amount: number,
  concept: string,
  date: string,
  source: "work" | "interest",
): Profile {
  if (!concept.trim() || !Number.isSafeInteger(amount) || amount <= 0)
    throw Error("Introduce un concepto y un importe positivo.");
  if (date.slice(0, 7) < p.plan.start || date > today())
    throw Error(
      "Registra retiradas actuales; el historial anterior ya está contabilizado.",
    );
  const available = wealthTotals(p)[source];
  if (amount > available)
    throw Error("La retirada supera el ahorro disponible de ese origen.");
  let next = structuredClone(p);
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
export function repayDebt(p: Profile, amount: number, date: string): Profile {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > debtTotals(p).pending
  )
    throw Error(
      "La reposición debe ser positiva y no superar la deuda pendiente.",
    );
  if (date.slice(0, 7) < p.plan.start || date > today())
    throw Error("Selecciona una fecha actual del plan.");
  const next = structuredClone(p);
  const allocations: DebtPayment["allocations"] = [];
  let remaining = amount;
  for (const item of p.internalDebt.items) {
    const paid = Math.min(remaining, item.amount - debtItemPaid(p, item.id));
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
export function cancelWithdrawal(p: Profile, id: string): Profile {
  const item = p.internalDebt.items.find((r) => r.id === id);
  if (!item || item.historical || debtItemPaid(p, id) > 0)
    throw Error(
      "Solo se pueden anular retiradas nuevas sin reposiciones; deshaz sus pagos primero.",
    );
  const next = structuredClone(p);
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
  p: Profile,
  id: string,
  concept: string,
  amount: number,
  date: string,
): Profile {
  const old = p.internalDebt.items.find((item) => item.id === id);
  if (!old) throw Error("No se encuentra esta deuda.");
  if (!concept.trim() || !Number.isSafeInteger(amount) || amount <= 0)
    throw Error("Introduce un concepto y un importe positivo.");
  if (amount < debtItemPaid(p, id))
    throw Error("El importe no puede ser menor que lo ya repuesto.");
  if (!old.historical && (date.slice(0, 7) < p.plan.start || date > today()))
    throw Error("Selecciona una fecha actual del plan.");
  if (!old.historical && amount > wealthTotals(p)[old.source] + old.amount)
    throw Error("La retirada supera el ahorro disponible de ese origen.");
  const next = structuredClone(p);
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

export function deleteDebtItem(p: Profile, id: string): Profile {
  const item = p.internalDebt.items.find((item) => item.id === id);
  if (!item) throw Error("No se encuentra esta deuda.");
  const next = structuredClone(p);
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

export function validateProfile(raw: unknown): Profile {
  const p = raw as Profile;
  const integer = (n: unknown) => Number.isSafeInteger(n);
  const nonnegative = (n: unknown) => integer(n) && Number(n) >= 0;
  const month = (s: unknown) =>
    typeof s === "string" && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(s);
  const date = (s: unknown) =>
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  const unique = (rows: { id: string }[]) =>
    rows.every((r) => typeof r.id === "string" && !!r.id) &&
    new Set(rows.map((r) => r.id)).size === rows.length;
  if (
    !p ||
    p.version !== 2 ||
    !p.daily ||
    !p.interest ||
    !p.internalDebt ||
    !p.plan ||
    !Array.isArray(p.savings) ||
    !Array.isArray(p.investment) ||
    !Array.isArray(p.daily.expenses) ||
    !Array.isArray(p.daily.incomes) ||
    !Array.isArray(p.interest.entries) ||
    !Array.isArray(p.internalDebt.items) ||
    !Array.isArray(p.internalDebt.payments) ||
    !Array.isArray(p.internalDebt.schedule) ||
    !Array.isArray(p.commitments)
  )
    throw Error("Perfil no válido.");
  if (
    (p.cash !== undefined && !nonnegative(p.cash)) ||
    (p.mortgageOffer !== undefined && !nonnegative(p.mortgageOffer)) ||
    (p.possibleExpenses !== undefined &&
      (!Array.isArray(p.possibleExpenses) ||
        !unique(p.possibleExpenses) ||
        p.possibleExpenses.some(
          (r) => !r.concept?.trim() || !nonnegative(r.amount) || r.amount === 0,
        )))
  )
    throw Error("Revisa el efectivo y los posibles gastos.");
  if (
    !integer(p.daily.opening) ||
    !date(p.daily.asOf) ||
    !nonnegative(p.interest.opening) ||
    !date(p.interest.asOf) ||
    !month(p.plan.start) ||
    !month(p.plan.horizon) ||
    p.plan.horizon < p.plan.start ||
    ![p.plan.saving, p.plan.investment, p.plan.repayment].every(nonnegative) ||
    (p.plan.savingsTarget !== null && !nonnegative(p.plan.savingsTarget))
  )
    throw Error("Revisa saldos y plan mensual.");
  for (const rows of [p.savings, p.investment]) {
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
  if (p.investment.some((r) => r.repayment !== 0 || r.withdrawal !== 0))
    throw Error("La inversión no admite reposiciones de deuda interna.");
  for (const rows of [p.daily.expenses, p.daily.incomes])
    if (
      !unique(rows) ||
      rows.some(
        (r) =>
          !month(r.month) ||
          !r.concept?.trim() ||
          !integer(r.amount) ||
          r.amount <= 0 ||
          !["planned", "done"].includes(r.status) ||
          typeof r.includedInOpening !== "boolean" ||
          (r.includedInOpening && r.status !== "done"),
      )
    )
      throw Error("Gasto o ingreso no válido.");
  if (
    !unique(p.interest.entries) ||
    p.interest.entries.some(
      (r) =>
        !date(r.date) ||
        r.date < p.interest.asOf ||
        !r.concept?.trim() ||
        !integer(r.amount),
    )
  )
    throw Error("Registro de intereses no válido.");
  if (
    !unique(p.internalDebt.items) ||
    p.internalDebt.items.some(
      (r) =>
        !date(r.date) ||
        !r.concept?.trim() ||
        !integer(r.amount) ||
        r.amount <= 0 ||
        !["work", "interest"].includes(r.source) ||
        typeof r.historical !== "boolean",
    )
  )
    throw Error("Retirada no válida.");
  if (
    !unique(p.internalDebt.payments) ||
    p.internalDebt.payments.some(
      (r) =>
        !date(r.date) ||
        !integer(r.amount) ||
        r.amount <= 0 ||
        typeof r.historical !== "boolean" ||
        !Array.isArray(r.allocations) ||
        sum(r.allocations.map((a) => a.amount)) !== r.amount ||
        r.allocations.some(
          (a) =>
            !p.internalDebt.items.some((i) => i.id === a.item) ||
            !integer(a.amount) ||
            a.amount <= 0,
        ),
    )
  )
    throw Error("Reposición no válida.");
  if (p.internalDebt.items.some((i) => debtItemPaid(p, i.id) > i.amount))
    throw Error("Una reposición supera la deuda de su concepto.");
  for (const row of p.savings) {
    const paid = sum(
      p.internalDebt.payments
        .filter((r) => !r.historical && r.date.startsWith(row.month))
        .map((r) => r.amount),
    );
    if (row.repayment !== paid)
      throw Error(
        "Las reposiciones mensuales deben coincidir con los pagos de deuda.",
      );
    const withdrawals = sum(
      p.internalDebt.items
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
  for (const item of p.internalDebt.items.filter((i) => !i.historical)) {
    if (
      item.source === "work" &&
      !p.savings.some((r) => r.month === item.date.slice(0, 7))
    )
      throw Error("Falta el mes de una retirada.");
    if (
      item.source === "interest" &&
      !p.interest.entries.some(
        (r) =>
          r.id === `withdraw-${item.id}` &&
          r.amount === -item.amount &&
          r.date === item.date,
      )
    )
      throw Error("La retirada de intereses no coincide con su registro.");
  }
  if (
    p.interest.entries.some(
      (r) =>
        r.amount < 0 &&
        !p.internalDebt.items.some(
          (i) =>
            !i.historical &&
            i.source === "interest" &&
            r.id === `withdraw-${i.id}`,
        ),
    )
  )
    throw Error("Registra las retiradas de intereses desde Deuda interna.");
  if (
    p.internalDebt.payments.some(
      (r) =>
        !r.historical && !p.savings.some((s) => s.month === r.date.slice(0, 7)),
    )
  )
    throw Error("Falta el mes de una reposición.");
  if (
    new Set(p.internalDebt.schedule.map((r) => r.month)).size !==
      p.internalDebt.schedule.length ||
    p.internalDebt.schedule.some(
      (r) => !month(r.month) || !nonnegative(r.amount),
    )
  )
    throw Error("Distribución de deuda no válida.");
  if (
    !unique(p.commitments) ||
    p.commitments.some(
      (r) => !r.name?.trim() || (r.amount !== null && !nonnegative(r.amount)),
    )
  )
    throw Error("Compromiso no válido.");
  if (!Object.values(wealthTotals(p)).every(nonnegative))
    throw Error("Los importes acumulados deben ser válidos y no negativos.");
  return p;
}
