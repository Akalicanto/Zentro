import { Surface, Button } from "../../../shared/ui/index.tsx";
import {
  type Profile,
  wealthTotals,
  cashTotals,
  debtTotals,
  savingsDistribution,
  euro,
  currentMonth,
} from "../../../domain/index.ts";
import { type OpenProfileForm } from "../types.ts";
import { type Page } from "../../../app/navigation.ts";
import { useMemo } from "react";
import MetricCard from "../../../shared/components/MetricCard.tsx";
import { ArrowUpRight } from "lucide-react";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";
import Chart from "../../history/components/ContributionChart.tsx";
import MonthlyPlanning from "../../planning/components/MonthlyPlanning.tsx";
import DebtPaymentWatch from "../../debts/components/DebtPaymentWatch.tsx";

type Props = {
  data: Profile;
  open: OpenProfileForm;
  navigate: (page: Page) => void;
  setSavingsTab: (tab: string) => void;
  selectDebt: (id: string) => void;
};
export default function OverviewPage({
  data,
  open,
  navigate,
  setSavingsTab,
  selectDebt,
}: Props) {
  const { wealth, daily, debt, allocation } = useMemo(
    () => ({
      wealth: wealthTotals(data),
      daily: cashTotals(data),
      debt: debtTotals(data),
      allocation: savingsDistribution(data),
    }),
    [data],
  );
  return (
    <>
      <div className="cards home-summary">
        <MetricCard
          label="Patrimonio neto"
          amount={wealth.net}
          note="Ahorro + intereses + inversión"

          tone="lilac"
          help="El patrimonio excluye el dinero del día a día y el efectivo. La deuda interna ya reduce el ahorro y no se resta una segunda vez. La hipoteca ofrecida es una referencia, no una deuda contratada."
        />
        <MetricCard
          label="Disponibilidad · ING"
          amount={daily.current}
          note="Saldo actual del día a día"

          action={{
            label: "Ver día a día",
            onClick: () => navigate("Día a día"),
          }}
          tone="sage"
        />
        <MetricCard
          label="Efectivo"
          amount={data.cash ?? 0}
          note="Dinero en mano"

          action={{
            label: "Actualizar efectivo",
            onClick: () => open({ type: "cashBalance" }),
          }}
          tone="peach"
        />
        <MetricCard
          label="Ahorro por trabajo"
          amount={wealth.work}
          note="Aportaciones netas y reposiciones"

          action={{
            label: "Ver ahorros",
            onClick: () => navigate("Ahorros"),
          }}
          tone="blue"
        />
        <MetricCard
          label="Generado por intereses"
          amount={wealth.interest}
          note="Separado del ahorro por trabajo"

          action={{
            label: "Actualizar intereses",
            onClick: () => open({ type: "interestBalance" }),
          }}
          tone="rose"
        />
        <MetricCard
          label="Invertido en fondos"
          amount={wealth.invested}
          note="Capital aportado, sin rentabilidad variable"

          action={{
            label: "Ver inversión",
            onClick: () => navigate("Inversión"),
          }}
          tone="lilac"
        />
        <MetricCard
          label="Hipoteca ofrecida"
          amount={data.mortgageOffer ?? 0}
          note="Referencia disponible"

          action={{
            label: "Actualizar oferta",
            onClick: () => open({ type: "mortgageBalance" }),
          }}
          tone="butter"
        />
      </div>
      {!!allocation.rows.length && (
        <Surface component="section" className="panel overview-allocation">
          <div className="section-title">
            <h3>Tu ahorro, distribuido</h3>
            <Button
              className="history-edit-toggle"
              onClick={() => {
                navigate("Ahorros");
                setSavingsTab("Distribución de ahorros");
              }}
            >
              Ver distribución <ArrowUpRight size={16} />
            </Button>
          </div>
          <div className="overview-allocation-items">
            {allocation.rows.map((row) => (
              <div key={row.id}>
                <span>{row.name}</span>
                <strong>{euro(row.balance)}</strong>
                <small>
                  {row.kind === "deposit"
                    ? `${euro(row.yield.net)} netos al vencimiento`
                    : `${euro(row.yield.net)} netos estimados este mes`}
                </small>
              </div>
            ))}
          </div>
          <PanelInfo title="Tu ahorro, distribuido">
            Los destinos distribuyen tu ahorro actual. El rendimiento neto es
            una estimación después de la retención indicada y se mantiene
            separado de tu patrimonio hasta que registres los intereses
            cobrados.
          </PanelInfo>
        </Surface>
      )}
      <div className="cards two home-detail-grid">
        <Surface component="section" className="panel">
          <div className="section-title">
            <h3>Día a día · ING</h3>
            <Button className="subtle" onClick={() => navigate("Día a día")}>
              Ver detalle
            </Button>
          </div>
          <div className="spread">
            <span>Saldo actual</span>
            <b>{euro(daily.current)}</b>
          </div>
          <div className="spread">
            <span>Gastos pendientes</span>
            <b>{euro(daily.expenses)}</b>
          </div>
          <div className="spread">
            <span>Ingresos pendientes</span>
            <b>{euro(daily.incomes)}</b>
          </div>
          <div className="spread">
            <span>Saldo previsto</span>
            <b>{euro(daily.forecast)}</b>
          </div>
        </Surface>
        <Surface component="section" className="panel">
          <div className="section-title">
            <h3>Plan mensual</h3>
            <Button
              className="subtle"
              onClick={() => open({ type: "settings" })}
            >
              Editar plan
            </Button>
          </div>
          <div className="spread">
            <span>Ahorro base</span>
            <b>{euro(data.plan.saving)}</b>
          </div>
          <div className="spread">
            <span>Inversión</span>
            <b>{euro(data.plan.investment)}</b>
          </div>
          <div className="spread">
            <span>Deuda interna pendiente</span>
            <b>{euro(debt.pending)}</b>
          </div>
          <Button
            className="text-link"
            onClick={() => {
              navigate("Ahorros");
              setSavingsTab("Deuda interna");
            }}
          >
            Ver reposiciones
          </Button>
        </Surface>
      </div>
      <DebtPaymentWatch debts={data.debts ?? []} onSelect={selectDebt} />
      <MonthlyPlanning data={data} />
      <div className="cards two">
        <Surface component="section" className="panel">
          <h3>Ahorro por trabajo</h3>
          <Chart
            profile={data}
            kind="savings"
            year={currentMonth().slice(0, 4)}
            view="Acumulado"
            showGoal
          />
          <PanelInfo title="Ahorro por trabajo">
            Evolución del ahorro por trabajo y su objetivo ideal. Los intereses
            se muestran por separado y las previsiones siguen la deuda interna
            pendiente.
          </PanelInfo>
        </Surface>
        <Surface component="section" className="panel">
          <h3>Inversión en fondos</h3>
          <Chart
            profile={data}
            kind="investment"
            year={currentMonth().slice(0, 4)}
            view="Acumulado"
            showGoal
          />
          <PanelInfo title="Inversión en fondos">
            La línea real refleja capital aportado, sin ganancias variables. El
            objetivo ideal acumula los objetivos mensuales y la previsión aplica
            el plan a los meses pendientes.
          </PanelInfo>
        </Surface>
      </div>
    </>
  );
}
