import { memo, useMemo, useState } from "react";
import { CalendarRange } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  currentMonth,
  euro,
  monthName,
  monthlyPlanning,
  type Profile,
} from "../../../domain/index.ts";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";

const categories = [
  { key: "saving", label: "Ahorro", color: "#8eafce" },
  { key: "investment", label: "Inversión", color: "#b69bcd" },
  { key: "repayment", label: "Reposición interna", color: "#86b59f" },
  { key: "debts", label: "Cuotas de deudas", color: "#cf9aac" },
] as const;

export default memo(function MonthlyPlanning({ data }: { data: Profile }) {
  const [count, setCount] = useState(6);
  const start = currentMonth();
  const rows = useMemo(
    () => monthlyPlanning(data, start, count),
    [data, start, count],
  );
  const peak = rows.reduce(
    (best, row) => (row.total > best.total ? row : best),
    rows[0],
  );
  const total = rows.reduce((amount, row) => amount + row.total, 0);
  return (
    <section className="panel monthly-planning">
      <div className="section-title">
        <div>
          <span className="planning-eyebrow">
            <CalendarRange size={17} /> MIRANDO HACIA DELANTE
          </span>
          <h3>Tu calendario financiero</h3>
        </div>
        <div
          className="planning-range"
          role="group"
          aria-label="Horizonte del calendario"
        >
          {[6, 12].map((value) => (
            <button
              key={value}
              aria-pressed={count === value}
              onClick={() => setCount(value)}
            >
              {value} meses
            </button>
          ))}
        </div>
      </div>
      <div className="planning-highlights">
        <div>
          <span>Por preparar este mes</span>
          <strong>{euro(rows[0].total)}</strong>
          <small>{monthName(start)}</small>
        </div>
        <div>
          <span>Total de los próximos {count} meses</span>
          <strong>{euro(total)}</strong>
          <small>Aportaciones y cuotas pendientes</small>
        </div>
        <div>
          <span>Mes con mayor esfuerzo</span>
          <strong>
            {peak.total > 0 ? euro(peak.total) : "Sin pendientes"}
          </strong>
          <small>
            {peak.total > 0 ? monthName(peak.month) : "En este periodo"}
          </small>
        </div>
      </div>
      <div className="planning-legend">
        {categories.map((item) => (
          <span key={item.key}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div
        className="planning-chart"
        role="img"
        aria-label="Importes por preparar cada mes, desglosados en la tabla inferior"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 16, right: 8, left: 8, bottom: 8 }}
          >
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={(month) =>
                `${month.slice(5)}/${month.slice(2, 4)}`
              }
              tick={{ fill: "var(--muted)", fontSize: 13 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) =>
                `${(value / 100).toLocaleString("es-ES")} €`
              }
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              width={80}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              labelFormatter={(label) => monthName(String(label))}
              formatter={(value) => euro(Number(value))}
              contentStyle={{
                background: "var(--panel)",
                borderColor: "var(--line)",
                borderRadius: 12,
                color: "var(--text)",
              }}
              cursor={{ fill: "var(--line)", opacity: 0.3 }}
            />
            {categories.map((item) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label}
                stackId="plan"
                fill={item.color}
                maxBarSize={45}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="table-wrap">
        <table>
          <caption className="planning-caption">
            Importes pendientes de preparar
          </caption>
          <thead>
            <tr>
              <th>Mes</th>
              <th>Ahorro</th>
              <th>Inversión</th>
              <th>Reposición</th>
              <th>Deudas</th>
              <th>Ya apartado</th>
              <th>Total por preparar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.month}
                className={row.month === start ? "planning-current" : undefined}
              >
                <td>{monthName(row.month)}</td>
                <td>{euro(row.saving)}</td>
                <td>{euro(row.investment)}</td>
                <td>{euro(row.repayment)}</td>
                <td>{euro(row.debts)}</td>
                <td>{euro(row.reserved)}</td>
                <td>
                  <strong>{euro(row.total)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.some((row) => !row.inPlan) && (
        <p className="planning-note">
          El plan de aportaciones termina en {monthName(data.plan.horizon)}. Los
          meses posteriores solo muestran las cuotas de deudas registradas.
        </p>
      )}
      <PanelInfo title="Tu calendario financiero">
        Esta vista reúne lo que todavía necesitas preparar en cada mes. Una
        aportación mensual registrada, incluso de cero euros, se considera
        cerrada. Las reposiciones siguen el calendario de deuda interna y se
        limitan al importe pendiente. Las cuotas pagadas se excluyen y las
        apartadas se muestran aparte, sin sumarse al total por preparar. No se
        incluyen cuotas de meses anteriores ni deuda sin fecha asignada. Tampoco
        se incluyen gastos del día a día, posibles gastos ni intereses
        estimados. Es una planificación, no un descuento automático del saldo ni
        una previsión de patrimonio.
      </PanelInfo>
    </section>
  );
});
