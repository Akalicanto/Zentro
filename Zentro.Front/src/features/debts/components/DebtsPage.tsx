import ModalFrame from "../../../shared/components/ModalFrame.tsx";
import { Fragment, useState } from "react";
import { ArrowUpDown, Check, Pencil, Plus, X } from "lucide-react";
import {
  addMonth,
  cents,
  currentMonth,
  euro,
  externalDebtTotals,
  monthName,
  sum,
  uid,
  validateProfile,
  type Profile,
  type DebtInstallment,
  type ExternalDebt,
} from "../../../domain/index.ts";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";
import DebtAnalytics from "./DebtAnalytics.tsx";

const statuses = [
  { value: "paid", label: "Pagado" },
  { value: "reserved", label: "Apartado" },
  { value: "pending", label: "Pendiente" },
] as const;
const months = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString("es-ES", { month: "long" }),
);

export default function DebtsPage({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (profile: Profile) => boolean;
}) {
  const debt = profile.debts?.find((d) => d.name.toLowerCase() === "dentista");
  const [editing, setEditing] = useState(false);
  const [descending, setDescending] = useState(false);
  const [modal, setModal] = useState<"total" | "installment" | null>(null);
  const [selected, setSelected] = useState<DebtInstallment>();
  const [month, setMonth] = useState(currentMonth());
  const [error, setError] = useState("");
  const rows = [...(debt?.installments ?? [])].sort((a, b) =>
    descending
      ? b.month.localeCompare(a.month)
      : a.month.localeCompare(b.month),
  );
  const totals = debt
    ? externalDebtTotals(debt)
    : { total: 0, paid: 0, reserved: 0, remaining: 0, pending: 0 };
  const calendarTotal = sum(rows.map((r) => r.amount));
  const years = [
    ...new Set([
      ...rows.map((r) => r.month.slice(0, 4)),
      month.slice(0, 4),
      ...Array.from({ length: 11 }, (_, i) =>
        String(Number(currentMonth().slice(0, 4)) - 5 + i),
      ),
    ]),
  ].sort((a, b) => b.localeCompare(a));
  function openTotal() {
    setError("");
    setModal("total");
  }
  function openInstallment(row?: DebtInstallment) {
    setError("");
    setSelected(row);
    const last = [...rows]
      .sort((a, b) => a.month.localeCompare(b.month))
      .at(-1);
    setMonth(row?.month ?? (last ? addMonth(last.month, 1) : currentMonth()));
    setModal("installment");
  }
  function saveDebt(nextDebt: ExternalDebt) {
    const next = {
      ...profile,
      debts: [
        ...(profile.debts ?? []).filter((d) => d.id !== nextDebt.id),
        nextDebt,
      ],
    };
    validateProfile(next);
    return onSave(next);
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      const amount = cents(String(form.get("amount") ?? ""));
      const next = structuredClone(
        debt ?? { id: uid(), name: "Dentista", total: 0, installments: [] },
      );
      if (modal === "total") next.total = amount;
      else {
        if (!selected && next.installments.some((r) => r.month === month))
          throw Error("Este mes ya tiene una cuota. Edítala desde la tabla.");
        next.installments = [
          ...next.installments.filter((r) => r.month !== selected?.month),
          {
            month,
            amount,
            status: form.get("status") as DebtInstallment["status"],
          },
        ].sort((a, b) => a.month.localeCompare(b.month));
      }
      if (saveDebt(next)) setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisa la cuota.");
    }
  }
  function removeInstallment() {
    if (
      !debt ||
      !selected ||
      !confirm(
        "¿Eliminar esta cuota del calendario? El total de la deuda se conserva y se recalculan los importes pagados y pendientes.",
      )
    )
      return;
    try {
      if (
        saveDebt({
          ...debt,
          installments: debt.installments.filter(
            (r) => r.month !== selected.month,
          ),
        })
      )
        setModal(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se ha podido eliminar la cuota.",
      );
    }
  }
  return (
    <>
      <div className="debt-page-title">
        <h2>Dentista</h2>
        <span>Plan de pagos</span>
      </div>
      <div className="cards three external-debt-primary">
        <div className="metric tone-lilac">
          <span>Deuda total</span>
          <h2>{euro(totals.total)}</h2>
          <small>Importe del tratamiento</small>
          <button className="metric-action" onClick={openTotal}>
            <Pencil size={13} />
            {debt ? "Actualizar total" : "Indicar deuda"}
          </button>
        </div>
        <div className="metric tone-sage">
          <span>Ya pagado</span>
          <h2>{euro(totals.paid)}</h2>
          <small>
            {euro(totals.paid + totals.reserved)} pagados o preparados
          </small>
        </div>
        <div className="metric tone-rose">
          <span>Falta por pagar</span>
          <h2>{euro(totals.remaining)}</h2>
          <small>
            {euro(totals.reserved)} apartados · {euro(totals.pending)} por
            preparar
          </small>
        </div>
      </div>
      {debt && <DebtAnalytics debt={debt} />}
      <section
        className={`panel history-panel external-debt-panel${editing ? " is-editing" : ""}`}
      >
        <div className="section-title table-heading">
          <div>
            <span className="table-eyebrow">CUOTA A CUOTA</span>
            <h3>Calendario de pagos</h3>
          </div>
          <div className="history-actions">
            <div className="history-order">
              <button
                onClick={() => setDescending(!descending)}
                aria-label="Cambiar orden de las cuotas"
              >
                <ArrowUpDown size={16} />
                {descending ? "Recientes primero" : "Antiguos primero"}
              </button>
            </div>
            <button
              className={`history-edit-toggle${editing ? " active" : ""}`}
              aria-label={
                editing ? "Terminar edición de cuotas" : "Editar cuotas"
              }
              aria-pressed={editing}
              disabled={!rows.length}
              onClick={() => setEditing(!editing)}
            >
              {editing ? <Check size={16} /> : <Pencil size={16} />}{" "}
              {editing ? "Terminar edición" : "Editar"}
            </button>
            <button
              className="history-edit-toggle"
              disabled={!debt}
              onClick={() => openInstallment()}
            >
              <Plus size={16} />
              Añadir mes
            </button>
          </div>
        </div>
        {editing && (
          <p className="history-edit-note">
            Selecciona un mes para cambiar el importe o su estado.
          </p>
        )}
        <div className="table-wrap">
          <table className="monthly-history dental-history">
            <thead>
              <tr>
                <th>Mes</th>
                {statuses.map((s) => (
                  <th key={s.value} className={`debt-column-${s.value}`}>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <Fragment key={row.month}>
                  {(i === 0 ||
                    rows[i - 1].month.slice(0, 4) !==
                      row.month.slice(0, 4)) && (
                    <tr className="history-year">
                      <th colSpan={4} scope="rowgroup">
                        <span className="history-year-label">
                          {row.month.slice(0, 4)}
                        </span>
                      </th>
                    </tr>
                  )}
                  <tr
                    className={
                      row.month === currentMonth()
                        ? "current-month-row"
                        : undefined
                    }
                    aria-current={
                      row.month === currentMonth() ? "date" : undefined
                    }
                  >
                    <td>
                      <span className="history-month-cell">
                        {editing ? (
                          <button
                            className="history-month-edit"
                            aria-label={`Editar cuota ${row.month}`}
                            onClick={() => openInstallment(row)}
                          >
                            {monthName(row.month).replace(/ de \d{4}$/, "")}
                          </button>
                        ) : (
                          monthName(row.month).replace(/ de \d{4}$/, "")
                        )}
                      </span>
                    </td>
                    {statuses.map((s) => (
                      <td key={s.value} className={`debt-column-${s.value}`}>
                        {row.status === s.value ? (
                          <span className={`debt-amount debt-${s.value}`}>
                            {euro(row.amount)}
                          </span>
                        ) : (
                          <span className="debt-empty">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className="empty">
                    {debt
                      ? "Añade las cuotas del tratamiento."
                      : "Indica el total de la deuda para empezar."}
                  </td>
                </tr>
              )}
            </tbody>
            {!!rows.length && (
              <tfoot>
                <tr>
                  <th scope="row">Total del calendario</th>
                  <td>{euro(totals.paid)}</td>
                  <td>{euro(totals.reserved)}</td>
                  <td>
                    {euro(
                      sum(
                        rows
                          .filter((r) => r.status === "pending")
                          .map((r) => r.amount),
                      ),
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {debt && calendarTotal < debt.total && (
          <p className="unplanned-debt">
            {euro(debt.total - calendarTotal)} sin mes asignado.
          </p>
        )}
        <PanelInfo title="Calendario de pagos">
          Pagado: dinero ya abonado al dentista. Apartado: dinero preparado que
          todavía no has pagado. Pendiente: dinero que aún falta preparar y
          pagar. Falta por pagar incluye el dinero apartado. Cambiar una cuota
          actualiza únicamente esta deuda; no modifica el saldo diario, el
          ahorro, la inversión ni la deuda interna.
        </PanelInfo>
      </section>
      {modal && (
        <ModalFrame onClose={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dental-modal-title"
          >
            <div className="section-title">
              <h3 id="dental-modal-title">
                {modal === "total"
                  ? "Deuda del dentista"
                  : selected
                    ? "Editar cuota"
                    : "Añadir cuota"}
              </h3>
              <button
                className="icon"
                aria-label="Cerrar formulario"
                onClick={() => setModal(null)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={submit}>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-grid">
                {modal === "installment" && (
                  <fieldset className="month-selection">
                    <legend>Mes de la cuota</legend>
                    <div className="month-selection-grid">
                      <label>
                        Mes
                        <select
                          aria-label="Mes de la cuota"
                          value={month.slice(5)}
                          disabled={!!selected}
                          onChange={(e) =>
                            setMonth(`${month.slice(0, 4)}-${e.target.value}`)
                          }
                        >
                          {months.map((name, i) => (
                            <option
                              key={name}
                              value={String(i + 1).padStart(2, "0")}
                            >
                              {name.charAt(0).toUpperCase() + name.slice(1)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Año
                        <select
                          aria-label="Año de la cuota"
                          value={month.slice(0, 4)}
                          disabled={!!selected}
                          onChange={(e) =>
                            setMonth(`${e.target.value}-${month.slice(5)}`)
                          }
                        >
                          {years.map((y) => (
                            <option key={y}>{y}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </fieldset>
                )}
                <label className="full">
                  {modal === "total"
                    ? "Deuda total (€)"
                    : "Importe de la cuota (€)"}
                  <input
                    name="amount"
                    required
                    inputMode="decimal"
                    defaultValue={
                      modal === "total"
                        ? debt
                          ? debt.total / 100
                          : ""
                        : selected
                          ? selected.amount / 100
                          : ""
                    }
                  />
                </label>
                {modal === "installment" && (
                  <fieldset className="installment-status full">
                    <legend>Estado de la cuota</legend>
                    <div className="installment-status-options">
                      {statuses.map((s) => (
                        <label
                          key={s.value}
                          className={`installment-status-choice debt-${s.value}`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value={s.value}
                            defaultChecked={
                              (selected?.status ?? "pending") === s.value
                            }
                          />
                          <span>{s.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
              <div className="modal-footer dental-modal-footer">
                {modal === "installment" && selected && (
                  <button
                    type="button"
                    className="remove-installment"
                    onClick={removeInstallment}
                  >
                    Eliminar cuota
                  </button>
                )}
                <button type="button" onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="primary">
                  Guardar
                </button>
              </div>
            </form>
          </section>
        </ModalFrame>
      )}
    </>
  );
}
