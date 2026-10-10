import { Button } from "../../../shared/ui/index.tsx";
import MonthSelector from "../../../shared/components/MonthSelector.tsx";
import ModalFrame from "../../../shared/components/ModalFrame.tsx";
import {
  type Profile,
  currentMonth,
  wealthTotals,
  cashTotals,
  debtTotals,
  monthName,
  today,
  euro,
  debtItemPaid,
} from "../../../domain/index.ts";
import { type Modal } from "../types.ts";
import { useState, useMemo } from "react";
import { X, Trash2 } from "lucide-react";

type Props = {
  data: Profile;
  modal: Exclude<NonNullable<Modal>, { type: "settings" | "placement" }>;
  formError: string;
  close: () => void;
  submit: (event: React.FormEvent<HTMLFormElement>, month: string) => void;
};
export default function ProfileForms({
  data,
  modal,
  formError,
  close,
  submit,
}: Props) {
  const [monthSelection, setMonthSelection] = useState(
    modal.type === "month"
      ? (modal.item?.month ?? currentMonth())
      : currentMonth(),
  );
  const { wealth, daily, debt } = useMemo(
    () => ({
      wealth: wealthTotals(data),
      daily: cashTotals(data),
      debt: debtTotals(data),
    }),
    [data],
  );
  const selectedMonthly =
    modal?.type === "month"
      ? data[modal.kind as "savings" | "investment"].find(
          (row) => row.month === monthSelection,
        )
      : undefined;
  const selectableYears = [
    ...new Set(
      [...data.savings, ...data.investment]
        .map((row) => row.month.slice(0, 4))
        .concat(
          Array.from({ length: 11 }, (_, index) =>
            String(Number(currentMonth().slice(0, 4)) - 5 + index),
          ),
          data.plan.horizon.slice(0, 4),
          monthSelection.slice(0, 4),
        ),
    ),
  ].sort((a, b) => b.localeCompare(a));
  const modalTitles = {
    cash:
      modal.type === "cash" && modal.kind === "expenses" ? "Gasto" : "Ingreso",
    balance: "Saldo actual de ING",
    cashBalance: "Actualizar efectivo",
    mortgageBalance: "Actualizar hipoteca ofrecida",
    possibleExpense: "Posible gasto",
    month: "Registro mensual",
    interestBalance: "Actualizar intereses",
    withdraw: "Añadir deuda interna",
    editDebt: "Editar deuda interna",
    deleteDebt: "Borrar deuda interna",
    repay: "Devolver deuda interna",
    schedule: "Distribución mensual",
    plan: "Editar plan mensual",
  };
  const field = (
    label: string,
    name: string,
    value: string | number = "",
    type = "text",
    required = true,
  ) => (
    <label>
      {label}
      <input
        required={required}
        autoFocus={
          modal.type === "balance" ||
          modal.type === "cashBalance" ||
          modal.type === "mortgageBalance" ||
          modal.type === "interestBalance" ||
          (modal.type === "plan" && name === "saving")
        }
        name={name}
        type={type}
        defaultValue={value}
        inputMode={
          type === "text" && name !== "concept" ? "decimal" : undefined
        }
      />
    </label>
  );
  return (
    <ModalFrame onClose={close}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <div className="section-title">
          <h3 id="profile-modal-title">{modalTitles[modal.type]}</h3>
          <Button
            className="icon"
            aria-label="Cerrar formulario"
            onClick={() => close()}
          >
            <X />
          </Button>
        </div>
        <form onSubmit={(event) => submit(event, monthSelection)}>
          {formError && (
            <p className="error" role="alert">
              {formError}
            </p>
          )}
          <div className="form-grid">
            {modal.type === "cash" && (
              <>
                {field("Concepto", "concept", modal.item?.concept || "")}
                {field(
                  "Importe (€)",
                  "amount",
                  modal.item?.amount !== undefined
                    ? modal.item.amount / 100
                    : "",
                )}
              </>
            )}
            {modal.type === "balance" &&
              field("Saldo actual (€)", "amount", daily.current / 100)}
            {modal.type === "cashBalance" &&
              field("Efectivo (€)", "amount", (data.cash ?? 0) / 100)}
            {modal.type === "possibleExpense" && (
              <>
                {field("Concepto", "concept", modal.item?.concept ?? "")}
                {field(
                  "Importe estimado (€)",
                  "amount",
                  modal.item ? modal.item.amount / 100 : "",
                )}
              </>
            )}
            {modal.type === "mortgageBalance" &&
              field(
                "Hipoteca ofrecida (€)",
                "amount",
                (data.mortgageOffer ?? 0) / 100,
              )}
            {modal.type === "interestBalance" &&
              field(
                "Intereses acumulados (€)",
                "amount",
                wealth.interest / 100,
              )}
            {modal.type === "month" && (
              <>
                <MonthSelector
                  month={monthSelection}
                  years={selectableYears}
                  onChange={setMonthSelection}
                  disabled={!!modal.item?.month}
                  legend="Mes del registro"
                  monthLabel="Mes del registro"
                  yearLabel="Año del registro"
                >
                  <p>
                    {monthName(monthSelection)}
                    {selectedMonthly?.actual !== null &&
                    selectedMonthly?.actual !== undefined
                      ? " · Actualizarás un mes ya registrado"
                      : " · Nuevo importe o previsión"}
                  </p>
                </MonthSelector>
                <div className="month-value-fields" key={monthSelection}>
                  {field(
                    "Objetivo base (€)",
                    "goal",
                    selectedMonthly
                      ? selectedMonthly.goal === null
                        ? ""
                        : selectedMonthly.goal / 100
                      : (modal.kind === "savings"
                          ? data.plan.saving
                          : data.plan.investment) / 100,
                    "text",
                    false,
                  )}
                  {field(
                    modal.kind === "savings"
                      ? "Ahorrado neto (€)"
                      : "Invertido (€)",
                    "actual",
                    selectedMonthly?.actual !== undefined &&
                      selectedMonthly.actual !== null
                      ? selectedMonthly.actual / 100
                      : "",
                    "text",
                    false,
                  )}
                </div>
                <p className="form-note">
                  Deja el importe vacío si aún es una previsión. Las
                  reposiciones se registran en Deuda interna.
                </p>
              </>
            )}
            {modal.type === "withdraw" && (
              <>
                {field("Concepto", "concept", "")}
                {field("Importe (€)", "amount", "")}
                {field("Fecha", "date", today(), "date")}
                <p className="form-note">
                  El importe se resta del ahorro por trabajo del mes
                  seleccionado y se añade a tu deuda interna.
                </p>
              </>
            )}
            {modal.type === "editDebt" && (
              <>
                {field("Concepto", "concept", modal.item.concept)}
                {field(
                  "Importe retirado (€)",
                  "amount",
                  modal.item.amount / 100,
                )}
                {field("Fecha", "date", modal.item.date, "date")}
                <p className="form-note">
                  Ya has repuesto {euro(debtItemPaid(data, modal.item.id))}.{" "}
                  {modal.item.historical
                    ? "Esta retirada es histórica: editarla actualiza la deuda pendiente sin modificar el ahorro ya contabilizado."
                    : "El ahorro se ajustará al nuevo importe y a la fecha seleccionada."}
                </p>
              </>
            )}
            {modal.type === "deleteDebt" && (
              <div className="delete-debt-summary">
                <span className="delete-debt-icon">
                  <Trash2 size={24} />
                </span>
                <h4>{modal.item.concept}</h4>
                <p>
                  Se borrará esta deuda de {euro(modal.item.amount)} y las
                  reposiciones asociadas a ella (
                  {euro(debtItemPaid(data, modal.item.id))}).
                </p>
                <p>
                  {modal.item.historical
                    ? "El ahorro histórico ya contabilizado se conserva. Las reposiciones nuevas de esta deuda se descontarán del ahorro."
                    : "Se restaurará la retirada en su ahorro de origen y se descontarán las reposiciones nuevas de esta deuda."}
                </p>
              </div>
            )}
            {modal.type === "repay" && (
              <>
                {field(
                  "Importe (€)",
                  "amount",
                  Math.min(data.plan.repayment, debt.pending) / 100,
                )}
                {field("Fecha", "date", today(), "date")}
                <p className="form-note">
                  El importe reduce tu deuda interna y se suma al ahorro por
                  trabajo del mes seleccionado. Se registra aparte de la
                  aportación base.
                </p>
              </>
            )}
            {modal.type === "schedule" && (
              <>
                <div className="schedule-month-label">
                  {monthName(modal.item.month)}
                  <small>Personaliza la reposición de este mes</small>
                </div>
                <input type="hidden" name="month" value={modal.item.month} />
                {field(
                  "Reposición prevista (€)",
                  "amount",
                  modal.item.amount / 100,
                )}
                <p className="form-note">
                  Puedes indicar 0 para saltar este mes. El resto de la
                  distribución se recalcula con la deuda pendiente.
                </p>
              </>
            )}
            {modal.type === "plan" && (
              <>
                {field("Ahorro mensual (€)", "saving", data.plan.saving / 100)}
                {field(
                  "Inversión mensual (€)",
                  "investment",
                  data.plan.investment / 100,
                )}
                {field(
                  "Reposición mensual (€)",
                  "repayment",
                  data.plan.repayment / 100,
                )}
                {field("Inicio del plan", "start", data.plan.start, "month")}
                {field(
                  "Previsión hasta",
                  "horizon",
                  data.plan.horizon,
                  "month",
                )}
                {field(
                  "Objetivo de ahorro (€)",
                  "target",
                  data.plan.savingsTarget === null
                    ? ""
                    : data.plan.savingsTarget / 100,
                  "text",
                  false,
                )}
              </>
            )}
          </div>
          {modal.type === "balance" && (
            <p className="form-note">
              Este es el dinero que tienes ahora. Los gastos e ingresos de las
              tablas se mantienen para calcular la previsión.
            </p>
          )}
          <div className="modal-footer">
            <Button type="button" onClick={() => close()}>
              Cancelar
            </Button>
            <Button
              className={
                modal.type === "deleteDebt" ? "delete-confirm" : "primary"
              }
              type="submit"
            >
              {modal.type === "deleteDebt" ? "Borrar deuda" : "Guardar"}
            </Button>
          </div>
        </form>
      </section>
    </ModalFrame>
  );
}
