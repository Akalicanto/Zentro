import {
  currentMonth,
  monthSeries,
  type Profile,
} from "../../../domain/index.ts";
import type { HistoryControls } from "../hooks/useHistoryView.ts";

export default function HistoryYearFilter({
  data,
  kind,
  controls,
}: {
  data: Profile;
  kind: "savings" | "investment";
  controls: HistoryControls;
}) {
  const years = [
    ...new Set([
      currentMonth().slice(0, 4),
      ...monthSeries(data, kind).map((row) => row.month.slice(0, 4)),
    ]),
  ].sort((a, b) => b.localeCompare(a));
  return (
    <label className="history-year-filter">
      Año del historial
      <select
        aria-label="Año del historial"
        value={controls.year}
        onChange={(event) => controls.setYear(event.target.value)}
      >
        <option value="all">Todos los años</option>
        {years.map((year) => (
          <option key={year}>{year}</option>
        ))}
      </select>
    </label>
  );
}
