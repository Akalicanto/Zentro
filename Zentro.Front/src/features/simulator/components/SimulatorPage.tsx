import { useMemo, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  addMonth,
  cents,
  currentMonth,
  euro,
  monthName,
  projectScenario,
  wealthTotals,
  type Profile,
} from "../../../domain/index.ts";
import MetricCard from "../../../shared/components/MetricCard.tsx";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";

export default function SimulatorPage({ data }: { data: Profile }) {
  const wealth = useMemo(() => wealthTotals(data), [data]);
  const start = addMonth(currentMonth(), 1);
  const defaults = () => ({
    saving: String(data.plan.saving / 100),
    investment: String(data.plan.investment / 100),
    extra: "0",
    extraMonth: start,
    months: "12",
    target: String((Math.floor(wealth.net / 1_000_000) + 1) * 10000),
  });
  const [draft, setDraft] = useState(defaults);
  const update = (key: keyof typeof draft, value: string) =>
    setDraft((old) => {
      const next = { ...old, [key]: value };
      if (key === "months") {
        const end = addMonth(start, Number(value) - 1);
        if (next.extraMonth > end) next.extraMonth = end;
      }
      return next;
    });
  const result = useMemo(() => {
    try {
      return {
        projection: projectScenario(
          { savings: wealth.savings, invested: wealth.invested },
          {
            start,
            months: Number(draft.months),
            saving: cents(draft.saving),
            investment: cents(draft.investment),
            extra: cents(draft.extra),
            extraMonth: draft.extraMonth,
            target: cents(draft.target),
          },
          { saving: data.plan.saving, investment: data.plan.investment },
        ),
        error: "",
      };
    } catch (error) {
      return {
        projection: null,
        error: error instanceof Error ? error.message : "Revisa los importes.",
      };
    }
  }, [draft, wealth, start, data.plan]);
  const projection = result.projection;
  return (
    <>
      <section className="panel simulator-controls">
        <div className="section-title">
          <div>
            <span className="planning-eyebrow">
              <Sparkles size={17} /> IMAGINA TU PRÓXIMO PASO
            </span>
            <h3>¿Y si cambias tu plan?</h3>
          </div>
          <button
            className="history-edit-toggle"
            onClick={() => setDraft(defaults())}
          >
            <RotateCcw size={16} /> Restablecer escenario
          </button>
        </div>
        <p className="simulator-intro">
          Prueba desde {monthName(start)}. Partimos de {euro(wealth.net)} de
          patrimonio actual; tus saldos e historiales siguen intactos.
        </p>
        <div className="simulator-fields">
          <label>
            Ahorro mensual (€)
            <input
              inputMode="decimal"
              value={draft.saving}
              onChange={(event) => update("saving", event.target.value)}
            />
          </label>
          <label>
            Inversión mensual (€)
            <input
              inputMode="decimal"
              value={draft.investment}
              onChange={(event) => update("investment", event.target.value)}
            />
          </label>
          <label>
            Periodo
            <select
              aria-label="Periodo"
              value={draft.months}
              onChange={(event) => update("months", event.target.value)}
            >
              {[6, 12, 24, 36, 60, 120].map((months) => (
                <option key={months} value={months}>
                  {months} meses
                </option>
              ))}
            </select>
          </label>
          <label>
            Aportación extra a ahorro (€)
            <input
              inputMode="decimal"
              value={draft.extra}
              onChange={(event) => update("extra", event.target.value)}
            />
          </label>
          <label>
            Mes de la aportación extra
            <select
              aria-label="Mes de la aportación extra"
              value={draft.extraMonth}
              onChange={(event) => update("extraMonth", event.target.value)}
            >
              {Array.from({ length: Number(draft.months) }, (_, index) =>
                addMonth(start, index),
              ).map((month) => (
                <option key={month} value={month}>
                  {monthName(month)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Objetivo de patrimonio (€)
            <input
              inputMode="decimal"
              value={draft.target}
              onChange={(event) => update("target", event.target.value)}
            />
          </label>
        </div>
        {result.error && (
          <p className="error" role="alert">
            {result.error}
          </p>
        )}
        <PanelInfo title="Escenario futuro">
          Los controles solo cambian esta simulación. Restablecer recupera tus
          aportaciones mensuales actuales. Al salir de la página, el escenario
          se descarta. El objetivo inicial es el siguiente tramo de 10.000 €;
          puedes cambiarlo libremente. No se escriben datos en la base ni se
          aplican cambios a tu plan.
        </PanelInfo>
      </section>
      {projection && (
        <>
          <div className="cards three">
            <MetricCard
              label="Patrimonio simulado al final"
              amount={projection.final.total}
              note={monthName(projection.final.month)}
              tone="lilac"
            />
            <MetricCard
              label="Nuevas aportaciones"
              amount={projection.contributed}
              note="Ahorro + inversión + extra"
              tone="sage"
            />
            <MetricCard
              label="Diferencia frente a tu plan"
              amount={projection.difference}
              note="Comparación de aportaciones base"
              tone="peach"
            />
          </div>
          <section className="panel simulator-projection">
            <div className="section-title">
              <div>
                <h3>Tu futuro, en perspectiva</h3>
                <p className="simulator-intro">
                  {projection.reached === "already"
                    ? "El patrimonio actual ya alcanza tu objetivo."
                    : projection.reached
                      ? `Con este escenario alcanzarías ${euro(cents(draft.target))} en ${monthName(projection.reached)}.`
                      : `Al terminar faltarían ${euro(cents(draft.target) - projection.final.total)} para tu objetivo.`}
                </p>
              </div>
            </div>
            <div className="planning-legend">
              <span>
                <i style={{ background: "#b69bcd" }} />
                Escenario
              </span>
              <span>
                <i style={{ background: "#8eafce" }} />
                Referencia del plan actual
              </span>
            </div>
            <div
              className="simulator-chart"
              role="img"
              aria-label="Comparación del patrimonio simulado y las aportaciones del plan actual"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={[
                    {
                      month: addMonth(start, -1),
                      total: projection.initial,
                      baseline: projection.initial,
                    },
                    ...projection.rows,
                  ]}
                  margin={{ top: 18, left: 8, right: 16, bottom: 8 }}
                >
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(month) =>
                      `${month.slice(5)}/${month.slice(2, 4)}`
                    }
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                    minTickGap={30}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    width={86}
                    tickFormatter={(value) =>
                      `${(value / 100).toLocaleString("es-ES")} €`
                    }
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    labelFormatter={(value) => monthName(String(value))}
                    formatter={(value) => euro(Number(value))}
                    contentStyle={{
                      background: "var(--panel)",
                      borderColor: "var(--line)",
                      borderRadius: 12,
                      color: "var(--text)",
                    }}
                  />
                  <Area
                    dataKey="total"
                    name="Escenario"
                    stroke="#b69bcd"
                    fill="#b69bcd"
                    fillOpacity={0.15}
                    strokeWidth={3}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="baseline"
                    name="Referencia del plan actual"
                    stroke="#8eafce"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <details className="simulator-details">
              <summary>Ver evolución mes a mes</summary>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th>Ahorro e intereses actuales + aportaciones</th>
                      <th>Capital invertido</th>
                      <th>Extra</th>
                      <th>Patrimonio simulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.rows.map((row) => (
                      <tr key={row.month}>
                        <td>{monthName(row.month)}</td>
                        <td>{euro(row.savings)}</td>
                        <td>{euro(row.invested)}</td>
                        <td>{euro(row.extra)}</td>
                        <td>
                          <strong>{euro(row.total)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <PanelInfo title="Proyección del escenario">
              Los puntos representan el cierre de cada mes. Se mantiene el
              capital actual y se suman las aportaciones introducidas. No se
              estiman rentabilidades, intereses nuevos, inflación, gastos ni
              reposiciones de deuda interna. La referencia prolonga tus
              aportaciones base actuales durante el mismo periodo, incluso más
              allá del horizonte configurado, sin aportación extra. Es una
              comparación hipotética de capital aportado; no una previsión del
              valor de los fondos. El saldo diario y el efectivo quedan fuera
              del patrimonio, como en el resto de Zentro.
            </PanelInfo>
          </section>
        </>
      )}
    </>
  );
}
