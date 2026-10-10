import ModalFrame from "../../../shared/components/ModalFrame.tsx";
import { useState } from "react";
import { X } from "lucide-react";
import {
  cents,
  uid,
  validateProfile,
  savingsDistribution,
  type Profile,
  type SavingsPlacement,
} from "../../../domain/index.ts";
import type { SaveProfile } from "../../profile/types.ts";
export default function PlacementForm({
  profile,
  onSave,
  onClose,
  initialPlacement,
}: {
  profile: Profile;
  onSave: SaveProfile;
  onClose: () => void;
  initialPlacement?: SavingsPlacement;
}) {
  const [kind, setKind] = useState<SavingsPlacement["kind"]>(
    initialPlacement?.kind ?? "deposit",
  );
  const [automatic, setAutomatic] = useState(initialPlacement?.amount === null);
  const [error, setError] = useState("");
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget),
        text = (key: string) => String(form.get(key) ?? "").trim();
      const row: SavingsPlacement = {
        id: initialPlacement?.id ?? uid(),
        name: text("name"),
        kind,
        amount:
          kind === "remunerated" && automatic ? null : cents(text("amount")),
        annualRateBps: cents(text("rate")),
        rateType: text("rateType") as SavingsPlacement["rateType"],
        dayCount:
          kind === "remunerated"
            ? (text("dayCount") as SavingsPlacement["dayCount"])
            : "monthly",
        withholdingBps: cents(text("tax")),
        start: kind === "deposit" ? text("start") : null,
        months: kind === "deposit" ? Number(text("months")) : null,
      };
      const next = {
        ...profile,
        savingsPlacements: initialPlacement
          ? (profile.savingsPlacements ?? []).map((r) =>
              r.id === row.id ? row : r,
            )
          : [...(profile.savingsPlacements ?? []), row],
      };
      validateProfile(next);
      if (savingsDistribution(next).excess > 0)
        throw Error(
          "Los importes asignados superan el ahorro total. Revisa el capital de los destinos.",
        );
      if (onSave(next)) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisa el destino.");
    }
  }

  return (
    <ModalFrame onClose={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="placement-modal-title"
      >
        <div className="section-title">
          <h3 id="placement-modal-title">
            {initialPlacement
              ? "Editar destino del ahorro"
              : "Nuevo destino del ahorro"}
          </h3>
          <button
            className="icon"
            aria-label="Cerrar formulario"
            onClick={() => onClose()}
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
            <label className="full">
              Nombre del destino
              <input
                required
                name="name"
                defaultValue={initialPlacement?.name ?? ""}
              />
            </label>
            <label>
              Tipo
              <select
                aria-label="Tipo"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as SavingsPlacement["kind"]);
                  setAutomatic(false);
                }}
              >
                <option value="deposit">Depósito</option>
                <option value="remunerated">Cuenta remunerada</option>
              </select>
            </label>
            <label>
              Capital (€)
              <input
                required={!automatic}
                name="amount"
                inputMode="decimal"
                disabled={automatic}
                defaultValue={
                  initialPlacement?.amount !== null &&
                  initialPlacement?.amount !== undefined
                    ? initialPlacement.amount / 100
                    : ""
                }
                placeholder={automatic ? "Resto automático" : ""}
              />
            </label>
            {kind === "remunerated" && (
              <label className="automatic-placement full">
                <input
                  type="checkbox"
                  checked={automatic}
                  onChange={(e) => setAutomatic(e.target.checked)}
                />
                <span>Asignar aquí el resto del ahorro automáticamente</span>
              </label>
            )}
            <label>
              Interés anual (%)
              <input
                required
                name="rate"
                inputMode="decimal"
                defaultValue={
                  initialPlacement ? initialPlacement.annualRateBps / 100 : ""
                }
              />
            </label>
            <label>
              Tipo de interés
              <select
                name="rateType"
                aria-label="Tipo de interés"
                defaultValue={initialPlacement?.rateType ?? "tin"}
              >
                <option value="tin">TIN</option>
                <option value="tae">TAE</option>
              </select>
            </label>
            {kind === "deposit" && (
              <>
                <label>
                  Fecha de inicio
                  <input
                    type="date"
                    required
                    name="start"
                    defaultValue={initialPlacement?.start ?? ""}
                  />
                </label>
                <label>
                  Duración (meses)
                  <input
                    type="number"
                    min="1"
                    max="600"
                    step="1"
                    required
                    name="months"
                    defaultValue={initialPlacement?.months ?? ""}
                  />
                </label>
              </>
            )}
            <label>
              Retención estimada (%)
              <input
                required
                name="tax"
                inputMode="decimal"
                defaultValue={
                  initialPlacement ? initialPlacement.withholdingBps / 100 : 19
                }
              />
            </label>
            {kind === "remunerated" && (
              <label>
                Cálculo mensual
                <select
                  name="dayCount"
                  aria-label="Cálculo mensual"
                  defaultValue={initialPlacement?.dayCount ?? "monthly"}
                >
                  <option value="monthly">Mes equivalente · TIN/TAE</option>
                  <option value="actual360">Días reales / 360 · TIN</option>
                </select>
              </label>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={() => onClose()}>
              Cancelar
            </button>
            <button type="submit" className="primary">
              Guardar
            </button>
          </div>
        </form>
      </section>
    </ModalFrame>
  );
}
