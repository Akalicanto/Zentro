export type Account = {
  id: string;
  bank: string;
  name: string;
  kind: "daily" | "savings" | "investment" | "cash";
  opening: number;
  date: string;
};
export type Debt = {
  id: string;
  name: string;
  kind: "external" | "internal";
  original: number;
  initialPaid: number;
  date: string;
  description: string;
  monthly: number;
};
export type Kind =
  | "income"
  | "expense"
  | "transfer"
  | "saving"
  | "investment"
  | "repayment"
  | "debt"
  | "interest"
  | "withdrawal";
export type Entry = {
  id: string;
  concept: string;
  amount: number;
  date: string;
  kind: Kind;
  status: "planned" | "done";
  category: string;
  from: string;
  to: string;
  debt: string;
  reserved: number;
  series?: string;
};
export type Goal = {
  id: string;
  name: string;
  target: number;
  account: string;
  date: string;
};
export type Data = {
  version: 1;
  demo: boolean;
  accounts: Account[];
  debts: Debt[];
  entries: Entry[];
  goals: Goal[];
  categories: string[];
};
export const labels: Record<Kind, string> = {
  income: "Ingreso",
  expense: "Gasto",
  transfer: "Transferencia",
  saving: "Aportación a ahorro",
  investment: "Aportación a inversión",
  repayment: "Devolución interna",
  debt: "Pago de deuda externa",
  interest: "Intereses",
  withdrawal: "Retirada de ahorro",
};
export const euro = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    n / 100,
  );
