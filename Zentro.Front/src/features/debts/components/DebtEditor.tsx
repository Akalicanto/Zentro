import { Button } from "../../../shared/ui/index.tsx";
import { useState } from "react";
import { X } from "lucide-react";
import ModalFrame from "../../../shared/components/ModalFrame.tsx";
import {
  cents,
  uid,
  today,
  currentMonth,
  euro,
  externalDebtTotals,
  planDebtInstallments,
  recordDebtActivity,
  completeDebt,
  archiveDebt,
  type ExternalDebt,
} from "../../../domain/index.ts";

export type DebtEditorMode =
  "create" | "edit" | "plan" | "complete" | "archive";
export default function DebtEditor({
  mode,
  debt,
  onSave,
  onClose,
}: {
  mode: DebtEditorMode;
  debt?: ExternalDebt;
  onSave: (debt: ExternalDebt) => boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [plan, setPlan] = useState(false);
  const title = {
    create: "Añadir deuda",
    edit: "Editar deuda",
    plan: "Planificar cuotas",
    complete: "¿Completar esta deuda?",
    archive: "Eliminar deuda",
  }[mode];
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      let next: ExternalDebt;
      if (mode === "complete") next = completeDebt(debt!);
      else if (mode === "archive") next = archiveDebt(debt!);
      else if (mode === "plan")
        next = planDebtInstallments(
          debt!,
          String(form.get("start")),
          Number(form.get("count")),
        );
      else {
        const total = cents(String(form.get("amount")));
        if (total <= 0)
          throw Error("La deuda debe tener un importe mayor que cero.");
        const name = String(form.get("name")).trim();
        if (!name) throw Error("Pon un nombre a la deuda.");
        next = recordDebtActivity(
          {
            ...debt,
            id: debt?.id ?? uid(),
            name,
            total,
            dueDay: form.get("dueDay") ? Number(form.get("dueDay")) : undefined,
            installments: debt?.installments ?? [],
            notes: String(form.get("notes") ?? "").trim(),
            createdOn:
              debt?.createdOn ?? (mode === "create" ? today() : undefined),
          },
          mode === "create"
            ? "Deuda creada."
            : "Nombre, total, día de cobro o notas actualizados.",
        );
        if (mode === "create" && plan)
          next = planDebtInstallments(
            next,
            String(form.get("start")),
            Number(form.get("count")),
          );
      }
      if (onSave(next)) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisa los datos.");
    }
  }
  return (
    <ModalFrame onClose={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="debt-editor-title"
      >
        <div className="section-title">
          <h3 id="debt-editor-title">{title}</h3>
          <Button
            className="icon"
            aria-label="Cerrar formulario"
            onClick={onClose}
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
          {(mode === "create" || mode === "edit") && (
            <div className="form-grid">
              <label className="full">
                Nombre de la deuda
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={debt?.name ?? ""}
                  autoFocus
                />
              </label>
              <label className="full">
                Deuda total (€)
                <input
                  name="amount"
                  required
                  inputMode="decimal"
                  defaultValue={debt ? debt.total / 100 : ""}
                />
              </label>
              <label className="full">
                Día de cobro de cada mes
                <select
                  name="dueDay"
                  aria-label="Día de cobro de cada mes"
                  aria-describedby="debt-due-day-help"
                  defaultValue={debt?.dueDay ?? (mode === "create" ? 1 : "")}
                >
                  <option value="">Sin día definido</option>
                  {Array.from({ length: 31 }, (_, index) => index + 1).map(
                    (day) => (
                      <option key={day} value={day}>
                        {day === 31
                          ? "31 · último día si el mes es más corto"
                          : day}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <p className="form-note full" id="debt-due-day-help">
                Si el mes no tiene ese día, vence el último día del mes.
              </p>
              <label className="full">
                Notas
                <textarea
                  name="notes"
                  maxLength={2000}
                  rows={3}
                  defaultValue={debt?.notes ?? ""}
                  placeholder="Condiciones, contacto o cualquier detalle útil"
                />
              </label>
              {mode === "create" && (
                <label className="debt-plan-option full">
                  <input
                    type="checkbox"
                    checked={plan}
                    onChange={(e) => setPlan(e.target.checked)}
                  />{" "}
                  Crear un calendario de cuotas
                </label>
              )}
            </div>
          )}
          {(mode === "plan" || plan) && (
            <div className="form-grid debt-plan-fields">
              <label>
                Primer mes
                <input
                  type="month"
                  name="start"
                  required
                  defaultValue={currentMonth()}
                />
              </label>
              <label>
                Número de cuotas
                <input
                  type="number"
                  name="count"
                  min={1}
                  max={120}
                  required
                  defaultValue={12}
                />
              </label>
              <p className="form-note full">
                Repartiremos el importe sin calendario en cuotas iguales. La
                última ajusta los céntimos. Las cuotas existentes se conservan.
              </p>
            </div>
          )}
          {mode === "complete" && (
            <div className="debt-confirm-summary">
              <strong>{debt?.name}</strong>
              {externalDebtTotals(debt!).remaining === 0 ? (
                <p>
                  Has pagado todas las cuotas. ¿Quieres marcar esta deuda como
                  completada?
                </p>
              ) : (
                <p>
                  ¿Seguro que ya has pagado todo? Al completar la deuda se
                  marcarán como pagados los{" "}
                  <strong>{euro(externalDebtTotals(debt!).remaining)}</strong>{" "}
                  que aún figuran pendientes.
                </p>
              )}
              <small>
                Se guardará en el historial de deudas completadas con sus cuotas
                y su fecha de cierre.
              </small>
            </div>
          )}
          {mode === "archive" && (
            <p className="debt-confirm-copy">
              Se quitará <strong>{debt?.name}</strong> de las deudas activas y
              del calendario financiero. Sus cuotas e historial se conservarán
              en «Eliminadas», desde donde podrás recuperarla.
            </p>
          )}
          <div className="modal-footer debt-editor-footer">
            <Button type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className={mode === "archive" ? "delete-confirm" : "primary"}
            >
              {mode === "archive"
                ? "Eliminar y conservar historial"
                : mode === "complete"
                  ? "Confirmar deuda completada"
                  : "Guardar"}
            </Button>
          </div>
        </form>
      </section>
    </ModalFrame>
  );
}
