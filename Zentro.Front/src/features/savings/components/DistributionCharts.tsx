import { Surface } from "../../../shared/ui/index.tsx";
import { memo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  addMonth,
  currentMonth,
  euro,
  placementReturn,
  savingsDistribution,
} from "../../../domain/index.ts";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";
const colours = ["#a68acb", "#8eae9b", "#d4a688", "#b896ac", "#8ba7cc"];
const fiscalSource = "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820#a90";
type Distribution = ReturnType<typeof savingsDistribution>;
const DistributionCharts = memo(function DistributionCharts({
  distribution,
}: {
  distribution: Distribution;
}) {
  const slices = distribution.rows.map((r, i) => ({
    name: r.name,
    value: r.balance,
    colour: colours[i % colours.length],
  }));
  if (distribution.unassigned)
    slices.push({
      name: "Sin asignar",
      value: distribution.unassigned,
      colour: "#c5becb",
    });
  const projection = Array.from({ length: 13 }, (_, i) => {
    const point: Record<string, number> = { month: i };
    distribution.rows.forEach((row, j) => {
      point[`p${j}`] =
        row.kind === "deposit"
          ? placementReturn(row, row.balance, Math.min(i, row.months!)).net
          : Array.from(
              { length: i },
              (_, n) =>
                placementReturn(
                  row,
                  row.balance,
                  1,
                  addMonth(currentMonth(), n),
                ).net,
            ).reduce((a, b) => a + b, 0);
    });
    return point;
  });
  return (
    <div className="cards two allocation-charts">
      <Surface component="section" className="panel">
        <h3>Dónde está tu ahorro</h3>
        <div
          className="allocation-donut"
          role="img"
          aria-label="Gráfico de distribución del ahorro"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices.filter((r) => r.value > 0)}
                dataKey="value"
                nameKey="name"
                innerRadius="65%"
                outerRadius="90%"
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {slices
                  .filter((r) => r.value > 0)
                  .map((r) => (
                    <Cell key={r.name} fill={r.colour} />
                  ))}
              </Pie>
              <Tooltip
                formatter={(v) => euro(Number(v))}
                contentStyle={{
                  background: "var(--panel)",
                  borderColor: "var(--line)",
                  borderRadius: 12,
                  color: "var(--text)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-total">
            <span>Ahorro total</span>
            <strong>{euro(distribution.total)}</strong>
          </div>
        </div>
        <div className="allocation-legend">
          {slices.map((r, i) => (
            <div key={i}>
              <span
                className="allocation-dot"
                style={{ background: r.colour }}
              />
              <span>{r.name}</span>
              <strong>{euro(r.value)}</strong>
            </div>
          ))}
        </div>
        <PanelInfo title="Distribución del ahorro">
          Los destinos muestran dónde está el ahorro total, incluyendo los
          intereses ya registrados. Una cuenta puede recibir automáticamente el
          resto del ahorro. Cambiar esta distribución no registra aportaciones
          ni altera tu patrimonio.
        </PanelInfo>
      </Surface>
      <Surface component="section" className="panel">
        <h3>Generación neta estimada</h3>
        <p className="allocation-chart-caption">
          Doce meses, manteniendo el saldo actual
        </p>
        <div
          className="chart allocation-projection"
          role="img"
          aria-label="Gráfico de intereses netos estimados"
        >
          {distribution.rows.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={projection}
                margin={{ top: 12, right: 28, bottom: 8, left: 0 }}
              >
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(n) => `Mes ${n}`}
                  interval={2}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(n) => `${Math.round(Number(n) / 100)} €`}
                  width={64}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                />
                <Tooltip
                  labelFormatter={(n) => `Mes ${n}`}
                  formatter={(v, name) => [euro(Number(v)), name]}
                  contentStyle={{
                    background: "var(--panel)",
                    borderColor: "var(--line)",
                    borderRadius: 12,
                    color: "var(--text)",
                  }}
                />
                {distribution.rows.map((row, i) => (
                  <Line
                    key={row.id}
                    dataKey={`p${i}`}
                    name={row.name}
                    stroke={colours[i % colours.length]}
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty">Añade un destino para ver la estimación.</p>
          )}
        </div>
        <div className="allocation-projection-key">
          {distribution.rows.map((r, i) => (
            <span key={r.id}>
              <i style={{ background: colours[i % colours.length] }} />
              {r.name}
            </span>
          ))}
        </div>
        <PanelInfo title="Intereses netos estimados">
          Es una proyección: no se suma a tus intereses cobrados. El depósito
          muestra el interés desde el inicio del contrato hasta su plazo y la
          cuenta suma estimaciones desde el mes actual sin reinvertir intereses
          ni añadir aportaciones. Neto significa descontar el porcentaje fiscal
          editable; la liquidación final del IRPF puede variar. El cálculo
          Actual/360 usa los días de cada mes con saldo constante.{" "}
          <a href={fiscalSource} target="_blank" rel="noreferrer">
            Referencia fiscal
          </a>
          .
        </PanelInfo>
      </Surface>
    </div>
  );
});

export default DistributionCharts;