export function cents(v: string) {
  if (!/^-?\d+(?:[.,]\d{1,2})?$/.test(v.trim()))
    throw Error("Introduce un importe con un máximo de dos decimales.");
  const n = Math.round(Number(v.replace(",", ".")) * 100);
  if (!Number.isSafeInteger(n)) throw Error("Importe demasiado grande.");
  return n;
}
export const uid = () => crypto.randomUUID();
export const monthOf = (date: string) => date.slice(0, 7);
export function addMonth(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
export function monthName(m: string) {
  return new Date(m + "-02T12:00:00").toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}
export const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
export function balance(d: Data, id: string, until = "9999-12-31") {
  const a = d.accounts.find((a) => a.id === id);
  if (!a || until < a.date) return 0;
  return (
    a.opening +
    sum(
      d.entries
        .filter(
          (e) => e.status === "done" && e.date >= a.date && e.date <= until,
        )
        .map(
          (e) => (e.to === id ? e.amount : 0) - (e.from === id ? e.amount : 0),
        ),
    )
  );
}
export function debtState(d: Data, id: string, until = "9999-12-31") {
  const debt = d.debts.find((x) => x.id === id)!;
  const es = d.entries.filter((e) => e.debt === id && e.date <= until);
  const paid =
    debt.initialPaid +
    sum(es.filter((e) => e.status === "done").map((e) => e.amount));
  const reserved = sum(
    es.filter((e) => e.status === "planned").map((e) => e.reserved),
  );
  return { paid, pending: debt.original - paid, reserved };
}
export function projected(d: Data, id: string, month: string) {
  const end = month + "-31";
  return (
    balance(d, id, end) +
    sum(
      d.entries
        .filter(
          (e) =>
            e.status === "planned" &&
            e.date <= end &&
            e.date >= d.accounts.find((a) => a.id === id)!.date,
        )
        .map(
          (e) => (e.to === id ? e.amount : 0) - (e.from === id ? e.amount : 0),
        ),
    )
  );
}
export function totals(d: Data) {
  const by = (k: Account["kind"]) =>
    sum(d.accounts.filter((a) => a.kind === k).map((a) => balance(d, a.id)));
  const available = by("daily") + by("cash"),
    savings = by("savings"),
    invested = by("investment");
  const external = sum(
      d.debts
        .filter((x) => x.kind === "external")
        .map((x) => debtState(d, x.id).pending),
    ),
    internal = sum(
      d.debts
        .filter((x) => x.kind === "internal")
        .map((x) => debtState(d, x.id).pending),
    );
  return {
    available,
    savings,
    invested,
    external,
    internal,
    assets: available + savings + invested,
    net: available + savings + invested - external,
  };
}
export function validateEntry(d: Data, e: Entry) {
  if (!Number.isSafeInteger(e.amount) || e.amount <= 0)
    throw Error("El importe debe ser mayor que cero.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
    isNaN(Date.parse(e.date)) ||
    new Date(e.date).toISOString().slice(0, 10) !== e.date
  )
    throw Error("Fecha no válida.");
  if (!e.concept.trim()) throw Error("Escribe un concepto.");
  const incoming = ["income", "interest"].includes(e.kind),
    outgoing = ["expense", "debt"].includes(e.kind);
  if ((incoming && e.from) || (outgoing && e.to))
    throw Error(
      "El ingreso debe proceder del exterior y el gasto salir al exterior.",
    );
  if (!["debt", "repayment"].includes(e.kind) && e.debt)
    throw Error("Solo los pagos de deuda pueden amortizar una deuda.");
  if (e.reserved && (e.kind !== "debt" || e.status !== "planned"))
    throw Error("Solo se puede reservar dinero en cuotas externas previstas.");
  if (!incoming && !d.accounts.some((a) => a.id === e.from))
    throw Error("Selecciona una cuenta de origen.");
  if (!outgoing && !d.accounts.some((a) => a.id === e.to))
    throw Error("Selecciona una cuenta de destino.");
  if (e.from && e.from === e.to)
    throw Error("Origen y destino deben ser diferentes.");
  for (const id of [e.from, e.to].filter(Boolean)) {
    if (e.date < d.accounts.find((a) => a.id === id)!.date)
      throw Error(
        "La fecha debe ser posterior o igual al saldo inicial de la cuenta.",
      );
  }
  if (
    ["saving", "repayment", "interest"].includes(e.kind) &&
    d.accounts.find((a) => a.id === e.to)?.kind !== "savings"
  )
    throw Error("El destino debe ser una cuenta de ahorro.");
  if (
    e.kind === "investment" &&
    d.accounts.find((a) => a.id === e.to)?.kind !== "investment"
  )
    throw Error("El destino debe ser una cuenta de inversión.");
  if (
    e.kind === "withdrawal" &&
    d.accounts.find((a) => a.id === e.from)?.kind !== "savings"
  )
    throw Error("El origen debe ser una cuenta de ahorro.");
  if (["debt", "repayment"].includes(e.kind)) {
    const debt = d.debts.find((x) => x.id === e.debt);
    if (!debt || debt.kind !== (e.kind === "debt" ? "external" : "internal"))
      throw Error("Selecciona una deuda del tipo correcto.");
    if (e.date < debt.date) throw Error("El pago es anterior a la deuda.");
    const other = { ...d, entries: d.entries.filter((x) => x.id !== e.id) };
    if (e.amount > debtState(other, e.debt).pending)
      throw Error("El pago supera la deuda pendiente.");
  }
  if (
    !Number.isSafeInteger(e.reserved) ||
    e.reserved < 0 ||
    e.reserved > e.amount
  )
    throw Error("La reserva debe estar entre cero y el importe de la cuota.");
}
export function validateData(raw: unknown): Data {
  const d = raw as Data;
  if (
    !d ||
    d.version !== 1 ||
    typeof d.demo !== "boolean" ||
    !Array.isArray(d.accounts) ||
    !Array.isArray(d.entries) ||
    !Array.isArray(d.debts) ||
    !Array.isArray(d.goals) ||
    !Array.isArray(d.categories) ||
    !d.categories.every((x) => typeof x === "string")
  )
    throw Error("Copia de seguridad no válida.");
  const validDate = (s: string) =>
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  for (const a of d.accounts) {
    if (
      !a.id ||
      typeof a.name !== "string" ||
      typeof a.bank !== "string" ||
      !["daily", "savings", "investment", "cash"].includes(a.kind) ||
      !Number.isSafeInteger(a.opening) ||
      !validDate(a.date)
    )
      throw Error("Cuenta no válida.");
  }
  for (const x of d.debts) {
    if (
      !x.id ||
      !["external", "internal"].includes(x.kind) ||
      typeof x.name !== "string" ||
      typeof x.description !== "string" ||
      !validDate(x.date) ||
      ![x.original, x.initialPaid, x.monthly].every(Number.isSafeInteger) ||
      x.original <= 0 ||
      x.initialPaid < 0 ||
      x.initialPaid > x.original ||
      x.monthly < 0
    )
      throw Error("Deuda no válida.");
  }
  for (const list of [d.accounts, d.debts, d.entries, d.goals])
    if (new Set(list.map((x) => x.id)).size !== list.length)
      throw Error("Identificadores duplicados.");
  for (const e of d.entries) {
    if (
      !["done", "planned"].includes(e.status) ||
      !Object.hasOwn(labels, e.kind) ||
      typeof e.category !== "string"
    )
      throw Error("Movimiento no válido.");
    validateEntry(d, e);
  }
  for (const x of d.debts) {
    if (debtState(d, x.id).pending < 0)
      throw Error("Los pagos superan la deuda.");
  }
  for (const g of d.goals) {
    if (
      !g.id ||
      typeof g.name !== "string" ||
      !Number.isSafeInteger(g.target) ||
      g.target <= 0 ||
      !validDate(g.date) ||
      !d.accounts.some((a) => a.id === g.account && a.kind === "savings")
    )
      throw Error("Objetivo no válido.");
  }
  return d;
}
export function empty(): Data {
  return {
    version: 1,
    demo: false,
    accounts: [],
    debts: [],
    entries: [],
    goals: [],
    categories: [
      "Alimentación",
      "Transporte",
      "Ocio",
      "Hogar",
      "Nómina",
      "Otros",
    ],
  };
}
export function demo(): Data {
  const d = empty();
  d.demo = true;
  d.accounts = [
    {
      id: "ing",
      bank: "ING",
      name: "Cuenta diaria",
      kind: "daily",
      opening: 55420,
      date: "2026-10-01",
    },
    {
      id: "tr",
      bank: "Trade Republic",
      name: "Mi colchón",
      kind: "savings",
      opening: 2145083,
      date: "2026-10-01",
    },
    {
      id: "mi",
      bank: "MyInvestor",
      name: "Inversión a largo plazo",
      kind: "investment",
      opening: 575000,
      date: "2026-10-01",
    },
    {
      id: "cash",
      bank: "Efectivo",
      name: "Cartera",
      kind: "cash",
      opening: 41000,
      date: "2026-10-01",
    },
  ];
  d.debts = [
    {
      id: "loan",
      name: "Préstamo personal",
      kind: "external",
      original: 316200,
      initialPaid: 126480,
      date: "2025-11-01",
      description:
        "12 cuotas anteriores al inicio, ya pagadas. Las reservas no amortizan deuda.",
      monthly: 10540,
    },
    {
      id: "wheels",
      name: "Ruedas",
      kind: "internal",
      original: 7000,
      initialPaid: 0,
      date: "2026-09-01",
      description: "Importe ilustrativo pendiente de conciliación.",
      monthly: 2000,
    },
    {
      id: "trip",
      name: "Viaje a Holanda",
      kind: "internal",
      original: 53000,
      initialPaid: 0,
      date: "2026-09-01",
      description: "Retirada anterior al saldo inicial.",
      monthly: 10000,
    },
    {
      id: "gym",
      name: "Gimnasio",
      kind: "internal",
      original: 40000,
      initialPaid: 0,
      date: "2026-09-01",
      description: "Retirada anterior al saldo inicial.",
      monthly: 8000,
    },
  ];
  const entry = (v: Partial<Entry>) =>
    d.entries.push({
      id: uid(),
      concept: "",
      amount: 0,
      date: "2026-10-10",
      kind: "expense",
      status: "planned",
      category: "Otros",
      from: "ing",
      to: "",
      debt: "",
      reserved: 0,
      ...v,
    });
  entry({ concept: "Gasolina", amount: 10000, category: "Transporte" });
  entry({ concept: "Peluquería", amount: 1600 });
  entry({ concept: "Cena", amount: 20000, category: "Ocio" });
  entry({
    concept: "Cuota del préstamo",
    amount: 10540,
    kind: "debt",
    debt: "loan",
    date: "2026-10-28",
  });
  for (let i = 1; i <= 17; i++) {
    const m = addMonth("2026-10", i);
    entry({
      concept: "Cuota del préstamo",
      amount: 10540,
      kind: "debt",
      debt: "loan",
      date: m + "-28",
      reserved: i <= 2 ? 10540 : 0,
    });
  }
  for (let i = 0; i < 15; i++) {
    const m = addMonth("2026-10", i);
    entry({
      concept: "Aportación a mis ahorros",
      amount: i < 5 ? 120000 : 100000,
      kind: "saving",
      to: "tr",
      date: m + "-25",
    });
    entry({
      concept: "Inversión mensual",
      amount: 75000,
      kind: "investment",
      to: "mi",
      date: m + "-25",
    });
  }
  d.goals = [
    {
      id: uid(),
      name: "Un futuro con tranquilidad",
      target: 3700000,
      account: "tr",
      date: "2027-12-31",
    },
  ];
  return d;
}
