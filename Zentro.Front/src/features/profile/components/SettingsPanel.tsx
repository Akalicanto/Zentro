import { Button } from "../../../shared/ui/index.tsx";
import ModalFrame from "../../../shared/components/ModalFrame.tsx";
import { useRef } from "react";
import {
  X,
  Wallet,
  Banknote,
  Sparkles,
  House,
  Pencil,
  SlidersHorizontal,
  Landmark,
  Download,
  Upload,
  ShieldCheck,
} from "lucide-react";
import {
  cashTotals,
  wealthTotals,
  euro,
  monthName,
  type Profile,
} from "../../../domain/index.ts";
import type { OpenProfileForm } from "../types.ts";

type Props = {
  data: Profile;
  open: OpenProfileForm;
  close: () => void;
  formError: string;
  exportBackup: () => void;
  importBackup: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
};

const percent = (value: number) => `${(value / 100).toLocaleString("es-ES")} %`;

export default function SettingsPanel({
  data,
  open,
  close,
  formError,
  exportBackup,
  importBackup,
}: Props) {
  const importInput = useRef<HTMLInputElement>(null);

  const balances = [
    {
      title: "Saldo actual de ING",
      note: "El dinero que tienes ahora en tu cuenta diaria.",
      value: cashTotals(data).current,
      type: "balance" as const,
      Icon: Wallet,
      tone: "violet",
    },
    {
      title: "Efectivo",
      note: "El dinero que tienes en mano.",
      value: data.cash ?? 0,
      type: "cashBalance" as const,
      Icon: Banknote,
      tone: "sage",
    },
    {
      title: "Intereses acumulados",
      note: "El saldo de intereses que tienes registrado.",
      value: wealthTotals(data).interest,
      type: "interestBalance" as const,
      Icon: Sparkles,
      tone: "peach",
    },
    {
      title: "Hipoteca ofrecida",
      note: "El importe que te ofrece el banco.",
      value: data.mortgageOffer,
      type: "mortgageBalance" as const,
      Icon: House,
      tone: "blue",
    },
  ];

  return (
    <ModalFrame onClose={close}>
      <section
        className="modal settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="settings-heading">
          <span className="settings-heading-icon">
            <SlidersHorizontal size={25} />
          </span>
          <div>
            <h2 id="settings-title">Configuración</h2>
            <p>Tus cifras y preferencias, en un solo lugar.</p>
          </div>
          <Button
            className="icon"
            aria-label="Cerrar configuración"
            onClick={close}
          >
            <X />
          </Button>
        </div>
        {formError && (
          <p className="error" role="alert">
            {formError}
          </p>
        )}
        <section
          className="settings-section"
          aria-labelledby="settings-balances-title"
        >
          <h3 id="settings-balances-title">Saldos que actualizas tú</h3>
          <div className="settings-balances">
            {balances.map(({ title, note, value, type, Icon, tone }) => (
              <article
                className={`settings-balance settings-${tone}`}
                key={type}
              >
                <div className="settings-balance-top">
                  <Icon size={22} />
                  <Button
                    className="history-edit-toggle"
                    aria-label={`Editar ${title}`}
                    onClick={() => open({ type })}
                  >
                    <Pencil size={15} />
                    Editar
                  </Button>
                </div>
                <h4>{title}</h4>
                <strong>{value == null ? "Sin indicar" : euro(value)}</strong>
                <p>{note}</p>
              </article>
            ))}
          </div>
        </section>
        <section
          className="settings-section settings-plan"
          aria-labelledby="settings-plan-title"
        >
          <div className="section-title">
            <div>
              <h3 id="settings-plan-title">Tu plan mensual</h3>
              <p>Lo que te propones aportar cada mes.</p>
            </div>
            <Button
              className="history-edit-toggle"
              aria-label="Editar plan mensual"
              onClick={() => open({ type: "plan" })}
            >
              <Pencil size={15} />
              Editar
            </Button>
          </div>
          <dl className="settings-plan-values">
            <div>
              <dt>Ahorro</dt>
              <dd>{euro(data.plan.saving)}</dd>
            </div>
            <div>
              <dt>Inversión</dt>
              <dd>{euro(data.plan.investment)}</dd>
            </div>
            <div>
              <dt>Reposición de deuda</dt>
              <dd>{euro(data.plan.repayment)}</dd>
            </div>
          </dl>
          <p className="settings-plan-dates">
            {monthName(data.plan.start)} → {monthName(data.plan.horizon)}
            {data.plan.savingsTarget !== null && (
              <span>Objetivo de ahorro: {euro(data.plan.savingsTarget)}</span>
            )}
          </p>
        </section>
        <section
          className="settings-section"
          aria-labelledby="settings-placements-title"
        >
          <h3 id="settings-placements-title">Condiciones de tu ahorro</h3>
          <p className="settings-intro">
            Capital, tipo de interés, retención y plazo de tus destinos.
          </p>
          <div className="settings-placements">
            {(data.savingsPlacements ?? []).map((row) => (
              <article className="settings-placement" key={row.id}>
                <span className="settings-provider">
                  <Landmark size={22} />
                </span>
                <div>
                  <h4>{row.name}</h4>
                  <p>
                    {percent(row.annualRateBps)} {row.rateType.toUpperCase()} ·{" "}
                    {row.amount === null
                      ? "Resto automático"
                      : euro(row.amount)}
                  </p>
                </div>
                <Button
                  className="history-edit-toggle"
                  aria-label={`Configurar ${row.name}`}
                  onClick={() => open({ type: "placement", item: row })}
                >
                  <Pencil size={15} />
                  Editar
                </Button>
              </article>
            ))}
            {!data.savingsPlacements?.length && (
              <p className="settings-intro">
                Todavía no has definido ningún destino del ahorro.
              </p>
            )}
          </div>
        </section>
        <details className="settings-backups">
          <summary>
            <ShieldCheck size={20} />
            <span>Copias de seguridad</span>
          </summary>
          <p>Exporta tus datos o recupera una copia anterior.</p>
          <div className="button-row">
            <Button onClick={exportBackup}>
              <Download size={17} />
              Exportar copia
            </Button>
            <Button onClick={() => importInput.current?.click()}>
              <Upload size={17} />
              Importar copia
            </Button>
            <input
              ref={importInput}
              aria-label="Importar copia de seguridad"
              type="file"
              hidden
              accept=".json,application/json"
              onChange={importBackup}
            />
          </div>
        </details>
      </section>
    </ModalFrame>
  );
}
