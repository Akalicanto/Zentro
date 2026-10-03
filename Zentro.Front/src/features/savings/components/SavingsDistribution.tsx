import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, Landmark } from "lucide-react";
import {
  currentMonth,
  euro,
  monthName,
  savingsDistribution,
  type Profile,
  type SavingsPlacement,
} from "../../../domain/index.ts";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";
import DistributionCharts from "./DistributionCharts.tsx";
import PlacementForm from "./PlacementForm.tsx";
const percent = (bps: number) =>
  `${(bps / 100).toLocaleString("es-ES", { maximumFractionDigits: 2 })} %`;
const dateName = (date: string) => date.split("-").reverse().join("/");

export default function SavingsDistribution({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (p: Profile) => boolean;
}) {
  const distribution = useMemo(() => savingsDistribution(profile), [profile]);
  const [editing, setEditing] = useState(false);
  const [modal, setModal] = useState<{ row?: SavingsPlacement } | null>(null);
  function open(row?: SavingsPlacement) {
    setModal({ row });
  }
  function remove(row: SavingsPlacement) {
    if (
      confirm(
        `¿Quitar «${row.name}» de la distribución? El ahorro total se conserva.`,
      )
    )
      onSave({
        ...profile,
        savingsPlacements: (profile.savingsPlacements ?? []).filter(
          (r) => r.id !== row.id,
        ),
      });
  }
  return (
    <>
      <div className="cards two savings-secondary allocation-yield-summary">
        <div className="metric tone-blue">
          <span>Depósitos · neto al vencimiento</span>
          <h2>{euro(distribution.depositNet)}</h2>
          <small>Intereses previstos, sin incluir el capital</small>
        </div>
        <div className="metric tone-sage">
          <span>Cuenta remunerada · neto mensual</span>
          <h2>{euro(distribution.monthlyNet)}</h2>
          <small>Estimación de {monthName(currentMonth())}</small>
        </div>
      </div>
      {distribution.excess > 0 && (
        <p className="error" role="alert">
          La distribución supera el ahorro en {euro(distribution.excess)}.
          Actualiza los importes de los destinos.
        </p>
      )}
      <DistributionCharts distribution={distribution} />
      <div className="section-title allocation-heading">
        <div>
          <span className="table-eyebrow">CADA CÉNTIMO, EN SU SITIO</span>
          <h3>Destinos del ahorro</h3>
        </div>
        <div className="history-actions">
          <button
            className={`history-edit-toggle${editing ? " active" : ""}`}
            aria-pressed={editing}
            aria-label={
              editing
                ? "Terminar edición de distribución"
                : "Editar distribución"
            }
            onClick={() => setEditing(!editing)}
          >
            {editing ? <Check size={16} /> : <Pencil size={16} />}{" "}
            {editing ? "Terminar edición" : "Editar"}
          </button>
          <button className="history-edit-toggle" onClick={() => open()}>
            <Plus size={16} />
            Añadir destino
          </button>
        </div>
      </div>
      <div className="cards two allocation-destinations">
        {distribution.rows.map((row) => (
          <section className="panel placement-card" key={row.id}>
            <div className="placement-heading">
              <div className="placement-provider">
                {row.name.toLowerCase().includes("myinvestor") ? (
                  <img src="/logos/myinvestor.webp" alt="" />
                ) : row.name.toLowerCase().includes("trade republic") ? (
                  <img src="/logos/trade-republic.svg" alt="" />
                ) : (
                  <Landmark size={26} />
                )}
              </div>
              <div>
                <span>
                  {row.kind === "deposit" ? "Depósito" : "Cuenta remunerada"}
                </span>
                <h3>{row.name}</h3>
              </div>
              {editing && (
                <button
                  className="history-edit-toggle"
                  aria-label={`Editar destino ${row.name}`}
                  onClick={() => open(row)}
                >
                  <Pencil size={16} />
                  Editar
                </button>
              )}
            </div>
            <div className="placement-balance">
              <strong>{euro(row.balance)}</strong>
              <span>
                {distribution.total
                  ? ((100 * row.balance) / distribution.total).toLocaleString(
                      "es-ES",
                      { maximumFractionDigits: 2 },
                    )
                  : "0"}{" "}
                % del ahorro
              </span>
            </div>
            <dl className="placement-details">
              <div>
                <dt>Tipo anual</dt>
                <dd>
                  {percent(row.annualRateBps)} {row.rateType.toUpperCase()}
                </dd>
              </div>
              {row.kind === "deposit" && (
                <>
                  <div>
                    <dt>Plazo</dt>
                    <dd>{row.months} meses</dd>
                  </div>
                  <div>
                    <dt>Inicio</dt>
                    <dd>{dateName(row.start!)}</dd>
                  </div>
                  <div>
                    <dt>Vencimiento</dt>
                    <dd>{dateName(row.maturity!)}</dd>
                  </div>
                </>
              )}
              <div>
                <dt>Retención estimada</dt>
                <dd>{percent(row.withholdingBps)}</dd>
              </div>
              {row.amount === null && (
                <div>
                  <dt>Importe</dt>
                  <dd>Resto del ahorro · automático</dd>
                </div>
              )}
            </dl>
            <div className={`placement-yield ${row.kind}`}>
              <span>
                {row.kind === "deposit"
                  ? "Generará neto al finalizar"
                  : "Generará neto este mes"}
              </span>
              <strong>{euro(row.yield.net)}</strong>
              <small>
                {euro(row.yield.gross)} brutos · {euro(row.yield.withheld)} de
                retención
              </small>
            </div>
            {editing && (
              <button className="placement-remove" onClick={() => remove(row)}>
                <Trash2 size={14} />
                Quitar destino
              </button>
            )}
            <PanelInfo title={row.name}>
              {row.kind === "deposit"
                ? "El capital se mantiene separado de los intereses estimados. TIN usa interés proporcional al plazo; TAE usa el rendimiento efectivo equivalente."
                : "La estimación mantiene el saldo constante. TIN divide el tipo anual entre doce o usa Actual/360; TAE obtiene su tipo mensual equivalente."}{" "}
              La retención es editable y las estimaciones no se añaden al
              patrimonio.{" "}
              {row.name.toLowerCase().includes("trade republic") && (
                <>
                  Trade Republic calcula por días reales/360 y abona los
                  intereses mensualmente.{" "}
                  <a
                    href="https://support.traderepublic.com/es-es/1533-What-do-I-need-to-know-about-interest"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Método de cálculo
                  </a>
                  .{" "}
                </>
              )}
              {row.amount === null &&
                "El saldo toma automáticamente el ahorro que no esté asignado a otros destinos."}
            </PanelInfo>
          </section>
        ))}
      </div>
      {!distribution.rows.length && (
        <section className="panel empty">
          Añade tu depósito o una cuenta remunerada para distribuir el ahorro.
        </section>
      )}
      {modal && (
        <PlacementForm
          profile={profile}
          onSave={onSave}
          initialPlacement={modal.row}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
