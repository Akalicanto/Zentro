import { memo } from "react";
import {
  type Profile,
  monthSeries,
  monthName,
  euro,
} from "../../../domain/index.ts";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  LineChart,
} from "recharts";

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
export default Chart;
