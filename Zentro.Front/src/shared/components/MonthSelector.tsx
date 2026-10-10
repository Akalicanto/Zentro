import type { ReactNode } from "react";

const months = Array.from({ length: 12 }, (_, index) =>
  new Date(2000, index, 1).toLocaleDateString("es-ES", { month: "long" }),
);

export default function MonthSelector({
  month,
  years,
  onChange,
  disabled = false,
  legend,
  monthLabel,
  yearLabel,
  children,
}: {
  month: string;
  years: string[];
  onChange: (month: string) => void;
  disabled?: boolean;
  legend: string;
  monthLabel: string;
  yearLabel: string;
  children?: ReactNode;
}) {
  return (
    <fieldset className="month-selection">
      <legend>{legend}</legend>
      <div className="month-selection-grid">
        <label>
          Mes
          <select
            aria-label={monthLabel}
            value={month.slice(5)}
            disabled={disabled}
            onChange={(event) =>
              onChange(`${month.slice(0, 4)}-${event.target.value}`)
            }
          >
            {months.map((name, index) => (
              <option key={name} value={String(index + 1).padStart(2, "0")}>
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Año
          <select
            aria-label={yearLabel}
            value={month.slice(0, 4)}
            disabled={disabled}
            onChange={(event) =>
              onChange(`${event.target.value}-${month.slice(5)}`)
            }
          >
            {years.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </label>
      </div>
      {children}
    </fieldset>
  );
}
