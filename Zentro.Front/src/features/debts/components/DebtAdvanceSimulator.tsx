import { Button } from "../../../shared/ui/index.tsx";
import { useState } from "react";
import { X, CalendarMinus, Coins, ArrowRight, Calculator } from "lucide-react";
import ModalFrame from "../../../shared/components/ModalFrame.tsx";
import {
  applyDebtAdvance,
  simulateDebtAdvance,
  cents,
  euro,
  externalDebtTotals,
  monthName,
  type ExternalDebt,
  type DebtAdvance,
} from "../../../domain/index.ts";

export default function DebtAdvanceSimulator({
  debt,
  onApply,
  onClose,
}: {
  debt: ExternalDebt;
  onApply: (debt: ExternalDebt) => boolean;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [strategy, setStrategy] = useState<DebtAdvance["strategy"]>("term");
  const [error, setError] = useState("");
  const totals = externalDebtTotals(debt);
  let amount = 0,
    inputError = "";
  if (input.trim()) {
    try {
      amount = cents(input);
      if (amount <= 0 || amount > totals.remaining)
        throw Error(
          "El adelanto debe ser mayor que cero y no superar lo pendiente.",
        );
    } catch (err) {
      inputError = err instanceof Error ? err.message : "Revisa el importe.";
    }
  }
  const options = (["term", "payment"] as const).map((option) => {
    try {
      return {
        option,
        simulation:
          amount > 0 && !inputError
            ? simulateDebtAdvance(debt, amount, option)
            : null,
        error: "",
      };
    } catch (err) {
      return {
        option,
        simulation: null,
        error: err instanceof Error ? err.message : "No se puede simular.",
      };
    }
  });
  const selected = options.find(
    (option) => option.option === strategy,
  )?.simulation;
  function apply() {
    try {
      if (onApply(applyDebtAdvance(debt, amount, strategy))) onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el adelanto.",
      );
    }
  }
  return (
    <ModalFrame onClose={onClose}>
      <section
        className="modal debt-advance-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="debt-advance-title"
      >
        <div className="section-title">
          <h3 id="debt-advance-title">
            <Calculator size={23} />
            Valorar un adelanto
          </h3>
          <Button
            className="icon"
            aria-label="Cerrar simulador"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        <p className="advance-intro">
          {debt.name} · <strong>{euro(totals.remaining)}</strong> por pagar
        </p>
        <label className="advance-input">
          ¿Cuánto quieres adelantar? (€)
          <input
            inputMode="decimal"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError("");
            }}
            placeholder="Por ejemplo, 500"
            aria-describedby="advance-input-help"
          />
        </label>
        <p id="advance-input-help" className="advance-help">
          Prueba las dos opciones. Tus datos se conservan hasta que aceptes.
        </p>
        {(inputError || error) && (
          <p className="error" role="alert">
            {inputError || error}
          </p>
        )}
        <div
          className="advance-options"
          role="group"
          aria-label="Opciones de adelanto"
        >
          {options.map(({ option, simulation, error: optionError }) => (
            <Button
              key={option}
              className={`advance-option${strategy === option ? " selected" : ""}`}
              aria-pressed={strategy === option}
              onClick={() => setStrategy(option)}
              disabled={!!optionError}
            >
              {option === "term" ? (
                <CalendarMinus size={25} />
              ) : (
                <Coins size={25} />
              )}
              <strong>
                {option === "term" ? "Reducir cuotas" : "Reducir importe"}
              </strong>
              <span>
                {option === "term"
                  ? "Mantener las primeras cuotas y terminar antes."
                  : "Mantener los meses y repartir el saldo restante."}
              </span>
              {simulation ? (
                <div className="advance-option-results">
                  <b>{simulation.count} cuotas restantes</b>
                  <span>
                    {simulation.count
                      ? `${euro(simulation.firstAmount)} ${option === "term" ? "primera cuota" : "por cuota"}`
                      : "Sin cuotas pendientes"}
                  </span>
                  {simulation.count > 0 && (
                    <small>
                      Última: {euro(simulation.lastAmount)} ·{" "}
                      {monthName(simulation.lastMonth!)}
                    </small>
                  )}
                  {option === "term" && (
                    <small>
                      {simulation.removed}{" "}
                      {simulation.removed === 1
                        ? "cuota menos"
                        : "cuotas menos"}
                    </small>
                  )}
                </div>
              ) : (
                <small>
                  {optionError || "Introduce un importe para comparar."}
                </small>
              )}
            </Button>
          ))}
        </div>
        {selected && (
          <div className="advance-review" aria-live="polite">
            <span>Saldo pendiente</span>
            <strong>
              {euro(totals.remaining)}
              <ArrowRight size={17} />
              {euro(selected.balance)}
            </strong>
            <small>
              Al aceptar se registran {euro(amount)} como pagados hoy y se
              actualizan las cuotas. El total original y los pagos anteriores se
              conservan. Si una cuota queda apartada, su nuevo importe sigue
              apartado. No se modifica tu saldo diario, ahorro ni inversión.
            </small>
          </div>
        )}
        <div className="modal-footer debt-editor-footer">
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            className="primary"
            disabled={!selected || !!inputError}
            onClick={apply}
          >
            Aceptar y registrar adelanto
          </Button>
        </div>
      </section>
    </ModalFrame>
  );
}
