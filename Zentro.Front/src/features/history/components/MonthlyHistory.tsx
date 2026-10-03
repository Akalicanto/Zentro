import {
  type Profile,
  currentMonth,
  wealthTotals,
  monthSeries,
  monthName,
  euro,
} from "../../../domain/index.ts";
import { type OpenProfileForm } from "../../profile/types.ts";
import { type HistoryControls } from "../hooks/useHistoryView.ts";
import { useMemo, Fragment } from "react";
import MetricCard from "../../../shared/components/MetricCard.tsx";
import Chart from "./ContributionChart.tsx";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";
import { ArrowUpDown, Check, Pencil, Plus } from "lucide-react";

type Props = {
  kind: "savings" | "investment";
  data: Profile;
  open: OpenProfileForm;
  controls: HistoryControls;
};
export default function MonthlyHistory({ kind, data, open, controls }: Props) {
  const {
    year,
    setYear,
    view,
    setView,
    tableOrder,
    setTableOrder,
    editingHistory,
    setEditingHistory,
  } = controls;
  const dailyMonth = currentMonth();
  const { wealth, savingsSeries, investmentSeries } = useMemo(
    () => ({
      wealth: wealthTotals(data),
      savingsSeries: monthSeries(data, "savings"),
      investmentSeries: monthSeries(data, "investment"),
    }),
    [data],
  );
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
      <div
        className={
          saving
            ? "cards two savings-secondary"
            : "cards three savings-primary investment-primary"
        }
      >
        {!saving && (
          <MetricCard
            label="Capital aportado"
            amount={wealth.invested}
            note="Historial registrado, sin previsiones"

            tone="lilac"
          />
        )}
        {
          <MetricCard
            label="Aportación mensual"
            amount={saving ? data.plan.saving : data.plan.investment}
            note="Aportación base del plan"

            tone="peach"
          />
        }
        {
          <MetricCard
            label="Acumulado previsto"
            amount={future}
            note={
              closingMonth
                ? `Hasta ${monthName(closingMonth.month)}`
                : "Sin importes registrados en este período"
            }

            tone="blue"
          />
        }
      </div>
      <section className="panel">
        <div className="section-title">
          <div>
            <h3>
              {saving
                ? "Evolución del ahorro por trabajo"
                : "Evolución de la inversión"}
            </h3>
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
        <Chart profile={data} kind={kind} year={year} view={view} showGoal />
        <PanelInfo
          title={saving ? "Gráfica de ahorro" : "Gráfica de inversión"}
        >
          {saving
            ? "El objetivo ideal sigue la aportación base de cada mes. El ahorro real incluye retiradas y reposiciones; los intereses se muestran por separado."
            : "El objetivo ideal sigue los objetivos mensuales de inversión. Registrado refleja las aportaciones reales, sin rentabilidad de los fondos. Previsto aplica el plan a los meses pendientes. Los acumulados conservan las aportaciones de los años anteriores."}
        </PanelInfo>
      </section>
      <section
        className={`panel history-panel${editingHistory ? " is-editing" : ""}`}
      >
        <div className="section-title">
          <div>
            <h3>Historial mensual</h3>
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
              {tableOrder === "desc" ? "Recientes primero" : "Antiguos primero"}
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
                      (row.real === null
                        ? "history-forecast-row"
                        : "history-recorded-row") +
                      (row.month === dailyMonth ? " current-month-row" : "")
                    }
                    aria-current={row.month === dailyMonth ? "date" : undefined}
                  >
                    <td>
                      <span className="history-month-cell">
                        <span
                          className={`history-status-dot${row.real === null ? " forecast" : ""}`}
                          title={row.real === null ? "Previsión" : "Registrado"}
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
        <PanelInfo
          title={saving ? "Historial de ahorro" : "Historial de inversión"}
        >
          Vacío significa sin registrar. Los ceros y negativos se conservan.
          {saving
            ? " Las previsiones se recalculan con la deuda pendiente y nunca cuentan como dinero ahorrado."
            : " Las previsiones siguen el plan mensual y nunca cuentan como capital ya invertido. No se incluye rentabilidad variable."}
        </PanelInfo>
      </section>
    </>
  );
}
