import { Fragment, memo, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  Sprout,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  X,
  Menu,
  Sun,
  Moon,
  Settings,
  Download,
  Check,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  cashTotals,
  wealthTotals,
  debtTotals,
  debtItemPaid,
  monthSeries,
  setMonthlyActual,
  withdrawSavings,
  editDebtItem,
  deleteDebtItem,
  repayDebt,
  validateProfile,
  cents,
  euro,
  monthName,
  sum,
  uid,
  today,
  currentMonth,
  type Profile,
  type CashRow,
} from "./model";
import { saveData } from "./profileStorage";
const pages = ["Mi espacio", "Día a día", "Ahorros", "Inversión"] as const;
type Page = (typeof pages)[number];
type Modal = {
  type:
    | "cash"
    | "balance"
    | "cashBalance"
    | "possibleExpense"
    | "month"
    | "interestBalance"
    | "withdraw"
    | "editDebt"
    | "deleteDebt"
    | "repay"
    | "schedule"
    | "settings";
  kind?: "expenses" | "incomes" | "savings" | "investment";
  item?: any;
} | null;
const Chart = memo(function Chart({
  profile,
  kind,
  year,
  view,
  showGoal = false,
}: {
  profile: Profile;
  kind: "savings" | "investment";
  year: string;
  view: string;
  showGoal?: boolean;
}) {
  const series = monthSeries(profile, kind);
  const last = series.filter((r) => r.accumulated !== null).at(-1);
  const hasForecast = series.some((r) => r.projected !== null);
  const data = series
    .filter((r) => year === "all" || r.month.startsWith(year))
    .map((r) => ({
      month: r.month,
      goal:
        view === "Mensual"
          ? r.goal === null
            ? null
            : r.goal / 100
          : r.accumulatedGoal === null
            ? null
            : r.accumulatedGoal / 100,
      real:
        view === "Mensual"
          ? r.real === null
            ? null
            : r.real / 100
          : r.accumulated === null
            ? null
            : r.accumulated / 100,
      forecast:
        view === "Mensual"
          ? r.planned === null
            ? null
            : r.planned / 100
          : r.projected !== null
            ? r.projected / 100
            : hasForecast && r.month === last?.month
              ? last.accumulated! / 100
              : null,
    }));
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="var(--line)" />
      <XAxis
        dataKey="month"
        tickFormatter={(v: string) => `${v.slice(5)}/${v.slice(2, 4)}`}
        minTickGap={30}
      />
      <YAxis tickFormatter={(v) => `${v / 1000}k €`} />
      <Tooltip
        labelFormatter={(v) => monthName(String(v))}
        formatter={(v) => euro(Math.round(Number(v) * 100))}
      />
      <Legend />
    </>
  );
  if (!series.some((r) => r.real !== null || (r.planned ?? 0) > 0))
    return (
      <p className="empty">
        Tu gráfica aparecerá cuando registres aportaciones o definas el plan
        mensual.
      </p>
    );
  return (
    <div
      className="chart account-history-chart"
      key={`${kind}-${year}-${view}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        {view === "Mensual" ? (
          <ComposedChart data={data}>
            {axes}
            <Bar
              name="Registrado"
              dataKey="real"
              fill="var(--chart-primary)"
              isAnimationActive={false}
            />
            <Bar
              name="Previsto"
              dataKey="forecast"
              fill="var(--chart-secondary)"
              isAnimationActive={false}
            />
            {showGoal && (
              <Line
                name="Objetivo ideal"
                dataKey="goal"
                stroke="var(--chart-goal, #d97706)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        ) : (
          <LineChart data={data}>
            {axes}
            <Line
              name="Registrado"
              dataKey="real"
              stroke="var(--chart-primary)"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              name="Previsto"
              dataKey="forecast"
              stroke="var(--chart-secondary)"
              strokeWidth={3}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
            {showGoal && (
              <Line
                name="Objetivo ideal"
                dataKey="goal"
                stroke="var(--chart-goal, #d97706)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
});
export default function Dashboard({ initialData }: { initialData: Profile }) {
  const [data, setData] = useState(initialData);
  const [page, setCurrentPage] = useState<Page>(() => {
    const value = new URLSearchParams(location.hash.slice(1)).get("pagina");
    return pages.includes(value as Page) ? (value as Page) : "Mi espacio";
  });
  const [savingsTab, setSavingsTab] = useState("Historial");
  const [year, setYear] = useState(() => currentMonth().slice(0, 4));
  const [view, setView] = useState("Acumulado");
  const [tableOrder, setTableOrder] = useState("desc");
  const [editingHistory, setEditingHistory] = useState(false);
  const [editingDebt, setEditingDebt] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [editingCash, setEditingCash] = useState({
    expenses: false,
    incomes: false,
  });
  const [editingPossible, setEditingPossible] = useState(false);
  const [monthSelection, setMonthSelection] = useState(currentMonth());
  const [dailyMonth, setDailyMonth] = useState(currentMonth());
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem("zentro.theme") === "dark",
  );
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const { wealth, daily, debt, savingsSeries, investmentSeries } = useMemo(
    () => ({
      wealth: wealthTotals(data),
      daily: cashTotals(data),
      debt: debtTotals(data),
      savingsSeries: monthSeries(data, "savings"),
      investmentSeries: monthSeries(data, "investment"),
    }),
    [data],
  );
  const selectedMonthly =
    modal?.type === "month"
      ? data[modal.kind as "savings" | "investment"].find(
          (row) => row.month === monthSelection,
        )
      : undefined;
  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        new Date(2000, index, 1).toLocaleDateString("es-ES", { month: "long" }),
      ),
    [],
  );
  const selectableYears = [
    ...new Set(
      [...data.savings, ...data.investment]
        .map((row) => row.month.slice(0, 4))
        .concat(
          Array.from({ length: 11 }, (_, index) =>
            String(Number(currentMonth().slice(0, 4)) - 5 + index),
          ),
          data.plan.horizon.slice(0, 4),
          monthSelection.slice(0, 4),
        ),
    ),
  ].sort((a, b) => b.localeCompare(a));
  function navigate(next: Page) {
    setCurrentPage(next);
    if (next === "Día a día") setDailyMonth(currentMonth());
    setYear(currentMonth().slice(0, 4));
    setMobile(false);
    history.replaceState(null, "", `#pagina=${encodeURIComponent(next)}`);
  }
  function open(next: NonNullable<Modal>) {
    setFormError("");
    if (next.type === "month")
      setMonthSelection(next.item?.month || currentMonth());
    setModal(next);
  }
  function save(next: Profile) {
    try {
      validateProfile(next);
      setError("");
      saveData(next, setError);
      setData(next);
      return true;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Revisa los datos.");
      return false;
    }
  }
  function removeCash(kind: "expenses" | "incomes", id: string) {
    if (
      confirm(
        "¿Eliminar este registro? Se recalculará el saldo y la previsión.",
      )
    )
      save({
        ...data,
        daily: {
          ...data.daily,
          [kind]: data.daily[kind].filter((r) => r.id !== id),
        },
      });
  }
  function exportBackup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `zentro-${today()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const next = validateProfile(JSON.parse(await file.text()));
      if (confirm("¿Sustituir tus datos por esta copia?")) save(next);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Copia no válida.");
    }
    event.target.value = "";
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    try {
      const f = new FormData(event.currentTarget);
      const text = (key: string) => String(f.get(key) || "").trim();
      const money = (key: string) => cents(text(key) || "0");
      const nullable = (key: string) => (text(key) ? money(key) : null);
      let next = structuredClone(data);
      if (modal.type === "cash") {
        const kind = modal.kind as "expenses" | "incomes",
          old = modal.item as CashRow | undefined;
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
      } else if (modal.type === "cashBalance") {
        next.cash = money("amount");
      } else if (modal.type === "possibleExpense") {
        const amount = money("amount");
        if (amount <= 0) throw Error("Introduce un importe positivo.");
        next.possibleExpenses = [
          ...(next.possibleExpenses ?? []).filter(
            (r) => r.id !== modal.item?.id,
          ),
          { id: modal.item?.id ?? uid(), concept: text("concept"), amount },
        ];
      } else if (modal.type === "balance") {
        next.daily.opening = money("amount");
        next.daily.asOf = today();
        for (const row of [...next.daily.expenses, ...next.daily.incomes])
          if (row.status === "done") row.includedInOpening = true;
      } else if (modal.type === "month") {
        const kind = modal.kind as "savings" | "investment",
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
          ...next.internalDebt.schedule.filter(
            (r) => r.month !== text("month"),
          ),
          { month: text("month"), amount: money("amount") },
        ];
      else if (modal.type === "settings") {
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
      if (save(next)) setModal(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Revisa los importes.");
    }
  }
  const metric = (
    label: string,
    amount: number,
    note: string,
    accent = false,
    action?: { label: string; onClick: () => void },
  ) => (
    <div className={`metric ${accent ? "accent" : ""}`}>
      <span>{label}</span>
      <h2>{euro(amount)}</h2>
      <small>{note}</small>
      {action && (
        <button className="metric-action" onClick={action.onClick}>
          <Pencil size={13} />
          {action.label}
        </button>
      )}
    </div>
  );
  function cashTable(kind: "expenses" | "incomes") {
    const rows = data.daily[kind].filter((r) => r.month === dailyMonth);
    const expense = kind === "expenses";
    const editing = editingCash[kind];
    return (
      <section className="panel cash-panel">
        <div className="section-title">
          <div>
            <h3>{expense ? "Gastos" : "Ingresos"}</h3>
            <p>
              Total del mes: <b>{euro(sum(rows.map((r) => r.amount)))}</b>
            </p>
          </div>
          <div className="history-actions">
            <button
              className={`history-edit-toggle${editing ? " active" : ""}`}
              aria-label={
                editing
                  ? `Terminar edición de ${expense ? "gastos" : "ingresos"}`
                  : `Editar ${expense ? "gastos" : "ingresos"}`
              }
              aria-pressed={editing}
              onClick={() =>
                setEditingCash({ ...editingCash, [kind]: !editing })
              }
            >
              {editing ? <Check size={16} /> : <Pencil size={16} />}
              {editing ? "Terminar edición" : "Editar"}
            </button>
            <button
              className="history-edit-toggle"
              onClick={() => open({ type: "cash", kind })}
            >
              <Plus size={16} />
              {expense ? "Añadir gasto" : "Añadir ingreso"}
            </button>
          </div>
        </div>
        {editing && (
          <p className="history-edit-note">
            Selecciona un concepto para editarlo.
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Importe</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {editing ? (
                      <button
                        className="history-month-edit"
                        aria-label={`Editar ${row.concept}`}
                        onClick={() => open({ type: "cash", kind, item: row })}
                      >
                        {row.concept}
                      </button>
                    ) : (
                      row.concept
                    )}
                    {row.includedInOpening && (
                      <small>Ya incluido en el saldo indicado</small>
                    )}
                  </td>
                  <td>{euro(row.amount)}</td>
                  <td>
                    <span
                      className={`badge ${row.status === "done" ? "green" : "amber"}`}
                    >
                      {row.status === "done" ? "Realizado" : "Previsto"}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      {row.status === "planned" && (
                        <button
                          className="icon"
                          aria-label={`Realizar ${row.concept}`}
                          onClick={() =>
                            save({
                              ...data,
                              daily: {
                                ...data.daily,
                                [kind]: data.daily[kind].map((r) =>
                                  r.id === row.id
                                    ? { ...r, status: "done" }
                                    : r,
                                ),
                              },
                            })
                          }
                        >
                          <Check size={15} />
                        </button>
                      )}
                      {editing && (
                        <button
                          className="icon danger"
                          aria-label={`Eliminar ${row.concept}`}
                          onClick={() => removeCash(kind, row.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="empty">
            Todavía no hay {expense ? "gastos" : "ingresos"} registrados para
            este mes.
          </p>
        )}
      </section>
    );
  }
  function historyPage(kind: "savings" | "investment") {
    const saving = kind === "savings",
      rows = kind === "savings" ? savingsSeries : investmentSeries,
      filtered = rows
        .filter((r) => year === "all" || r.month.startsWith(year))
        .sort((a, b) =>
          tableOrder === "asc"
            ? a.month.localeCompare(b.month)
            : b.month.localeCompare(a.month),
        );
    const closingMonth = rows
      .filter(
        (r) =>
          (year === "all" || r.month.startsWith(year)) &&
          (r.projected !== null || r.accumulated !== null),
      )
      .at(-1);
    const future = closingMonth?.projected ?? closingMonth?.accumulated ?? 0;
    return (
      <>
        <div className={saving ? "cards two savings-secondary" : "cards three"}>
          {!saving &&
            metric(
              "Capital aportado",
              wealth.invested,
              "Historial registrado, sin previsiones",
              true,
            )}
          {metric(
            "Aportación mensual",
            saving ? data.plan.saving : data.plan.investment,
            "Aportación base del plan",
          )}
          {metric(
            "Acumulado previsto",
            future,
            closingMonth
              ? `Hasta ${monthName(closingMonth.month)}`
              : "Sin importes registrados en este período",
          )}
        </div>
        <section className="panel">
          <div className="section-title">
            <div>
              <h3>
                {saving
                  ? "Evolución del ahorro por trabajo"
                  : "Evolución de la inversión"}
              </h3>
              <p>
                {saving
                  ? "Aportaciones netas y reposiciones; los intereses se muestran por separado"
                  : "Capital aportado; no incluye rentabilidad variable"}
              </p>
            </div>
          </div>
          <div className="section-title account-history-toolbar">
            <div
              className="account-detail-tabs"
              role="tablist"
              aria-label="Gráfica"
            >
              {["Acumulado", "Mensual"].map((label) => (
                <button
                  role="tab"
                  aria-selected={view === label}
                  className={view === label ? "active" : ""}
                  key={label}
                  onClick={() => setView(label)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label>
              Año del historial
              <select
                aria-label="Año del historial"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="all">Todos los años</option>
                {[
                  ...new Set([
                    currentMonth().slice(0, 4),
                    ...rows.map((r) => r.month.slice(0, 4)),
                  ]),
                ]
                  .sort((a, b) => b.localeCompare(a))
                  .map((y) => (
                    <option key={y}>{y}</option>
                  ))}
              </select>
            </label>
          </div>
          <Chart
            profile={data}
            kind={kind}
            year={year}
            view={view}
            showGoal={saving}
          />
          {saving && (
            <p className="chart-comparison-note">
              El objetivo ideal sigue la aportación base de cada mes. El ahorro
              real incluye retiradas y reposiciones; los intereses se muestran
              por separado.
            </p>
          )}
        </section>
        <section
          className={`panel history-panel${editingHistory ? " is-editing" : ""}`}
        >
          <div className="section-title">
            <div>
              <h3>Historial mensual</h3>
              <p>Aportaciones registradas y previsiones, mes a mes</p>
            </div>
            <div className="history-actions">
              <button
                className="history-edit-toggle history-sort"
                aria-label="Cambiar orden del historial"
                title={
                  tableOrder === "desc"
                    ? "Mostrar primero los meses más antiguos"
                    : "Mostrar primero los meses más recientes"
                }
                onClick={() =>
                  setTableOrder(tableOrder === "desc" ? "asc" : "desc")
                }
              >
                <ArrowUpDown size={16} />
                {tableOrder === "desc"
                  ? "Recientes primero"
                  : "Antiguos primero"}
              </button>
              <button
                className={`history-edit-toggle${editingHistory ? " active" : ""}`}
                aria-pressed={editingHistory}
                onClick={() => setEditingHistory(!editingHistory)}
              >
                {editingHistory ? <Check size={16} /> : <Pencil size={16} />}
                {editingHistory ? "Terminar edición" : "Editar historial"}
              </button>
              <button
                className="history-edit-toggle history-add"
                title="Registrar una aportación en un mes"
                onClick={() => open({ type: "month", kind })}
              >
                <Plus size={16} />
                Añadir mes
              </button>
            </div>
          </div>
          {editingHistory && (
            <p className="history-edit-note">
              Selecciona un mes para editar sus datos.
            </p>
          )}
          <div className="table-wrap">
            <table className="monthly-history">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Objetivo base</th>
                  <th>{saving ? "Ahorrado neto" : "Invertido"}</th>
                  <th>Previsto</th>
                  <th>Acumulado</th>
                  <th>Acumulado previsto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => (
                  <Fragment key={row.month}>
                    {(index === 0 ||
                      filtered[index - 1].month.slice(0, 4) !==
                        row.month.slice(0, 4)) && (
                      <tr className="history-year">
                        <th scope="rowgroup" colSpan={6}>
                          <span className="history-year-label">
                            {row.month.slice(0, 4)}
                          </span>
                          <span className="history-year-count">
                            {
                              filtered.filter((item) =>
                                item.month.startsWith(row.month.slice(0, 4)),
                              ).length
                            }{" "}
                            meses
                          </span>
                        </th>
                      </tr>
                    )}
                    <tr
                      className={
                        row.real === null
                          ? "history-forecast-row"
                          : "history-recorded-row"
                      }
                    >
                      <td>
                        <span className="history-month-cell">
                          <span
                            className={`history-status-dot${row.real === null ? " forecast" : ""}`}
                            title={
                              row.real === null ? "Previsión" : "Registrado"
                            }
                          />
                          {editingHistory ? (
                            <button
                              className="history-month-edit"
                              aria-label={`Editar ${row.month}`}
                              onClick={() =>
                                open({ type: "month", kind, item: row })
                              }
                            >
                              {monthName(row.month).replace(/ de \d{4}$/, "")}
                            </button>
                          ) : (
                            monthName(row.month).replace(/ de \d{4}$/, "")
                          )}
                        </span>
                      </td>
                      <td>{row.goal === null ? "—" : euro(row.goal)}</td>
                      <td
                        className={`history-actual${row.real !== null && row.real < 0 ? " negative" : ""}`}
                      >
                        {row.real === null ? "—" : euro(row.real)}
                      </td>
                      <td className="history-forecast-value">
                        {row.planned === null ? "—" : euro(row.planned)}
                        {row.plannedRepayment > 0 && (
                          <small>
                            Incluye {euro(row.plannedRepayment)} de reposición
                          </small>
                        )}
                      </td>
                      <td className="history-total">
                        {row.accumulated === null ? "—" : euro(row.accumulated)}
                      </td>
                      <td className="history-forecast-value history-projected-total">
                        {row.projected === null ? "—" : euro(row.projected)}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <small className="history-footnote">
            Vacío significa sin registrar. Los ceros y negativos se conservan.
            Las previsiones se recalculan con la deuda pendiente y nunca cuentan
            como dinero ahorrado.
          </small>
        </section>
      </>
    );
  }
  function debtPage() {
    const plan = savingsSeries.filter(
      (r) =>
        r.plannedRepayment > 0 ||
        (r.month >= data.plan.start &&
          r.month <= data.plan.horizon &&
          data.internalDebt.schedule.some((item) => item.month === r.month)),
    );
    return (
      <>
        <div className="cards two savings-secondary">
          {metric(
            "Deuda interna pendiente",
            debt.pending,
            "Ahorro retirado que falta por reponer",
            true,
          )}
          {metric(
            "Reposición mensual",
            data.plan.repayment,
            "Además de la aportación base, hasta saldar la deuda",
          )}
        </div>
        <div className="debt-actions">
          <button
            className="debt-action"
            aria-label="Añadir deuda"
            onClick={() => open({ type: "withdraw" })}
          >
            <ArrowUpRight size={20} />
            <span>
              <strong>Añadir deuda</strong>
              <small>Sube la deuda · Baja el ahorro del mes</small>
            </span>
          </button>
          <button
            className="debt-action repay"
            aria-label="Devolver deuda"
            disabled={debt.pending === 0}
            onClick={() => open({ type: "repay" })}
          >
            <ArrowDownLeft size={20} />
            <span>
              <strong>Devolver deuda</strong>
              <small>Baja la deuda · Sube el ahorro del mes</small>
            </span>
          </button>
        </div>
        <section className="panel debt-table-panel">
          <div className="section-title table-heading">
            <div>
              <span className="table-eyebrow">TU AHORRO, DE VUELTA</span>
              <h3>Por reponer</h3>
              <p>Gestiona tus retiradas y sigue lo que llevas repuesto.</p>
            </div>
            <div className="history-actions">
              <span className="table-count">
                {data.internalDebt.items.length}{" "}
                {data.internalDebt.items.length === 1
                  ? "concepto"
                  : "conceptos"}
              </span>
              <button
                className={`history-edit-toggle${editingDebt ? " active" : ""}`}
                aria-label={
                  editingDebt ? "Terminar edición de deuda" : "Editar deuda"
                }
                aria-pressed={editingDebt}
                disabled={!data.internalDebt.items.length}
                onClick={() => setEditingDebt(!editingDebt)}
              >
                {editingDebt ? <Check size={16} /> : <Pencil size={16} />}
                {editingDebt ? "Terminar edición" : "Editar"}
              </button>
            </div>
          </div>
          {editingDebt && (
            <p className="history-edit-note">
              Selecciona un concepto para editarlo. También puedes borrar una
              deuda.
            </p>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Retirado</th>
                  <th>Repuesto</th>
                  <th>Pendiente</th>
                  {editingDebt && <th className="right">Borrar</th>}
                </tr>
              </thead>
              <tbody>
                {data.internalDebt.items.map((item) => {
                  const paid = debtItemPaid(data, item.id);
                  return (
                    <tr key={item.id}>
                      <td>
                        {editingDebt ? (
                          <button
                            className="history-month-edit"
                            aria-label={`Editar ${item.concept}`}
                            onClick={() => open({ type: "editDebt", item })}
                          >
                            {item.concept}
                          </button>
                        ) : (
                          <strong>{item.concept}</strong>
                        )}
                        <small>
                          {item.date.split("-").reverse().join("/")} ·{" "}
                          {item.source === "work"
                            ? "Ahorro por trabajo"
                            : "Intereses"}
                        </small>
                      </td>
                      <td className="amount">{euro(item.amount)}</td>
                      <td className="repaid-value">
                        {euro(paid)}
                        <div
                          className="repayment-progress"
                          role="progressbar"
                          aria-label={`Reposición de ${item.concept}`}
                          aria-valuenow={Math.round((paid / item.amount) * 100)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span
                            style={{ width: `${(paid / item.amount) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td>
                        <span
                          className={`amount-pill ${item.amount > paid ? "pending" : "settled"}`}
                        >
                          {item.amount > paid
                            ? euro(item.amount - paid)
                            : "Saldado"}
                        </span>
                      </td>
                      {editingDebt && (
                        <td>
                          <div className="table-row-actions">
                            <button
                              className="table-action delete"
                              aria-label={`Borrar ${item.concept}`}
                              onClick={() => open({ type: "deleteDebt", item })}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!data.internalDebt.items.length && (
            <p className="empty">No hay deuda interna.</p>
          )}
        </section>
        <section className="panel distribution-panel">
          <div className="section-title table-heading">
            <div>
              <span className="table-eyebrow">PASO A PASO</span>
              <h3>Distribución de las reposiciones</h3>
              <p>Ajusta cuánto reponer cada mes a tu ritmo.</p>
            </div>
            <div className="history-actions">
              <span className="table-count">
                {plan.length}{" "}
                {plan.length === 1 ? "mes previsto" : "meses previstos"}
              </span>
              <button
                className={`history-edit-toggle${editingSchedule ? " active" : ""}`}
                aria-label={
                  editingSchedule
                    ? "Terminar edición de distribución"
                    : "Editar distribución"
                }
                aria-pressed={editingSchedule}
                disabled={!plan.length}
                onClick={() => setEditingSchedule(!editingSchedule)}
              >
                {editingSchedule ? <Check size={16} /> : <Pencil size={16} />}
                {editingSchedule ? "Terminar edición" : "Editar"}
              </button>
            </div>
          </div>
          {editingSchedule && (
            <p className="history-edit-note">
              Selecciona un mes para ajustar su reposición prevista.
            </p>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Ahorro base</th>
                  <th>Reposición</th>
                  <th>Total previsto</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((row) => (
                  <tr key={row.month}>
                    <td>
                      <span className="distribution-month">
                        <span className="month-marker">
                          {row.month.slice(5)}
                        </span>
                        {editingSchedule ? (
                          <button
                            className="history-month-edit"
                            aria-label={`Editar distribución ${row.month}`}
                            onClick={() =>
                              open({
                                type: "schedule",
                                item: {
                                  month: row.month,
                                  amount: row.plannedRepayment,
                                },
                              })
                            }
                          >
                            {monthName(row.month)}
                          </button>
                        ) : (
                          monthName(row.month)
                        )}
                      </span>
                    </td>
                    <td>{euro(row.plannedBase ?? 0)}</td>
                    <td>
                      <span className="amount-pill scheduled">
                        +{euro(row.plannedRepayment)}
                      </span>
                    </td>
                    <td className="forecast-total">{euro(row.planned ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!plan.length && (
            <p className="empty">No hay reposiciones futuras pendientes.</p>
          )}
        </section>
      </>
    );
  }
  const modalTitles = {
    cash: modal?.kind === "expenses" ? "Gasto" : "Ingreso",
    balance: "Saldo actual de ING",
    cashBalance: "Actualizar efectivo",
    possibleExpense: "Posible gasto",
    month: "Registro mensual",
    interestBalance: "Actualizar intereses",
    withdraw: "Añadir deuda interna",
    editDebt: "Editar deuda interna",
    deleteDebt: "Borrar deuda interna",
    repay: "Devolver deuda interna",
    schedule: "Distribución mensual",
    settings: "Plan y copias de seguridad",
  };
  const field = (
    label: string,
    name: string,
    value: any = "",
    type = "text",
    required = true,
  ) => (
    <label>
      {label}
      <input
        required={required}
        name={name}
        type={type}
        defaultValue={value}
        inputMode={type === "text" ? "decimal" : undefined}
      />
    </label>
  );
  return (
    <div
      className={`app ${dark ? "dark" : ""} ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      <aside className={mobile ? "open" : ""}>
        <a className="brand" onClick={() => navigate("Mi espacio")}>
          <span className="brand-mark">z</span>
          <span className="brand-name">
            zentro<span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="Navegación principal">
          {pages.map((label, index) => {
            const Icon = [LayoutDashboard, Wallet, Sprout, TrendingUp][index];
            return (
              <button
                key={label}
                aria-label={label}
                aria-current={page === label ? "page" : undefined}
                title={collapsed ? label : undefined}
                className={page === label ? "active" : ""}
                onClick={() => navigate(label)}
              >
                <Icon size={18} />
                <span className="nav-item-label">{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main>
        <header>
          <div className="header-left">
            <button
              className="icon mobile-menu"
              aria-label="Abrir menú"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            <button
              className="icon sidebar-toggle"
              aria-label={
                collapsed ? "Expandir navegación" : "Contraer navegación"
              }
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={20} />
              ) : (
                <PanelLeftClose size={20} />
              )}
            </button>
          </div>
          <div className="header-right">
            <button
              className="theme-toggle"
              aria-label={dark ? "Modo claro" : "Modo oscuro"}
              onClick={() => {
                localStorage.setItem("zentro.theme", dark ? "light" : "dark");
                setDark(!dark);
              }}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
              <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
            </button>
            <button
              className="icon"
              aria-label="Plan y copias de seguridad"
              onClick={() => open({ type: "settings" })}
            >
              <Settings size={20} />
            </button>
          </div>
        </header>
        <div className="content" key={page}>
          <div
            className={`page-heading ${page === "Ahorros" || page === "Día a día" ? "savings-page-bar" : ""}`}
          >
            <div>
              {page !== "Ahorros" && page !== "Día a día" && (
                <span className="eyebrow">TU TRANQUILIDAD EMPIEZA AQUÍ</span>
              )}
              <h1>
                {page === "Ahorros" && <Sprout size={27} aria-hidden="true" />}
                {page === "Día a día" && (
                  <Wallet size={27} aria-hidden="true" />
                )}
                {page}
              </h1>
              {page !== "Ahorros" && page !== "Día a día" && (
                <p>
                  {page === "Mi espacio"
                    ? "Tu ahorro, tus intereses y tu inversión, cada uno en su lugar."
                    : "El capital que aportas a tus fondos, sin rentabilidad variable."}
                </p>
              )}
            </div>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {page === "Mi espacio" && (
            <>
              <div className="cards summary-cards">
                {metric(
                  "Disponibilidad · ING",
                  daily.current,
                  "Saldo actual del día a día",
                )}
                {metric(
                  "Ahorro por trabajo",
                  wealth.work,
                  "Aportaciones netas y reposiciones",
                )}
                {metric(
                  "Generado por intereses",
                  wealth.interest,
                  "Separado del ahorro por trabajo",
                )}
                {metric(
                  "Invertido en fondos",
                  wealth.invested,
                  "Capital aportado, sin rentabilidad variable",
                )}
                {metric(
                  "Patrimonio neto",
                  wealth.net,
                  "Ahorro + intereses + inversión",
                  true,
                )}
              </div>
              <div className="cards two">
                <section className="panel">
                  <div className="section-title">
                    <h3>Día a día · ING</h3>
                    <button
                      className="subtle"
                      onClick={() => navigate("Día a día")}
                    >
                      Ver detalle
                    </button>
                  </div>
                  <div className="spread">
                    <span>Saldo actual</span>
                    <b>{euro(daily.current)}</b>
                  </div>
                  <div className="spread">
                    <span>Gastos pendientes</span>
                    <b>{euro(daily.expenses)}</b>
                  </div>
                  <div className="spread">
                    <span>Ingresos pendientes</span>
                    <b>{euro(daily.incomes)}</b>
                  </div>
                  <div className="spread">
                    <span>Saldo previsto</span>
                    <b>{euro(daily.forecast)}</b>
                  </div>
                </section>
                <section className="panel">
                  <div className="section-title">
                    <h3>Plan mensual</h3>
                    <button
                      className="subtle"
                      onClick={() => open({ type: "settings" })}
                    >
                      Editar plan
                    </button>
                  </div>
                  <div className="spread">
                    <span>Ahorro base</span>
                    <b>{euro(data.plan.saving)}</b>
                  </div>
                  <div className="spread">
                    <span>Inversión</span>
                    <b>{euro(data.plan.investment)}</b>
                  </div>
                  <div className="spread">
                    <span>Deuda interna pendiente</span>
                    <b>{euro(debt.pending)}</b>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => {
                      navigate("Ahorros");
                      setSavingsTab("Deuda interna");
                    }}
                  >
                    Ver reposiciones
                  </button>
                </section>
              </div>
              <div className="cards two">
                <section className="panel">
                  <h3>Ahorro por trabajo</h3>
                  <Chart
                    profile={data}
                    kind="savings"
                    year={currentMonth().slice(0, 4)}
                    view="Acumulado"
                  />
                </section>
                <section className="panel">
                  <h3>Inversión en fondos</h3>
                  <Chart
                    profile={data}
                    kind="investment"
                    year={currentMonth().slice(0, 4)}
                    view="Acumulado"
                  />
                </section>
              </div>
              <p className="notice">
                El patrimonio excluye el dinero del día a día y el efectivo. La
                deuda interna es un compromiso de reposición y no se resta de
                nuevo al ahorro.
              </p>
            </>
          )}
          {page === "Día a día" && (
            <>
              <div className="cards daily-primary">
                {metric(
                  "Saldo actual · ING",
                  daily.current,
                  "Dinero disponible en este momento",
                  true,
                  {
                    label: "Actualizar saldo",
                    onClick: () => open({ type: "balance" }),
                  },
                )}
                {metric(
                  "Gastos previstos",
                  daily.expenses,
                  "Pendientes de realizar",
                )}
                {metric(
                  "Ingresos previstos",
                  daily.incomes,
                  "Pendientes de recibir",
                )}
                {metric(
                  "Saldo después de pendientes",
                  daily.forecast,
                  "Previsión calculada sobre la marcha",
                )}
                {metric(
                  "Efectivo",
                  data.cash ?? 0,
                  "Importe independiente",
                  false,
                  {
                    label: "Actualizar efectivo",
                    onClick: () => open({ type: "cashBalance" }),
                  },
                )}
              </div>
              <div className="section-title">
                <label>
                  Mes de las tablas
                  <input
                    aria-label="Mes del día a día"
                    type="month"
                    value={dailyMonth}
                    onChange={(e) => setDailyMonth(e.target.value)}
                  />
                </label>
              </div>
              <div className="cards two">
                {cashTable("expenses")}
                {cashTable("incomes")}
              </div>
              <section className="panel possible-expenses-panel">
                <div className="section-title">
                  <div>
                    <h3>Posibles gastos</h3>
                    <p>
                      Total estimado:{" "}
                      <b>
                        {euro(
                          sum(
                            (data.possibleExpenses ?? []).map((r) => r.amount),
                          ),
                        )}
                      </b>
                    </p>
                  </div>
                  <div className="history-actions">
                    <button
                      className={`history-edit-toggle${editingPossible ? " active" : ""}`}
                      aria-label={
                        editingPossible
                          ? "Terminar edición de posibles gastos"
                          : "Editar posibles gastos"
                      }
                      aria-pressed={editingPossible}
                      onClick={() => setEditingPossible(!editingPossible)}
                    >
                      {editingPossible ? (
                        <Check size={16} />
                      ) : (
                        <Pencil size={16} />
                      )}
                      {editingPossible ? "Terminar edición" : "Editar"}
                    </button>
                    <button
                      className="history-edit-toggle"
                      onClick={() => open({ type: "possibleExpense" })}
                    >
                      <Plus size={16} />
                      Añadir posible gasto
                    </button>
                  </div>
                </div>
                {editingPossible && (
                  <p className="history-edit-note">
                    Selecciona un concepto para editarlo.
                  </p>
                )}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Concepto</th>
                        <th>Importe estimado</th>
                        {editingPossible && <th>Borrar</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(data.possibleExpenses ?? []).map((row) => (
                        <tr key={row.id}>
                          <td>
                            {editingPossible ? (
                              <button
                                className="history-month-edit"
                                aria-label={`Editar posible gasto ${row.concept}`}
                                onClick={() =>
                                  open({ type: "possibleExpense", item: row })
                                }
                              >
                                {row.concept}
                              </button>
                            ) : (
                              row.concept
                            )}
                          </td>
                          <td>{euro(row.amount)}</td>
                          {editingPossible && (
                            <td>
                              <button
                                className="icon danger"
                                aria-label={`Eliminar posible gasto ${row.concept}`}
                                onClick={() => {
                                  if (confirm("¿Eliminar este posible gasto?"))
                                    save({
                                      ...data,
                                      possibleExpenses: (
                                        data.possibleExpenses ?? []
                                      ).filter((r) => r.id !== row.id),
                                    });
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!data.possibleExpenses?.length && (
                  <p className="empty">
                    Añade gastos que quieras tener en mente.
                  </p>
                )}
              </section>
            </>
          )}
          {page === "Ahorros" && (
            <>
              <div className="cards three savings-primary">
                {metric(
                  "Ahorro por trabajo",
                  wealth.work,
                  "Historial de aportaciones netas",
                  true,
                )}
                {metric(
                  "Generado por intereses",
                  wealth.interest,
                  "Intereses acumulados registrados",
                  false,
                  {
                    label: "Actualizar intereses",
                    onClick: () => open({ type: "interestBalance" }),
                  },
                )}
                {metric("Ahorro total", wealth.savings, "Trabajo + intereses")}
              </div>
              <div
                className="account-detail-tabs"
                role="tablist"
                aria-label="Apartados de ahorro"
              >
                {["Historial", "Deuda interna"].map((label) => (
                  <button
                    role="tab"
                    aria-selected={savingsTab === label}
                    className={savingsTab === label ? "active" : ""}
                    key={label}
                    onClick={() => setSavingsTab(label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="savings-tab-content" key={savingsTab}>
                {savingsTab === "Historial" && historyPage("savings")}
                {savingsTab === "Deuda interna" && debtPage()}
              </div>
            </>
          )}
          {page === "Inversión" && historyPage("investment")}
        </div>
      </main>
      {modal && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
          >
            <div className="section-title">
              <h3 id="profile-modal-title">{modalTitles[modal.type]}</h3>
              <button
                className="icon"
                aria-label="Cerrar formulario"
                onClick={() => setModal(null)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={submit}>
              {formError && (
                <p className="error" role="alert">
                  {formError}
                </p>
              )}
              <div className="form-grid">
                {modal.type === "cash" && (
                  <>
                    {field("Concepto", "concept", modal.item?.concept || "")}
                    {field(
                      "Importe (€)",
                      "amount",
                      modal.item?.amount !== undefined
                        ? modal.item.amount / 100
                        : "",
                    )}
                    {field(
                      "Mes",
                      "month",
                      modal.item?.month || dailyMonth,
                      "month",
                    )}
                    <label>
                      Estado
                      <select
                        name="status"
                        defaultValue={modal.item?.status || "planned"}
                      >
                        <option value="planned">Previsto</option>
                        <option value="done">Realizado</option>
                      </select>
                    </label>
                  </>
                )}
                {modal.type === "balance" &&
                  field("Saldo actual (€)", "amount", daily.current / 100)}
                {modal.type === "cashBalance" &&
                  field("Efectivo (€)", "amount", (data.cash ?? 0) / 100)}
                {modal.type === "possibleExpense" && (
                  <>
                    {field("Concepto", "concept", modal.item?.concept ?? "")}
                    {field(
                      "Importe estimado (€)",
                      "amount",
                      modal.item ? modal.item.amount / 100 : "",
                    )}
                  </>
                )}
                {modal.type === "interestBalance" &&
                  field(
                    "Intereses acumulados (€)",
                    "amount",
                    wealth.interest / 100,
                  )}
                {modal.type === "month" && (
                  <>
                    <fieldset className="month-selection">
                      <legend>Mes del registro</legend>
                      <div className="month-selection-grid">
                        <label>
                          Mes
                          <select
                            aria-label="Mes del registro"
                            value={monthSelection.slice(5)}
                            disabled={!!modal.item?.month}
                            onChange={(event) =>
                              setMonthSelection(
                                `${monthSelection.slice(0, 4)}-${event.target.value}`,
                              )
                            }
                          >
                            {monthNames.map((name, index) => (
                              <option
                                value={String(index + 1).padStart(2, "0")}
                                key={name}
                              >
                                {name.charAt(0).toUpperCase() + name.slice(1)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Año
                          <select
                            aria-label="Año del registro"
                            value={monthSelection.slice(0, 4)}
                            disabled={!!modal.item?.month}
                            onChange={(event) =>
                              setMonthSelection(
                                `${event.target.value}-${monthSelection.slice(5)}`,
                              )
                            }
                          >
                            {selectableYears.map((value) => (
                              <option key={value}>{value}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <p>
                        {monthName(monthSelection)}
                        {selectedMonthly?.actual !== null &&
                        selectedMonthly?.actual !== undefined
                          ? " · Actualizarás un mes ya registrado"
                          : " · Nuevo importe o previsión"}
                      </p>
                    </fieldset>
                    <div className="month-value-fields" key={monthSelection}>
                      {field(
                        "Objetivo base (€)",
                        "goal",
                        selectedMonthly
                          ? selectedMonthly.goal === null
                            ? ""
                            : selectedMonthly.goal / 100
                          : (modal.kind === "savings"
                              ? data.plan.saving
                              : data.plan.investment) / 100,
                        "text",
                        false,
                      )}
                      {field(
                        modal.kind === "savings"
                          ? "Ahorrado neto (€)"
                          : "Invertido (€)",
                        "actual",
                        selectedMonthly?.actual !== undefined &&
                          selectedMonthly.actual !== null
                          ? selectedMonthly.actual / 100
                          : "",
                        "text",
                        false,
                      )}
                    </div>
                    <p className="form-note">
                      Deja el importe vacío si aún es una previsión. Las
                      reposiciones se registran en Deuda interna.
                    </p>
                  </>
                )}
                {modal.type === "withdraw" && (
                  <>
                    {field("Concepto", "concept", "")}
                    {field("Importe (€)", "amount", "")}
                    {field("Fecha", "date", today(), "date")}
                    <p className="form-note">
                      El importe se resta del ahorro por trabajo del mes
                      seleccionado y se añade a tu deuda interna.
                    </p>
                  </>
                )}
                {modal.type === "editDebt" && (
                  <>
                    {field("Concepto", "concept", modal.item.concept)}
                    {field(
                      "Importe retirado (€)",
                      "amount",
                      modal.item.amount / 100,
                    )}
                    {field("Fecha", "date", modal.item.date, "date")}
                    <p className="form-note">
                      Ya has repuesto {euro(debtItemPaid(data, modal.item.id))}.{" "}
                      {modal.item.historical
                        ? "Esta retirada es histórica: editarla actualiza la deuda pendiente sin modificar el ahorro ya contabilizado."
                        : "El ahorro se ajustará al nuevo importe y a la fecha seleccionada."}
                    </p>
                  </>
                )}
                {modal.type === "deleteDebt" && (
                  <div className="delete-debt-summary">
                    <span className="delete-debt-icon">
                      <Trash2 size={24} />
                    </span>
                    <h4>{modal.item.concept}</h4>
                    <p>
                      Se borrará esta deuda de {euro(modal.item.amount)} y las
                      reposiciones asociadas a ella (
                      {euro(debtItemPaid(data, modal.item.id))}).
                    </p>
                    <p>
                      {modal.item.historical
                        ? "El ahorro histórico ya contabilizado se conserva. Las reposiciones nuevas de esta deuda se descontarán del ahorro."
                        : "Se restaurará la retirada en su ahorro de origen y se descontarán las reposiciones nuevas de esta deuda."}
                    </p>
                  </div>
                )}
                {modal.type === "repay" && (
                  <>
                    {field(
                      "Importe (€)",
                      "amount",
                      Math.min(data.plan.repayment, debt.pending) / 100,
                    )}
                    {field("Fecha", "date", today(), "date")}
                    <p className="form-note">
                      El importe reduce tu deuda interna y se suma al ahorro por
                      trabajo del mes seleccionado. Se registra aparte de la
                      aportación base.
                    </p>
                  </>
                )}
                {modal.type === "schedule" && (
                  <>
                    <div className="schedule-month-label">
                      {monthName(modal.item.month)}
                      <small>Personaliza la reposición de este mes</small>
                    </div>
                    <input
                      type="hidden"
                      name="month"
                      value={modal.item.month}
                    />
                    {field(
                      "Reposición prevista (€)",
                      "amount",
                      modal.item.amount / 100,
                    )}
                    <p className="form-note">
                      Puedes indicar 0 para saltar este mes. El resto de la
                      distribución se recalcula con la deuda pendiente.
                    </p>
                  </>
                )}
                {modal.type === "settings" && (
                  <>
                    {field(
                      "Ahorro mensual (€)",
                      "saving",
                      data.plan.saving / 100,
                    )}
                    {field(
                      "Inversión mensual (€)",
                      "investment",
                      data.plan.investment / 100,
                    )}
                    {field(
                      "Reposición mensual (€)",
                      "repayment",
                      data.plan.repayment / 100,
                    )}
                    {field(
                      "Inicio del plan",
                      "start",
                      data.plan.start,
                      "month",
                    )}
                    {field(
                      "Previsión hasta",
                      "horizon",
                      data.plan.horizon,
                      "month",
                    )}
                    {field(
                      "Objetivo de ahorro (€)",
                      "target",
                      data.plan.savingsTarget === null
                        ? ""
                        : data.plan.savingsTarget / 100,
                      "text",
                      false,
                    )}
                  </>
                )}
              </div>
              {modal.type === "balance" && (
                <p className="form-note">
                  Este saldo sustituye la referencia anterior e incluye todos
                  los movimientos ya realizados. Los pendientes se mantienen.
                </p>
              )}
              <div className="modal-footer">
                <button type="button" onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button
                  className={
                    modal.type === "deleteDebt" ? "delete-confirm" : "primary"
                  }
                  type="submit"
                >
                  {modal.type === "deleteDebt" ? "Borrar deuda" : "Guardar"}
                </button>
              </div>
            </form>
            {modal.type === "settings" && (
              <>
                <hr />
                <div className="button-row">
                  <button onClick={exportBackup}>
                    <Download size={16} />
                    Exportar copia
                  </button>
                  <label className="button">
                    Importar copia
                    <input
                      hidden
                      type="file"
                      accept=".json,application/json"
                      onChange={importBackup}
                    />
                  </label>
                </div>
                {data.commitments.map((row) => (
                  <p key={row.id}>
                    {row.name}:{" "}
                    {row.amount === null
                      ? "pendiente de definir"
                      : euro(row.amount)}
                  </p>
                ))}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
