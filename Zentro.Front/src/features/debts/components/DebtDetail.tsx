import InlineEdit from "../../../shared/components/InlineEdit.tsx";
import { AnimatePresence } from "motion/react";
import DebtPaymentWatch from "./DebtPaymentWatch.tsx";
import MetricCard from "../../../shared/components/MetricCard.tsx";
import { Button, Surface } from "../../../shared/ui/index.tsx";
import MonthSelector from "../../../shared/components/MonthSelector.tsx";
import ModalFrame from "../../../shared/components/ModalFrame.tsx";
import { Fragment, useState } from "react";
import { ArrowUpDown, Plus, X } from "lucide-react";
import {
  addMonth,
  cents,
  currentMonth,
  euro,
  externalDebtTotals,
  installmentAmounts,
  withInstallmentAmounts,
  editInstallmentAmount,
  monthName,
  sum,
  validateProfile,
  recordDebtActivity,
  type Profile,
  type DebtInstallment,
  type ExternalDebt,
} from "../../../domain/index.ts";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";
import DebtAnalytics from "./DebtAnalytics.tsx";

export default function DebtDetail({
  profile,
  onSave,
  debt,
  onFullyPaid,
}: {
  profile: Profile;
  onSave: (profile: Profile) => boolean;
  debt: ExternalDebt;
  onFullyPaid: (debt: ExternalDebt) => void;
}) {
  const editable = !debt.completedOn && !debt.archivedOn;
  const [descending, setDescending] = useState(false);
  const [modal, setModal] = useState<"total" | "installment" | null>(null);
  const [selected, setSelected] = useState<DebtInstallment>();
  const [month, setMonth] = useState(currentMonth());
  const [error, setError] = useState("");
  const rows = [...debt.installments].sort((a, b) =>
    descending
      ? b.month.localeCompare(a.month)
      : a.month.localeCompare(b.month),
  );
  const totals = externalDebtTotals(debt);
  const calendarTotal = sum([
    ...rows.map((r) => r.amount),
    ...(debt.advances ?? []).map((row) => row.amount),
  ]);
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
      debts: (profile.debts ?? []).map((d) =>
        d.id === nextDebt.id ? nextDebt : d,
      ),
    };
    validateProfile(next);
    const saved = onSave(next);
    if (
      saved &&
      debt.total > 0 &&
      externalDebtTotals(debt).remaining > 0 &&
      externalDebtTotals(nextDebt).remaining === 0
    )
      onFullyPaid(nextDebt);
    return saved;
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      const amount = cents(String(form.get("amount") ?? ""));
      const next = structuredClone(debt);
      if (modal === "total") next.total = amount;
      else {
        if (!selected && next.installments.some((r) => r.month === month))
          throw Error("Este mes ya tiene una cuota. Edítala desde la tabla.");
        next.installments = [
          ...next.installments.filter((r) => r.month !== selected?.month),
          withInstallmentAmounts(
            { month, amount, status: "pending" },
            amount,
            cents(String(form.get("paid") || "0")),
            cents(String(form.get("reserved") || "0")),
          ),
        ].sort((a, b) => a.month.localeCompare(b.month));
      }
      if (
        saveDebt(
          recordDebtActivity(
            next,
            modal === "total"
              ? `Total actualizado a ${euro(next.total)}.`
              : `Cuota de ${monthName(month)}: ${euro(amount)}, ${euro(cents(String(form.get("paid") || "0")))} pagados, ${euro(cents(String(form.get("reserved") || "0")))} apartados.`,
          ),
        )
      )
        setModal(null);
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
        saveDebt(
          recordDebtActivity(
            {
              ...debt,
              installments: debt.installments.filter(
                (r) => r.month !== selected.month,
              ),
            },
            `Eliminada la cuota de ${monthName(selected.month)}.`,
          ),
        )
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
      <div className="cards three external-debt-primary">
        <MetricCard
          label="Deuda total"
          amount={totals.total}
          note="Importe acordado"
          tone="lilac"
          action={{
            label: "Actualizar total",
            onClick: openTotal,
            disabled: !editable,
          }}
        />
        <MetricCard
          label="Ya pagado"
          amount={totals.paid}
          note={`${euro(totals.paid + totals.reserved)} pagados o preparados`}
          tone="sage"
        />
        <MetricCard
          label="Falta por pagar"
          amount={totals.remaining}
          note={`${euro(totals.reserved)} apartados · ${euro(totals.pending)} por preparar`}
          tone="rose"
        />
      </div>
      <DebtPaymentWatch debts={[debt]} />
      <DebtAnalytics debt={debt} />
      <section className={`panel history-panel external-debt-panel`}>
        <div className="section-title table-heading">
          <div>
            <span className="table-eyebrow">CUOTA A CUOTA</span>
            <h3>Calendario de pagos</h3>
          </div>
          <div className="history-actions">
            <div className="history-order">
              <Button
                onClick={() => setDescending(!descending)}
                aria-label="Cambiar orden de las cuotas"
              >
                <ArrowUpDown size={16} />
                {descending ? "Recientes primero" : "Antiguos primero"}
              </Button>
            </div>

            <Button
              className="history-edit-toggle"
              disabled={!editable}
              onClick={() => openInstallment()}
            >
              <Plus size={16} />
              Añadir mes
            </Button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="monthly-history debt-payment-history">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Cuota</th>
                <th>Pagado</th>
                <th>Apartado</th>
                <th>Por preparar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const amounts = installmentAmounts(row);
                const update = (
                  field: "amount" | "paid" | "reserved",
                  value: string | number | null,
                ) =>
                  saveDebt({
                    ...debt,
                    installments: debt.installments.map((item) =>
                      item.month === row.month
                        ? editInstallmentAmount(item, field, Number(value))
                        : item,
                    ),
                  });
                return (
                  <Fragment key={row.month}>
                    {(i === 0 ||
                      rows[i - 1].month.slice(0, 4) !==
                        row.month.slice(0, 4)) && (
                      <tr className="history-year">
                        <th colSpan={5} scope="rowgroup">
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
                      <td className="debt-installment-month">
                        <Button
                          className="history-month-edit"
                          aria-label={"Editar cuota " + row.month}
                          disabled={!editable}
                          onClick={() => openInstallment(row)}
                        >
                          {monthName(row.month).replace(/ de \d{4}$/, "")}
                        </Button>
                      </td>
                      <td data-label="Cuota">
                        <InlineEdit
                          label={"Cuota " + row.month}
                          value={row.amount}
                          disabled={!editable}
                          onSave={(value) => update("amount", value)}
                        />
                      </td>
                      <td data-label="Pagado" className="debt-column-paid">
                        <InlineEdit
                          label={"Pagado " + row.month}
                          value={amounts.paid}
                          disabled={!editable}
                          onSave={(value) => update("paid", value)}
                        />
                      </td>
                      <td
                        data-label="Apartado"
                        className="debt-column-reserved"
                      >
                        <InlineEdit
                          label={"Apartado " + row.month}
                          value={amounts.reserved}
                          disabled={!editable}
                          onSave={(value) => update("reserved", value)}
                        />
                      </td>
                      <td
                        data-label="Por preparar"
                        className="debt-column-pending"
                      >
                        <span className="debt-amount debt-pending">
                          {euro(amounts.pending)}
                        </span>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="empty">
                    Añade las cuotas de esta deuda.
                  </td>
                </tr>
              )}
            </tbody>
            {!!rows.length && (
              <tfoot>
                <tr>
                  <th scope="row">Total del calendario</th>
                  <td data-label="Cuota">
                    {euro(sum(rows.map((row) => row.amount)))}
                  </td>
                  <td data-label="Pagado">
                    {euro(sum(rows.map((row) => installmentAmounts(row).paid)))}
                  </td>
                  <td data-label="Apartado">{euro(totals.reserved)}</td>
                  <td data-label="Por preparar">
                    {euro(
                      sum(rows.map((row) => installmentAmounts(row).pending)),
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {calendarTotal < debt.total && (
          <p className="unplanned-debt">
            {euro(debt.total - calendarTotal)} sin mes asignado.
          </p>
        )}
        <PanelInfo title="Calendario de pagos">
          Pulsa un importe para editarlo. Enter o salir del campo guarda; Escape
          cancela. Al registrar un pago se descuenta primero del dinero
          apartado. Pagado: dinero ya abonado. Apartado: dinero preparado que
          todavía no has pagado. Pendiente: dinero que aún falta preparar y
          pagar. Falta por pagar incluye el dinero apartado. Cambiar una cuota
          actualiza únicamente esta deuda; no modifica el saldo diario, el
          ahorro, la inversión ni la deuda interna.
        </PanelInfo>
      </section>
      {!!debt.advances?.length && (
        <Surface component="section" className="panel debt-advances-panel">
          <div className="section-title">
            <h3>Adelantos realizados</h3>
            <strong>{euro(sum(debt.advances.map((row) => row.amount)))}</strong>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Adelantado</th>
                  <th>Opción aplicada</th>
                </tr>
              </thead>
              <tbody>
                {[...debt.advances].reverse().map((row) => (
                  <tr key={row.id}>
                    <td>
                      {new Date(row.date + "T12:00:00").toLocaleDateString(
                        "es-ES",
                      )}
                    </td>
                    <td>{euro(row.amount)}</td>
                    <td>
                      {row.strategy === "term"
                        ? "Reducir cuotas"
                        : "Reducir importe"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PanelInfo title="Adelantos realizados">
            Estos pagos forman parte de «Ya pagado» y se suman a tus cuotas
            abonadas. Cada adelanto conserva su fecha y la opción aceptada en el
            simulador.
          </PanelInfo>
        </Surface>
      )}
      <AnimatePresence>
        {modal && (
          <ModalFrame onClose={() => setModal(null)}>
            <section
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="debt-installment-title"
            >
              <div className="section-title">
                <h3 id="debt-installment-title">
                  {modal === "total"
                    ? `Total de ${debt.name}`
                    : selected
                      ? "Editar cuota"
                      : "Añadir cuota"}
                </h3>
                <Button
                  className="icon"
                  aria-label="Cerrar formulario"
                  onClick={() => setModal(null)}
                >
                  <X />
                </Button>
              </div>
              <form onSubmit={submit}>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <div className="form-grid">
                  {modal === "installment" && (
                    <MonthSelector
                      month={month}
                      years={years}
                      onChange={setMonth}
                      disabled={!!selected}
                      legend="Mes de la cuota"
                      monthLabel="Mes de la cuota"
                      yearLabel="Año de la cuota"
                    />
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
                    <>
                      <label>
                        Ya pagado (€)
                        <input
                          name="paid"
                          inputMode="decimal"
                          defaultValue={
                            selected
                              ? installmentAmounts(selected).paid / 100
                              : 0
                          }
                          required
                        />
                      </label>
                      <label>
                        Dinero apartado (€)
                        <input
                          name="reserved"
                          inputMode="decimal"
                          defaultValue={
                            selected
                              ? installmentAmounts(selected).reserved / 100
                              : 0
                          }
                          required
                        />
                      </label>
                    </>
                  )}
                </div>
                <div className="modal-footer debt-installment-footer">
                  {modal === "installment" && selected && (
                    <Button
                      type="button"
                      className="remove-installment"
                      onClick={removeInstallment}
                    >
                      Eliminar cuota
                    </Button>
                  )}
                  <Button type="button" onClick={() => setModal(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="primary">
                    Guardar
                  </Button>
                </div>
              </form>
            </section>
          </ModalFrame>
        )}
      </AnimatePresence>
    </>
  );
}
