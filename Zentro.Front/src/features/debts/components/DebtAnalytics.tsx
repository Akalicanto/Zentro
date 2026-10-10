import { Surface } from "../../../shared/ui/index.tsx";
import { memo, useMemo, useState } from "react";
import { CalendarDays, CircleCheck, Clock3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  debtAnalytics,
  euro,
  monthName,
  sum,
  type ExternalDebt,
} from "../../../domain/index.ts";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";

const categories = [
  { key: "paid", label: "Pagado", colour: "#82b39f" },
  { key: "reserved", label: "Apartado", colour: "#d6b679" },
  { key: "pending", label: "Pendiente", colour: "#c58fa8" },
] as const;
const percentage = (value: number) =>
  `${value.toLocaleString("es-ES", { maximumFractionDigits: 1 })} %`;
const tooltipStyle = {
  background: "var(--panel)",
  borderColor: "var(--line)",
  borderRadius: 12,
  color: "var(--text)",
};

const DebtAnalytics = memo(function DebtAnalytics({
  debt,
}: {
  debt: ExternalDebt;
}) {
  const analytics = useMemo(() => debtAnalytics(debt), [debt]);
  const [year, setYear] = useState("all");
  const chartMonths = [
    ...new Set([
      ...analytics.calendar.map((row) => row.month),
      ...(debt.advances ?? []).map((row) => row.date.slice(0, 7)),
    ]),
  ].sort();
  const years = [
    ...new Set(chartMonths.map((month) => month.slice(0, 4))),
  ].sort((a, b) => b.localeCompare(a));
  const activeYear = year === "all" || years.includes(year) ? year : "all";
  const monthly = chartMonths
    .filter((month) => activeYear === "all" || month.startsWith(activeYear))
    .map((month) => {
      const row = analytics.calendar.find((row) => row.month === month);
      return {
        month,
        paid: sum([
          row?.status === "paid" ? row.amount : 0,
          ...(debt.advances ?? [])
            .filter((advance) => advance.date.startsWith(month))
            .map((advance) => advance.amount),
        ]),
        reserved: row?.status === "reserved" ? row.amount : 0,
        pending: row?.status === "pending" ? row.amount : 0,
      };
    });
  const slices = categories.map((category) => ({
    ...category,
    value: analytics.totals[category.key],
  }));
  return (
    <div className="debt-analytics">
      <div className="cards three debt-statistics">
        <section className="debt-stat tone-lilac">
          <span>
            <CircleCheck size={18} />
            Cuotas por pagar
          </span>
          <strong>{analytics.outstandingCount}</strong>
          <small>
            {analytics.installmentCount
              ? `De ${analytics.installmentCount} cuotas registradas`
              : "Todavía no hay cuotas registradas"}
          </small>
        </section>
        <section className="debt-stat tone-sage">
          <span>
            <Clock3 size={18} />
            Primera cuota pendiente
          </span>
          <strong>{analytics.next ? euro(analytics.next.amount) : "—"}</strong>
          <small>
            {analytics.next
              ? `${monthName(analytics.next.month)} · ${analytics.next.status === "reserved" ? "Apartada" : "Por preparar"}`
              : analytics.totals.remaining
                ? "Sin mes asignado"
                : "Todo pagado"}
          </small>
        </section>
        <section className="debt-stat tone-peach">
          <span>
            <CalendarDays size={18} />
            Fin del calendario
          </span>
          <strong className="debt-stat-date">
            {analytics.totals.remaining === 0
              ? "Deuda saldada"
              : analytics.last
                ? monthName(analytics.last.month)
                : "Sin definir"}
          </strong>
          <small>
            {analytics.unassigned > 0
              ? `${euro(analytics.unassigned)} aún sin planificar`
              : "Según las cuotas registradas"}
          </small>
        </section>
      </div>
      <div className="cards two debt-charts">
        <Surface component="section" className="panel debt-progress-panel">
          <span className="table-eyebrow">PASO A PASO</span>
          <h3>Así va tu deuda</h3>
          <div
            className="debt-donut"
            role="img"
            aria-label={`Reparto de la deuda: ${euro(analytics.totals.paid)} pagados, ${euro(analytics.totals.reserved)} apartados y ${euro(analytics.totals.pending)} pendientes de preparar`}
          >
            {analytics.totals.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices.filter((row) => row.value > 0)}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="73%"
                    outerRadius="93%"
                    paddingAngle={3}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {slices
                      .filter((row) => row.value > 0)
                      .map((row) => (
                        <Cell key={row.key} fill={row.colour} />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => euro(Number(value))}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="debt-donut-empty" />
            )}
            <div className="donut-total">
              <span>Ya pagado</span>
              <strong>{percentage(analytics.paidPercent)}</strong>
            </div>
          </div>
          <div className="debt-chart-legend">
            {slices.map((row) => (
              <div key={row.key}>
                <i style={{ background: row.colour }} />
                <span>{row.label}</span>
                <strong>{euro(row.value)}</strong>
              </div>
            ))}
          </div>
          <div className="debt-prepared-progress">
            <div>
              <span>Pagado o preparado</span>
              <strong>{percentage(analytics.preparedPercent)}</strong>
            </div>
            <div className="debt-progress-track">
              <span style={{ width: `${analytics.preparedPercent}%` }} />
            </div>
          </div>
          <PanelInfo title="Así va tu deuda">
            Pagado es dinero ya abonado. Apartado está preparado, pero sigue
            formando parte de lo que falta por pagar. Pendiente incluye también
            cualquier importe sin mes asignado. El porcentaje preparado suma
            pagado y apartado.
          </PanelInfo>
        </Surface>
        <Surface
          component="section"
          className="panel debt-calendar-chart-panel"
        >
          <div className="section-title debt-chart-heading">
            <div>
              <span className="table-eyebrow">TU CALENDARIO</span>
              <h3>Cuotas por mes</h3>
            </div>
            <label className="debt-chart-filter">
              <span>Año</span>
              <select
                aria-label="Año del gráfico de deuda"
                value={activeYear}
                onChange={(event) => setYear(event.target.value)}
              >
                <option value="all">Todos los años</option>
                {years.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <div
            className="chart debt-monthly-chart"
            role="img"
            aria-label="Gráfico mensual de cuotas pagadas, apartadas y pendientes"
          >
            {monthly.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthly}
                  margin={{ top: 10, right: 12, bottom: 8, left: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value) =>
                      `${String(value).slice(5)}/${String(value).slice(2, 4)}`
                    }
                    minTickGap={28}
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                  />
                  <YAxis
                    width={62}
                    tickFormatter={(value) =>
                      `${(Number(value) / 100).toLocaleString("es-ES", { notation: "compact" })} €`
                    }
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                  />
                  <Tooltip
                    labelFormatter={(value) => monthName(String(value))}
                    formatter={(value, name) => [euro(Number(value)), name]}
                    contentStyle={tooltipStyle}
                  />
                  {categories.map((category) => (
                    <Bar
                      key={category.key}
                      dataKey={category.key}
                      name={category.label}
                      stackId="installments"
                      fill={category.colour}
                      maxBarSize={30}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="empty">
                Añade cuotas para ver su distribución mensual.
              </p>
            )}
          </div>
          <div className="debt-monthly-legend">
            {categories.map((category) => (
              <span key={category.key}>
                <i style={{ background: category.colour }} />
                {category.label}
              </span>
            ))}
          </div>
          {analytics.unassigned > 0 && (
            <p className="debt-unassigned-note">
              {euro(analytics.unassigned)} sin mes asignado
            </p>
          )}
          <PanelInfo title="Cuotas por mes">
            Cada barra muestra las cuotas del mes y los adelantos pagados en ese
            mes. El filtro solo cambia este gráfico. Los importes sin mes
            asignado no aparecen en las barras. El final del calendario
            corresponde a la última cuota por pagar; si falta asignar dinero,
            aún no hay una fecha completa de liquidación. Estos gráficos no
            modifican tus datos.
          </PanelInfo>
        </Surface>
      </div>
    </div>
  );
});

export default DebtAnalytics;
