import { useState } from "react";
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  CreditCard,
  HeartHandshake,
  Sprout,
  TrendingUp,
  CalendarDays,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Pencil,
  Trash2,
  Download,
  Upload,
  Menu,
  Sun,
  Moon,
  Check,
  Wallet,
  CircleHelp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  type Data,
  type Entry,
  type Account,
  type Debt,
  type Kind,
  labels,
  euro,
  cents,
  uid,
  sum,
  balance,
  projected,
  debtState,
  totals,
  addMonth,
  monthName,
  monthOf,
  demo,
  empty,
  validateData,
  validateEntry,
} from "./finance";

const KEY = "zentro.v1";
const nav = [
  ["Resumen", LayoutDashboard],
  ["Cuentas", Landmark],
  ["Movimientos", ArrowLeftRight],
  ["Deuda externa", CreditCard],
  ["Deuda interna", HeartHandshake],
  ["Ahorros", Sprout],
  ["Inversiones", TrendingUp],
  ["Planificación", CalendarDays],
  ["Configuración", Settings],
] as const;
const purposes = {
  daily: "Uso diario",
  savings: "Ahorro",
  investment: "Inversión",
  cash: "Efectivo",
};
type Modal = {
  type: "entry" | "account" | "debt" | "goal";
  item?: any;
  kind?: string;
} | null;
function read() {
  try {
    const s = localStorage.getItem(KEY);
    return { data: s ? validateData(JSON.parse(s)) : demo(), error: "" };
  } catch {
    return {
      data: empty(),
      error:
        "No se ha podido leer el almacenamiento. No se sobrescribirá hasta que hagas un cambio. Puedes importar una copia válida.",
    };
  }
}
const initial = read();
export default function App() {
  const [d, setD] = useState<Data>(initial.data),
    [page, setPage] = useState("Resumen"),
    [month, setMonth] = useState("2026-10"),
    [modal, setModal] = useState<Modal>(null),
    [error, setError] = useState(initial.error),
    [toast, setToast] = useState(""),
    [dark, setDark] = useState(false),
    [mobile, setMobile] = useState(false),
    [filter, setFilter] = useState(""),
    [status, setStatus] = useState("all");
  const t = totals(d);
  const accountName = (id: string) =>
    d.accounts.find((a) => a.id === id)?.name || "Exterior";
  function save(next: Data) {
    try {
      validateData(next);
      localStorage.setItem(KEY, JSON.stringify(next));
      setD(next);
      setError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  function inform(s: string) {
    setToast(s);
    setTimeout(() => setToast(""), 3500);
  }
  function remove(
    type: "entries" | "accounts" | "debts" | "goals",
    id: string,
  ) {
    if (
      !confirm(
        "¿Eliminar este registro? Se recalcularán los saldos relacionados.",
      )
    )
      return;
    if (
      type === "accounts" &&
      (d.entries.some((e) => e.from === id || e.to === id) ||
        d.goals.some((g) => g.account === id))
    ) {
      setError(
        "Esta cuenta tiene movimientos u objetivos. Elimínalos o asígnalos a otra cuenta antes.",
      );
      return;
    }
    if (type === "debts" && d.entries.some((e) => e.debt === id)) {
      setError("Esta deuda tiene pagos. Elimina sus pagos antes de borrarla.");
      return;
    }
    save({ ...d, [type]: d[type].filter((x) => x.id !== id) });
  }
  const monthly = d.entries.filter((e) => monthOf(e.date) === month);
  const daily = d.accounts.filter((a) => ["daily", "cash"].includes(a.kind));
  const availableEnd = sum(daily.map((a) => projected(d, a.id, month)));
  const byKind = (k: Kind, s?: string) =>
    sum(
      monthly
        .filter((e) => e.kind === k && (!s || e.status === s))
        .map((e) => e.amount),
    );
  function exportFile(json = true) {
    const rows = [
      [
        "Fecha",
        "Concepto",
        "Tipo",
        "Estado",
        "Importe EUR",
        "Origen",
        "Destino",
      ],
      ...d.entries.map((e) => [
        e.date,
        e.concept,
        labels[e.kind],
        e.status === "done" ? "Realizado" : "Previsto",
        (e.amount / 100).toFixed(2).replace(".", ","),
        accountName(e.from),
        accountName(e.to),
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map(
            (v) =>
              '"' +
              String(v)
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(";"),
      )
      .join("\r\n");
    const blob = new Blob(
      [json ? JSON.stringify(d, null, 2) : "\ufeff" + csv],
      { type: json ? "application/json" : "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `zentro-${new Date().toISOString().slice(0, 10)}.${json ? "json" : "csv"}`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function editActions(type: "entry" | "account" | "debt" | "goal", item: any) {
    return (
      <div className="actions">
        <button
          className="icon"
          aria-label={"Editar " + (item.concept || item.name)}
          onClick={() => setModal({ type, item })}
        >
          <Pencil size={15} />
        </button>
        <button
          className="icon danger"
          aria-label={"Eliminar " + (item.concept || item.name)}
          onClick={() =>
            remove(
              (
                {
                  entry: "entries",
                  account: "accounts",
                  debt: "debts",
                  goal: "goals",
                } as const
              )[type],
              item.id,
            )
          }
        >
          <Trash2 size={15} />
        </button>
      </div>
    );
  }
  function entriesTable(es: Entry[]) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Concepto / categoría</th>
              <th>Fecha</th>
              <th>Tipo / cuentas</th>
              <th>Estado</th>
              <th className="right">Importe</th>
              <th>Pendiente de deuda</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {es
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.concept}</strong>
                    <small>
                      {e.category}
                      {e.series ? " · Recurrente" : ""}
                    </small>
                  </td>
                  <td>{e.date.split("-").reverse().join("/")}</td>
                  <td>
                    {labels[e.kind]}
                    <small>
                      {e.from ? accountName(e.from) : "Exterior"} →{" "}
                      {e.to ? accountName(e.to) : "Exterior"}
                    </small>
                  </td>
                  <td>
                    <span
                      className={
                        "badge " + (e.status === "done" ? "green" : "amber")
                      }
                    >
                      {e.status === "done" ? "Realizado" : "Previsto"}
                    </span>
                    {e.reserved > 0 && (
                      <small>{euro(e.reserved)} reservado</small>
                    )}
                  </td>
                  <td className="right amount">{euro(e.amount)}</td>
                  <td>
                    {e.debt ? (
                      <>
                        <span>
                          {euro(debtState(d, e.debt, e.date).pending)}
                        </span>
                        <small>Real a esta fecha</small>
                        <span>
                          {euro(
                            Math.max(
                              0,
                              debtState(d, e.debt, e.date).pending -
                                sum(
                                  d.entries
                                    .filter(
                                      (x) =>
                                        x.debt === e.debt &&
                                        x.status === "planned" &&
                                        x.date <= e.date,
                                    )
                                    .map((x) => x.amount),
                                ),
                            ),
                          )}
                        </span>
                        <small>Tras el plan hasta esta fecha</small>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <div className="actions">
                      {e.status === "planned" && (
                        <button
                          className="icon"
                          aria-label={"Realizar " + e.concept}
                          onClick={() => {
                            if (
                              save({
                                ...d,
                                entries: d.entries.map((x) =>
                                  x.id === e.id
                                    ? { ...x, status: "done", reserved: 0 }
                                    : x,
                                ),
                              })
                            )
                              inform(
                                "Movimiento realizado. Saldos actualizados.",
                              );
                          }}
                        >
                          <Check size={17} />
                        </button>
                      )}
                      {editActions("entry", e)}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!es.length && (
          <div className="empty">
            Todavía no hay movimientos en este periodo.
            <button onClick={() => setModal({ type: "entry" })}>
              Añadir un movimiento
            </button>
          </div>
        )}
      </div>
    );
  }
  function metric(title: string, value: number, note: string, accent = false) {
    return (
      <div className={"metric " + (accent ? "accent" : "")}>
        <span>{title}</span>
        <h2>{euro(value)}</h2>
        <small>{note}</small>
      </div>
    );
  }
  const chart = Array.from({ length: 12 }, (_, i) => {
    const m = addMonth(month, i);
    return {
      name: monthName(m).split(" ")[0].slice(0, 3),
      Ahorro:
        sum(
          d.accounts
            .filter((a) => a.kind === "savings")
            .map((a) => projected(d, a.id, m)),
        ) / 100,
      Inversión:
        sum(
          d.accounts
            .filter((a) => a.kind === "investment")
            .map((a) => projected(d, a.id, m)),
        ) / 100,
    };
  });
  function projectionChart() {
    return (
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart}>
            <defs>
              <linearGradient id="green" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5f9985" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#5f9985" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v / 1000}k`}
            />
            <Tooltip formatter={(v) => euro(Number(v) * 100)} />
            <Area
              name="Ahorro previsto"
              type="monotone"
              dataKey="Ahorro"
              stroke="#528d77"
              fill="url(#green)"
              strokeWidth={3}
            />
            <Area
              name="Capital invertido previsto"
              type="monotone"
              dataKey="Inversión"
              stroke="#b49a70"
              fill="transparent"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }
  function goals() {
    return d.goals.map((g) => {
      const val = balance(d, g.account),
        p = Math.min(100, (val / g.target) * 100);
      return (
        <div className="goal" key={g.id}>
          <div className="section-title">
            <strong>{g.name}</strong>
            {editActions("goal", g)}
          </div>
          <div className="progress">
            <i style={{ width: p + "%" }} />
          </div>
          <div className="spread">
            <span>
              {euro(val)} <small>de {euro(g.target)}</small>
            </span>
            <b>{Math.round(p)}%</b>
          </div>
          <small>Objetivo: {g.date.split("-").reverse().join("/")}</small>
        </div>
      );
    });
  }
  function debtPage(kind: "internal" | "external") {
    const ds = d.debts.filter((x) => x.kind === kind);
    return (
      <>
        <div className="notice">
          <CircleHelp size={18} />
          {kind === "internal"
            ? "Reponer ahorros mueve dinero entre tus cuentas: aumenta el ahorro y reduce esta deuda, sin generar ingresos ni patrimonio. Registrar el origen de una deuda no vuelve a descontar una retirada antigua."
            : "El dinero reservado sigue en tu cuenta. Solo los pagos realizados reducen la deuda. Las reservas no se descuentan dos veces de la previsión."}
        </div>
        <div className="cards two">
          {ds.map((x) => {
            const s = debtState(d, x.id);
            return (
              <section className="panel" key={x.id}>
                <div className="section-title">
                  <div>
                    <span className="eyebrow">
                      {kind === "internal" ? "POR REPONER" : "PRÉSTAMO"}
                    </span>
                    <h3>{x.name}</h3>
                  </div>
                  {editActions("debt", x)}
                </div>
                <h2>
                  {euro(s.pending)} <small>pendiente</small>
                </h2>
                <div className="progress">
                  <i
                    style={{
                      width: Math.min(100, (s.paid / x.original) * 100) + "%",
                    }}
                  />
                </div>
                <div className="spread">
                  <small>
                    {euro(s.paid)} de {euro(x.original)} devueltos
                  </small>
                  <b>{Math.round((s.paid / x.original) * 100)}%</b>
                </div>
                <p className="muted">{x.description}</p>
                <div className="spread">
                  <span>Reservado: {euro(s.reserved)}</span>
                  <span>Cuota: {euro(x.monthly)}</span>
                </div>
                <div className="button-row">
                  <button
                    onClick={() =>
                      setModal({
                        type: "entry",
                        kind: kind === "internal" ? "repayment" : "debt",
                        item: {
                          debt: x.id,
                          amount: Math.min(x.monthly || s.pending, s.pending),
                          concept: "Devolución · " + x.name,
                        },
                      })
                    }
                  >
                    Registrar pago
                  </button>
                  <button
                    className="subtle"
                    onClick={() => {
                      if (!x.monthly) {
                        setError(
                          "Configura primero una cuota mensual mayor que cero.",
                        );
                        return;
                      }
                      const existing = d.entries.filter(
                        (e) => e.debt === x.id && e.status === "planned",
                      );
                      let remaining =
                        s.pending - sum(existing.map((e) => e.amount));
                      if (remaining <= 0) {
                        inform("Toda la deuda ya está planificada.");
                        return;
                      }
                      const count = Math.ceil(remaining / x.monthly);
                      if (count > 600) {
                        setError(
                          "La cuota generaría más de 600 meses. Aumenta la mensualidad.",
                        );
                        return;
                      }
                      if (
                        !confirm(
                          `Se añadirán ${count} cuotas desde ${monthName(month)}. Los pagos existentes se conservarán. ¿Continuar?`,
                        )
                      )
                        return;
                      const es: Entry[] = [];
                      let index = 0;
                      while (remaining > 0) {
                        const m = addMonth(month, index++);
                        if (existing.some((e) => monthOf(e.date) === m))
                          continue;
                        const amount = Math.min(remaining, x.monthly);
                        es.push({
                          id: uid(),
                          concept: "Devolución · " + x.name,
                          amount,
                          date: m + "-25",
                          kind: kind === "internal" ? "repayment" : "debt",
                          status: "planned",
                          category: "Otros",
                          from: daily[0]?.id || "",
                          to:
                            kind === "internal"
                              ? d.accounts.find((a) => a.kind === "savings")
                                  ?.id || ""
                              : "",
                          debt: x.id,
                          reserved: 0,
                        });
                        remaining -= amount;
                      }
                      if (save({ ...d, entries: [...d.entries, ...es] }))
                        inform(
                          "Calendario creado. Puedes editar cada mensualidad.",
                        );
                    }}
                  >
                    Generar calendario
                  </button>
                </div>
                <small>
                  {(() => {
                    const plan = d.entries
                      .filter((e) => e.debt === x.id && e.status === "planned")
                      .sort((a, b) => a.date.localeCompare(b.date));
                    return sum(plan.map((e) => e.amount)) >= s.pending &&
                      plan.length
                      ? "Fin previsto: " +
                          monthName(monthOf(plan[plan.length - 1].date))
                      : "Queda deuda sin planificar";
                  })()}
                </small>
              </section>
            );
          })}
        </div>
        <section className="panel">
          <div className="section-title">
            <h3>Calendario e historial de pagos</h3>
            <button
              className="subtle"
              onClick={() => setModal({ type: "debt", kind })}
            >
              <Plus size={16} />
              Nueva deuda
            </button>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Array.from({ length: 12 }, (_, i) => {
                  const m = addMonth(month, i);
                  const es = d.entries.filter(
                    (e) =>
                      ds.some((x) => x.id === e.debt) && monthOf(e.date) === m,
                  );
                  return {
                    name: monthName(m).split(" ")[0].slice(0, 3),
                    Pagado:
                      sum(
                        es
                          .filter((e) => e.status === "done")
                          .map((e) => e.amount),
                      ) / 100,
                    Reservado:
                      sum(
                        es
                          .filter((e) => e.status === "planned")
                          .map((e) => e.reserved),
                      ) / 100,
                    Pendiente:
                      sum(
                        es
                          .filter((e) => e.status === "planned")
                          .map((e) => e.amount - e.reserved),
                      ) / 100,
                  };
                })}
              >
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => euro(Number(v) * 100)} />
                <Legend />
                <Bar dataKey="Pagado" stackId="debt" fill="#528d77" />
                <Bar dataKey="Reservado" stackId="debt" fill="#cfb578" />
                <Bar dataKey="Pendiente" stackId="debt" fill="#d6dfd2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {entriesTable(
            d.entries.filter((e) => ds.some((x) => x.id === e.debt)),
          )}
        </section>
      </>
    );
  }
  function savingsPage(investment = false) {
    const as = d.accounts.filter(
      (a) => a.kind === (investment ? "investment" : "savings"),
    );
    const ids = as.map((a) => a.id);
    const total = sum(as.map((a) => balance(d, a.id)));
    const future = sum(
      as.map((a) => projected(d, a.id, month.slice(0, 4) + "-12")),
    );
    const plannedRepay = sum(
      d.entries
        .filter(
          (e) =>
            e.kind === "repayment" &&
            e.status === "planned" &&
            e.date <= month.slice(0, 4) + "-12-31" &&
            ids.includes(e.to),
        )
        .map((e) => e.amount),
    );
    const allInternal = t.internal;
    const interests = sum(
      d.entries
        .filter(
          (e) =>
            e.kind === "interest" && e.status === "done" && ids.includes(e.to),
        )
        .map((e) => e.amount),
    );
    return (
      <>
        <div className="cards three">
          {metric(
            investment ? "Capital aportado" : "Ahorro real",
            total,
            investment
              ? "Sin rentabilidad ni valor de mercado"
              : "Incluye los intereses ya abonados",
            true,
          )}
          {metric(
            "Previsto a diciembre",
            future,
            "Según movimientos pendientes registrados",
          )}
          {metric(
            investment
              ? "Aportación prevista del mes"
              : "Futuro si repones toda la deuda",
            investment
              ? byKind("investment", "planned")
              : future + allInternal - plannedRepay,
            investment
              ? "Todavía no forma parte del capital"
              : "Hipótesis de devolución completa antes de fin de año",
          )}
        </div>
        {!investment && (
          <div className="notice">
            <CircleHelp size={18} />
            El saldo inicial de demostración de 21.450,83 € incluye 450,83 € de
            intereses históricos. No se vuelven a sumar. El año de esos
            intereses no se deduce de la captura.
          </div>
        )}
        <section className="panel">
          <div className="section-title">
            <div>
              <h3>
                {investment
                  ? "Tu capital, paso a paso"
                  : "Un ahorro con horizonte"}
              </h3>
              <p>Proyección de los próximos doce meses</p>
            </div>
            <button
              onClick={() =>
                setModal({
                  type: "entry",
                  kind: investment ? "investment" : "saving",
                })
              }
            >
              <Plus size={16} />
              Aportación
            </button>
          </div>
          {projectionChart()}
        </section>
        {!investment && (
          <div className="cards two">
            <section className="panel">
              <div className="section-title">
                <h3>Objetivos de ahorro</h3>
                <button
                  className="icon"
                  aria-label="Nuevo objetivo"
                  onClick={() => setModal({ type: "goal" })}
                >
                  <Plus size={18} />
                </button>
              </div>
              {goals()}
              {!d.goals.length && (
                <p className="muted">
                  Crea un objetivo para dar dirección a tus ahorros.
                </p>
              )}
            </section>
            <section className="panel">
              <div className="section-title">
                <h3>Intereses abonados</h3>
                <button
                  className="subtle"
                  onClick={() => setModal({ type: "entry", kind: "interest" })}
                >
                  Registrar
                </button>
              </div>
              <h2>{euro(interests + (d.demo ? 45083 : 0))}</h2>
              <p className="muted">
                Histórico registrado
                {d.demo
                  ? " + 450,83 € incluidos en el saldo inicial de demostración"
                  : ""}
                .
              </p>
              <div className="spread">
                <span>Este mes</span>
                <b>{euro(byKind("interest", "done"))}</b>
              </div>
              <div className="spread">
                <span>Año {month.slice(0, 4)}</span>
                <b>
                  {euro(
                    sum(
                      d.entries
                        .filter(
                          (e) =>
                            e.kind === "interest" &&
                            e.status === "done" &&
                            e.date.startsWith(month.slice(0, 4)) &&
                            ids.includes(e.to),
                        )
                        .map((e) => e.amount),
                    ),
                  )}
                </b>
              </div>
            </section>
          </div>
        )}
        <section className="panel">
          <h3>Evolución mensual · {month.slice(0, 4)}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Saldo inicial real</th>
                  <th>Previsto aportar</th>
                  <th>Aportado</th>
                  {!investment && (
                    <>
                      <th>Repuesto</th>
                      <th>Intereses</th>
                      <th>Retirado</th>
                    </>
                  )}
                  <th>Saldo real</th>
                  <th>Saldo previsto</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => {
                  const m =
                    month.slice(0, 4) + "-" + String(i + 1).padStart(2, "0");
                  const es = d.entries.filter((e) => monthOf(e.date) === m);
                  const val = (k: Kind, s: string) =>
                    sum(
                      es
                        .filter(
                          (e) =>
                            e.kind === k &&
                            e.status === s &&
                            ids.includes(e.to),
                        )
                        .map((e) => e.amount),
                    );
                  return (
                    <tr key={m}>
                      <td>{monthName(m).split(" ")[0]}</td>
                      <td>
                        {euro(
                          sum(
                            as.map((a) =>
                              balance(d, a.id, addMonth(m, -1) + "-31"),
                            ),
                          ),
                        )}
                      </td>
                      <td>
                        {euro(
                          val(investment ? "investment" : "saving", "planned") +
                            val(investment ? "investment" : "saving", "done"),
                        )}
                      </td>
                      <td>
                        {euro(
                          val(investment ? "investment" : "saving", "done"),
                        )}
                      </td>
                      {!investment && (
                        <>
                          <td>{euro(val("repayment", "done"))}</td>
                          <td>{euro(val("interest", "done"))}</td>
                          <td>
                            {euro(
                              sum(
                                es
                                  .filter(
                                    (e) =>
                                      e.status === "done" &&
                                      ids.includes(e.from),
                                  )
                                  .map((e) => e.amount),
                              ),
                            )}
                          </td>
                        </>
                      )}
                      <td>
                        {euro(sum(as.map((a) => balance(d, a.id, m + "-31"))))}
                      </td>
                      <td>{euro(sum(as.map((a) => projected(d, a.id, m))))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted">
            Los meses anteriores al saldo inicial no tienen histórico. Los
            saldos reales futuros solo incluyen movimientos realizados; no son
            previsiones.
          </p>
        </section>
        <section className="panel">
          <h3>Movimientos · {monthName(month)}</h3>
          {entriesTable(
            monthly.filter((e) => ids.includes(e.from) || ids.includes(e.to)),
          )}
        </section>
      </>
    );
  }
  return (
    <div className={"app " + (dark ? "dark" : "")}>
      <aside className={mobile ? "open" : ""}>
        <a className="brand" onClick={() => setPage("Resumen")}>
          <span className="brand-mark">z</span> zentro
          <span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="avatar">CT</span>
          <div>
            Mi espacio personal<small>Finanzas en equilibrio</small>
          </div>
        </div>
        <span className="nav-label">TU DINERO</span>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={page === name ? "active" : ""}
              onClick={() => {
                setPage(name);
                setMobile(false);
                setFilter("");
              }}
            >
              <Icon size={19} />
              {name}
              {page === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-dot" />
          Solo en este dispositivo
          <small>Sin bancos conectados · Sin nube</small>
          <button className="subtle" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}Modo{" "}
            {dark ? "claro" : "oscuro"}
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            <button
              className="icon mobile-menu"
              aria-label="Abrir menú"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            Mi espacio <span>/</span> <b>{page}</b>
          </div>
          <div className="header-right">
            <span className="local-label">
              <i />
              Guardado local
            </span>
            <span className="avatar small">CT</span>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">TU TRANQUILIDAD EMPIEZA AQUÍ</div>
              <h1>{page === "Resumen" ? "Todo en su sitio." : page}</h1>
              <p>
                {page === "Resumen"
                  ? "Una mirada clara a tu dinero y a lo que viene."
                  : "Organiza hoy. Disfruta de un mañana más tranquilo."}
              </p>
            </div>
            <div className="heading-actions">
              <div className="month-picker">
                <button
                  className="icon"
                  aria-label="Mes anterior"
                  onClick={() => setMonth(addMonth(month, -1))}
                >
                  <ChevronLeft size={17} />
                </button>
                <input
                  aria-label="Mes seleccionado"
                  type="month"
                  value={month}
                  onChange={(e) => e.target.value && setMonth(e.target.value)}
                />
                <button
                  className="icon"
                  aria-label="Mes siguiente"
                  onClick={() => setMonth(addMonth(month, 1))}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
              <button
                className="primary"
                onClick={() =>
                  setModal({
                    type:
                      page === "Cuentas"
                        ? "account"
                        : page.startsWith("Deuda")
                          ? "debt"
                          : "entry",
                    kind: page === "Deuda interna" ? "internal" : "external",
                  })
                }
              >
                <Plus size={17} />
                {page === "Cuentas"
                  ? "Nueva cuenta"
                  : page.startsWith("Deuda")
                    ? "Nueva deuda"
                    : "Movimiento"}
              </button>
            </div>
          </div>
          {d.demo && (
            <div className="demo-banner">
              <span>
                <b>Espacio de demostración</b> · Ejemplos inspirados en tus
                hojas; no representan saldos bancarios verificados.
              </span>
              <button onClick={() => setPage("Configuración")}>
                Gestionar datos <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="error">
              {error}
              <button
                className="icon"
                aria-label="Cerrar aviso"
                onClick={() => setError("")}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {page === "Resumen" && (
            <>
              <div className="cards four">
                {metric(
                  "Disponible en el día a día",
                  t.available,
                  "Cuentas de uso diario + efectivo",
                  true,
                )}
                {metric(
                  "Tus ahorros",
                  t.savings,
                  "Intereses abonados incluidos",
                )}
                {metric(
                  "Capital invertido",
                  t.invested,
                  "Aportaciones, sin plusvalías",
                )}
                {metric(
                  "Patrimonio neto",
                  t.net,
                  "Activos menos deuda externa",
                )}
              </div>
              <div className="dashboard-grid">
                <section className="panel evolution">
                  <div className="section-title">
                    <div>
                      <span className="eyebrow">MIRANDO HACIA DELANTE</span>
                      <h3>Así crece tu futuro</h3>
                    </div>
                    <span className="badge neutral">12 meses · previsión</span>
                  </div>
                  {projectionChart()}
                  <div className="chart-legend">
                    <span>
                      <i /> Ahorros
                    </span>
                    <span>
                      <i className="gold" /> Inversiones
                    </span>
                  </div>
                </section>
                <section className="panel month-summary">
                  <span className="eyebrow">{monthName(month)}</span>
                  <h3>El mes, bajo control</h3>
                  <div className="summary-line">
                    <span>
                      <ArrowDownLeft size={18} />
                      Ingresos pendientes
                    </span>
                    <b>{euro(byKind("income", "planned"))}</b>
                  </div>
                  <div className="summary-line">
                    <span>
                      <ArrowUpRight size={18} />
                      Gastos pendientes
                    </span>
                    <b>{euro(byKind("expense", "planned"))}</b>
                  </div>
                  <div className="summary-line">
                    <span>
                      <CreditCard size={18} />
                      Pagos de deuda
                    </span>
                    <b>{euro(byKind("debt", "planned"))}</b>
                  </div>
                  <div className="summary-line">
                    <span>
                      <Sprout size={18} />
                      Ahorro e inversión
                    </span>
                    <b>
                      {euro(
                        byKind("saving", "planned") +
                          byKind("investment", "planned") +
                          byKind("repayment", "planned"),
                      )}
                    </b>
                  </div>
                  <div className="month-total">
                    <span>Disponible estimado al cierre</span>
                    <h2 className={availableEnd < 0 ? "negative" : ""}>
                      {euro(availableEnd)}
                    </h2>
                    <small>
                      {availableEnd < 0
                        ? "Faltan fondos para cumplir todas las previsiones."
                        : "Después de los movimientos pendientes acumulados."}
                    </small>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => setPage("Planificación")}
                  >
                    Ver mi planificación <ArrowUpRight size={16} />
                  </button>
                </section>
                <section className="panel">
                  <div className="section-title">
                    <h3>Tus cuentas</h3>
                    <button
                      className="text-link"
                      onClick={() => setPage("Cuentas")}
                    >
                      Ver todas <ArrowUpRight size={16} />
                    </button>
                  </div>
                  {d.accounts.map((a) => (
                    <div className="account-row" key={a.id}>
                      <span className={"bank-logo " + a.kind}>
                        {a.bank.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <strong>{a.bank}</strong>
                        <small>{a.name}</small>
                      </div>
                      <b>{euro(balance(d, a.id))}</b>
                    </div>
                  ))}
                </section>
                <section className="panel">
                  <div className="section-title">
                    <h3>Lo que te propones</h3>
                    <Sprout size={20} />
                  </div>
                  {goals()}
                  <div className="debt-mini">
                    <div>
                      <small>Deuda externa pendiente</small>
                      <b>{euro(t.external)}</b>
                    </div>
                    <div>
                      <small>Por reponer a tus ahorros</small>
                      <b>{euro(t.internal)}</b>
                    </div>
                  </div>
                </section>
              </div>
              <section className="panel">
                <div className="section-title">
                  <h3>En tu agenda este mes</h3>
                  <button
                    className="text-link"
                    onClick={() => setPage("Movimientos")}
                  >
                    Ver movimientos <ArrowUpRight size={16} />
                  </button>
                </div>
                {entriesTable(monthly.slice(0, 5))}
              </section>
            </>
          )}
          {page === "Cuentas" && (
            <>
              <div className="cards two">
                {d.accounts.map((a) => (
                  <section className="panel account-card" key={a.id}>
                    <div className="section-title">
                      <span className={"bank-logo " + a.kind}>
                        {a.bank.slice(0, 2).toUpperCase()}
                      </span>
                      {editActions("account", a)}
                    </div>
                    <p>
                      {a.bank} · {purposes[a.kind]}
                    </p>
                    <h3>{a.name}</h3>
                    <h2>{euro(balance(d, a.id))}</h2>
                    <div className="spread">
                      <span>Saldo previsto a {monthName(month)}</span>
                      <b>{euro(projected(d, a.id, month))}</b>
                    </div>
                    <small>
                      Saldo inicial: {euro(a.opening)} · {a.date}
                    </small>
                    <button
                      className="text-link"
                      onClick={() => {
                        setFilter(a.id);
                        setPage("Movimientos");
                      }}
                    >
                      Consultar movimientos <ArrowUpRight size={16} />
                    </button>
                  </section>
                ))}
              </div>
              {!d.accounts.length && (
                <section className="panel empty">
                  Añade tu primera cuenta para empezar.
                </section>
              )}
              <div className="notice">
                <Wallet size={19} />
                El saldo inicial es una fotografía en una fecha. Los movimientos
                realizados desde esa fecha lo actualizan; los previstos solo
                afectan a la proyección. Puedes editar banco y finalidad en cada
                cuenta.
              </div>
            </>
          )}
          {page === "Movimientos" && (
            <section className="panel">
              <div className="section-title">
                <h3>Tu registro mensual</h3>
                <div className="filters">
                  <select
                    aria-label="Filtrar cuenta"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="">Todas las cuentas</option>
                    {d.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bank} · {a.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filtrar estado"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="all">Todos los estados</option>
                    <option value="planned">Previstos</option>
                    <option value="done">Realizados</option>
                  </select>
                </div>
              </div>
              {entriesTable(
                monthly.filter(
                  (e) =>
                    (!filter || e.from === filter || e.to === filter) &&
                    (status === "all" || e.status === status),
                ),
              )}
            </section>
          )}
          {page === "Deuda externa" && debtPage("external")}
          {page === "Deuda interna" && debtPage("internal")}
          {page === "Ahorros" && savingsPage()}
          {page === "Inversiones" && savingsPage(true)}
          {page === "Planificación" && (
            <>
              <div className="cards three">
                {metric(
                  "Ingresos del mes",
                  byKind("income"),
                  "Previstos + realizados",
                )}
                {metric(
                  "Consumo del mes",
                  byKind("expense"),
                  "Excluye transferencias y pagos de deuda",
                )}
                {metric(
                  "Disponible al cierre",
                  availableEnd,
                  "Incluye pendientes anteriores",
                  true,
                )}
              </div>
              <section className="panel">
                <h3>Tu plan frente a la realidad</h3>
                <div className="chart">
                  <ResponsiveContainer>
                    <BarChart
                      data={(
                        [
                          "income",
                          "expense",
                          "debt",
                          "saving",
                          "repayment",
                          "investment",
                        ] as Kind[]
                      ).map((k) => ({
                        name: labels[k],
                        Previsto: byKind(k) / 100,
                        Realizado: byKind(k, "done") / 100,
                      }))}
                    >
                      <CartesianGrid vertical={false} stroke="var(--line)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip formatter={(v) => euro(Number(v) * 100)} />
                      <Legend />
                      <Bar
                        dataKey="Previsto"
                        fill="#c9d8ca"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Realizado"
                        fill="#367461"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Concepto</th>
                        <th>Plan total</th>
                        <th>Realizado</th>
                        <th>Pendiente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          "income",
                          "expense",
                          "debt",
                          "saving",
                          "repayment",
                          "investment",
                          "interest",
                          "transfer",
                          "withdrawal",
                        ] as Kind[]
                      ).map((k) => (
                        <tr key={k}>
                          <td>{labels[k]}</td>
                          <td>{euro(byKind(k))}</td>
                          <td>{euro(byKind(k, "done"))}</td>
                          <td>{euro(byKind(k, "planned"))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted">
                  Plan total = realizado + pendiente. Al corregir un importe, se
                  actualiza el plan. Transferencias y devoluciones internas
                  redistribuyen activos: no son ingresos ni consumo.
                </p>
                {availableEnd < 0 && (
                  <div className="error">
                    Tu previsión supera el disponible en {euro(-availableEnd)}.
                    Ajusta las aportaciones o registra los ingresos que faltan.
                  </div>
                )}
              </section>
            </>
          )}
          {page === "Configuración" && (
            <>
              <section className="panel">
                <h3>Tus datos, bajo tu control</h3>
                <p>
                  Esta versión guarda la información en localStorage de este
                  navegador y dirección. No hay base de datos ni sincronización.
                  Exporta copias periódicas; borrar los datos del navegador
                  elimina esta información.
                </p>
                <div className="button-row">
                  <button onClick={() => exportFile()}>
                    <Download size={17} />
                    Exportar copia JSON
                  </button>
                  <button onClick={() => exportFile(false)}>
                    <Download size={17} />
                    Exportar movimientos CSV
                  </button>
                  <label className="button">
                    <Upload size={17} />
                    Importar JSON
                    <input
                      hidden
                      type="file"
                      accept=".json,application/json"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          if (f.size > 5000000)
                            throw Error("El archivo supera 5 MB.");
                          const value = validateData(
                            JSON.parse(await f.text()),
                          );
                          if (
                            confirm(
                              "La importación reemplazará todos los datos actuales. ¿Continuar?",
                            )
                          )
                            if (save(value))
                              inform("Copia importada correctamente.");
                        } catch (err) {
                          setError((err as Error).message);
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </section>
              <section className="panel">
                <h3>Categorías personalizadas</h3>
                <div className="chips">
                  {d.categories.map((c) => (
                    <span className="badge neutral" key={c}>
                      {c}
                      <button
                        className="icon"
                        aria-label={"Eliminar categoría " + c}
                        onClick={() => {
                          if (
                            confirm(
                              "¿Eliminar esta categoría de las opciones? El historial la conservará.",
                            )
                          )
                            save({
                              ...d,
                              categories: d.categories.filter((x) => x !== c),
                            });
                        }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = e.currentTarget;
                    const val = String(new FormData(f).get("category")).trim();
                    if (val && !d.categories.includes(val))
                      save({ ...d, categories: [...d.categories, val] });
                    f.reset();
                  }}
                >
                  <input
                    name="category"
                    placeholder="Nombre de la categoría"
                    required
                    maxLength={60}
                  />
                  <button>Añadir categoría</button>
                </form>
              </section>
              <section className="panel">
                <h3>Datos de demostración</h3>
                <p>
                  Las capturas sirven como referencia. Los 21.450,83 € de ahorro
                  incluyen 450,83 € de intereses. Reservar 210,80 € para el
                  préstamo no reduce la deuda. Los 500 € mostrados como pagados
                  en la hoja de reposiciones siguen pendientes de conciliación y
                  no se han aplicado.
                </p>
                <div className="button-row">
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "¿Reemplazar todos los datos por la demostración? Exporta primero una copia.",
                        )
                      )
                        save(demo());
                    }}
                  >
                    Restaurar demostración
                  </button>
                  <button
                    className="danger"
                    onClick={() => {
                      if (
                        confirm(
                          "¿Borrar todas las cuentas, deudas, objetivos y movimientos para empezar de cero?",
                        )
                      )
                        save(empty());
                    }}
                  >
                    Borrar todos los datos
                  </button>
                </div>
              </section>
            </>
          )}
          <footer>
            Zentro · Un poco de orden. Mucha tranquilidad.
            <span>Local, personal y tuyo.</span>
          </footer>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {modal && (
        <Editor
          modal={modal}
          d={d}
          month={month}
          onClose={() => setModal(null)}
          onSave={(next) => {
            validateData(next);
            if (save(next)) {
              setModal(null);
              inform("Cambios guardados.");
            }
          }}
        />
      )}
    </div>
  );
}

function Editor({
  modal,
  d,
  month,
  onClose,
  onSave,
}: {
  modal: NonNullable<Modal>;
  d: Data;
  month: string;
  onClose: () => void;
  onSave: (d: Data) => void;
}) {
  const item = modal.item || {};
  const [kind, setKind] = useState<string>(
      item.kind ||
        (modal.type === "entry"
          ? Object.hasOwn(labels, modal.kind || "")
            ? modal.kind
            : "expense"
          : modal.kind) ||
        "daily",
    ),
    [err, setErr] = useState("");
  const field = (
    label: string,
    name: string,
    value: any = "",
    type = "text",
    extra: any = {},
  ) => (
    <label>
      {label}
      <input name={name} type={type} defaultValue={value} required {...extra} />
    </label>
  );
  const accounts = (label: string, name: string, value: string, k?: string) => (
    <label>
      {label}
      <select name={name} defaultValue={value} required>
        <option value="">Selecciona una cuenta</option>
        {d.accounts
          .filter((a) => !k || a.kind === k)
          .map((a) => (
            <option key={a.id} value={a.id}>
              {a.bank} · {a.name}
            </option>
          ))}
      </select>
    </label>
  );
  function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    try {
      const f = new FormData(ev.currentTarget),
        v = (n: string) => String(f.get(n) || ""),
        money = (n: string) => cents(v(n) || "0");
      if (modal.type === "entry") {
        const incoming = ["income", "interest"].includes(kind),
          outgoing = ["expense", "debt"].includes(kind);
        const e: Entry = {
          id: item.id || uid(),
          concept: v("concept").trim(),
          amount: money("amount"),
          date: v("date"),
          kind: kind as Kind,
          status: v("status") as Entry["status"],
          category: v("category"),
          from: incoming ? "" : v("from"),
          to: outgoing ? "" : v("to"),
          debt: ["repayment", "debt"].includes(kind) ? v("debt") : "",
          reserved:
            v("status") === "planned" && kind === "debt"
              ? money("reserved")
              : 0,
          series: item.series,
        };
        validateEntry(d, e);
        const count = item.id ? 1 : Number(v("repeat") || 1);
        let entries = d.entries.filter((x) => x.id !== e.id);
        for (let i = 0; i < count; i++) {
          const m = addMonth(monthOf(e.date), i),
            last = new Date(
              Number(m.slice(0, 4)),
              Number(m.slice(5)),
              0,
            ).getDate();
          const next = {
            ...e,
            id: i ? uid() : e.id,
            date:
              m +
              "-" +
              String(Math.min(Number(e.date.slice(8)), last)).padStart(2, "0"),
            status: i ? ("planned" as const) : e.status,
            series: count > 1 ? e.id : e.series,
          };
          validateEntry({ ...d, entries }, next);
          entries.push(next);
        }
        onSave({ ...d, entries });
      } else if (modal.type === "account") {
        const a: Account = {
          id: item.id || uid(),
          name: v("name").trim(),
          bank: v("bank").trim(),
          kind: kind as Account["kind"],
          opening: money("opening"),
          date: v("date"),
        };
        if (!a.name || !a.bank) throw Error("Completa el nombre y el banco.");
        onSave({
          ...d,
          accounts: [...d.accounts.filter((x) => x.id !== a.id), a],
        });
      } else if (modal.type === "debt") {
        const x: Debt = {
          id: item.id || uid(),
          name: v("name").trim(),
          kind: kind as Debt["kind"],
          original: money("original"),
          initialPaid: money("initialPaid"),
          date: v("date"),
          description: v("description"),
          monthly: money("monthly"),
        };
        if (
          x.original <= 0 ||
          x.initialPaid < 0 ||
          x.initialPaid > x.original ||
          x.monthly < 0
        )
          throw Error("Revisa el importe original, el pagado y la cuota.");
        const months = Number(v("months"));
        if (months > 0)
          x.monthly = Math.ceil(
            (x.original -
              x.initialPaid -
              sum(
                d.entries
                  .filter((e) => e.debt === x.id && e.status === "done")
                  .map((e) => e.amount),
              )) /
              months,
          );
        onSave({ ...d, debts: [...d.debts.filter((a) => a.id !== x.id), x] });
      } else {
        const g = {
          id: item.id || uid(),
          name: v("name").trim(),
          target: money("target"),
          account: v("account"),
          date: v("date"),
        };
        if (g.target <= 0) throw Error("El objetivo debe ser positivo.");
        onSave({ ...d, goals: [...d.goals.filter((x) => x.id !== g.id), g] });
      }
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const els = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>(
                "button,input:not([hidden]),select,textarea",
              ),
            ).filter((x) => !x.hasAttribute("disabled"));
            const first = els[0],
              last = els[els.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="section-title">
          <h3 id="modal-title">
            {item.id ? "Editar" : "Nuevo"}{" "}
            {
              {
                entry: "movimiento",
                account: "cuenta",
                debt: "registro de deuda",
                goal: "objetivo",
              }[modal.type]
            }
          </h3>
          <button
            autoFocus
            className="icon"
            aria-label="Cerrar formulario"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          {err && (
            <div className="error" role="alert">
              {err}
            </div>
          )}
          <div className="form-grid">
            {modal.type === "entry" ? (
              <>
                <label className="full">
                  Tipo de movimiento
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    {Object.entries(labels).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                {field("Concepto", "concept", item.concept || "")}
                {field(
                  "Importe (€)",
                  "amount",
                  item.amount != null ? item.amount / 100 : "",
                  "text",
                  { inputMode: "decimal" },
                )}
                {field("Fecha", "date", item.date || month + "-15", "date")}
                <label>
                  Estado
                  <select name="status" defaultValue={item.status || "planned"}>
                    <option value="planned">Previsto</option>
                    <option value="done">Realizado</option>
                  </select>
                </label>
                {!["income", "interest"].includes(kind) &&
                  accounts(
                    "Cuenta de origen",
                    "from",
                    item.from ||
                      d.accounts.find((a) => a.kind === "daily")?.id ||
                      "",
                    kind === "withdrawal" ? "savings" : undefined,
                  )}
                {!["expense", "debt"].includes(kind) &&
                  accounts(
                    "Cuenta de destino",
                    "to",
                    item.to ||
                      d.accounts.find(
                        (a) =>
                          a.kind ===
                          (kind === "investment" ? "investment" : "savings"),
                      )?.id ||
                      "",
                    ["saving", "repayment", "interest"].includes(kind)
                      ? "savings"
                      : kind === "investment"
                        ? "investment"
                        : undefined,
                  )}
                <label>
                  Categoría
                  <select
                    name="category"
                    defaultValue={item.category || d.categories[0] || "Otros"}
                  >
                    {[
                      ...new Set([...d.categories, item.category || "Otros"]),
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                {["debt", "repayment"].includes(kind) && (
                  <label>
                    Deuda relacionada
                    <select name="debt" defaultValue={item.debt || ""} required>
                      <option value="">Selecciona deuda</option>
                      {d.debts
                        .filter(
                          (x) =>
                            x.kind ===
                            (kind === "debt" ? "external" : "internal"),
                        )
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                {kind === "debt" &&
                  field(
                    "Dinero reservado (€)",
                    "reserved",
                    (item.reserved || 0) / 100,
                    "text",
                    { inputMode: "decimal" },
                  )}
                {!item.id && (
                  <label>
                    Repetición
                    <select name="repeat">
                      <option value="1">Solo una vez</option>
                      <option value="3">Mensual · 3 meses</option>
                      <option value="6">Mensual · 6 meses</option>
                      <option value="12">Mensual · 12 meses</option>
                    </select>
                  </label>
                )}
                <p className="form-note full">
                  Realizar un movimiento modifica los saldos. Las repeticiones
                  futuras se crean como previstas y cada una se puede editar por
                  separado.
                </p>
              </>
            ) : modal.type === "account" ? (
              <>
                {field("Entidad bancaria", "bank", item.bank || "")}
                {field("Nombre de la cuenta", "name", item.name || "")}
                <label>
                  Finalidad
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    {Object.entries(purposes).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                {field(
                  "Saldo inicial (€)",
                  "opening",
                  (item.opening || 0) / 100,
                  "text",
                  { inputMode: "decimal" },
                )}
                {field(
                  "Fecha del saldo inicial",
                  "date",
                  item.date || month + "-01",
                  "date",
                )}
                <p className="form-note full">
                  Introduce el saldo antes de los movimientos de esta fecha. Los
                  intereses anteriores ya incluidos en este saldo no se deben
                  registrar de nuevo.
                </p>
              </>
            ) : modal.type === "debt" ? (
              <>
                {field("Nombre", "name", item.name || "")}
                <label>
                  Tipo
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="external">Externa</option>
                    <option value="internal">Con mis ahorros</option>
                  </select>
                </label>
                {field(
                  "Importe original (€)",
                  "original",
                  (item.original || 0) / 100,
                )}
                {field(
                  "Pagado antes del registro (€)",
                  "initialPaid",
                  (item.initialPaid || 0) / 100,
                )}
                {field(
                  "Fecha de origen",
                  "date",
                  item.date || month + "-01",
                  "date",
                )}
                {field(
                  "Cuota mensual (€)",
                  "monthly",
                  (item.monthly || 0) / 100,
                )}
                {field(
                  "O calcular cuota para estos meses",
                  "months",
                  "",
                  "number",
                  { required: false, min: 1, max: 600 },
                )}
                {field(
                  "Descripción",
                  "description",
                  item.description || "",
                  "text",
                  { required: false },
                )}
                <p className="form-note full">
                  El pago anterior es histórico, ya incluido en tus saldos
                  iniciales. Esta ficha no mueve dinero. Para una retirada
                  nueva, registra también el movimiento entre cuentas o el gasto
                  desde ahorros.
                </p>
              </>
            ) : (
              <>
                {field("Nombre del objetivo", "name", item.name || "")}
                {field(
                  "Importe objetivo (€)",
                  "target",
                  item.target ? item.target / 100 : "",
                )}
                {accounts(
                  "Cuenta de ahorro",
                  "account",
                  item.account || "",
                  "savings",
                )}
                {field(
                  "Fecha objetivo",
                  "date",
                  item.date || month.slice(0, 4) + "-12-31",
                  "date",
                )}
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="subtle" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary" type="submit">
              Guardar cambios
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
