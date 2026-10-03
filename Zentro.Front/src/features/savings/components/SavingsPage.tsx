import { type Profile, wealthTotals } from "../../../domain/index.ts";
import { type OpenProfileForm, type SaveProfile } from "../../profile/types.ts";
import { type HistoryControls } from "../../history/hooks/useHistoryView.ts";
import MetricCard from "../../../shared/components/MetricCard.tsx";
import MonthlyHistory from "../../history/components/MonthlyHistory.tsx";
import InternalDebtPage from "../../internal-debt/components/InternalDebtPage.tsx";
import SavingsDistribution from "./SavingsDistribution.tsx";

type Props = {
  data: Profile;
  open: OpenProfileForm;
  save: SaveProfile;
  savingsTab: string;
  setSavingsTab: (tab: string) => void;
  historyControls: HistoryControls;
};
export default function SavingsPage({
  data,
  open,
  save,
  savingsTab,
  setSavingsTab,
  historyControls,
}: Props) {
  const wealth = wealthTotals(data);
  return (
    <>
      <div className="cards three savings-primary">
        {
          <MetricCard
            label="Ahorro por trabajo"
            amount={wealth.work}
            note="Historial de aportaciones netas"

            tone="blue"
          />
        }
        {
          <MetricCard
            label="Generado por intereses"
            amount={wealth.interest}
            note="Intereses acumulados registrados"

            action={{
              label: "Actualizar intereses",
              onClick: () => open({ type: "interestBalance" }),
            }}
            tone="rose"
          />
        }
        {
          <MetricCard
            label="Ahorro total"
            amount={wealth.savings}
            note="Trabajo + intereses"

            tone="lilac"
          />
        }
      </div>
      <div
        className="account-detail-tabs"
        role="tablist"
        aria-label="Apartados de ahorro"
      >
        {["Historial", "Distribución de ahorros", "Deuda interna"].map(
          (label) => (
            <button
              role="tab"
              aria-selected={savingsTab === label}
              className={savingsTab === label ? "active" : ""}
              key={label}
              onClick={() => setSavingsTab(label)}
            >
              {label}
            </button>
          ),
        )}
      </div>
      <div className="savings-tab-content" key={savingsTab}>
        {savingsTab === "Historial" && (
          <MonthlyHistory
            kind="savings"
            data={data}
            open={open}
            controls={historyControls}
          />
        )}
        {savingsTab === "Deuda interna" && (
          <InternalDebtPage data={data} open={open} />
        )}
        {savingsTab === "Distribución de ahorros" && (
          <SavingsDistribution profile={data} onSave={save} />
        )}
      </div>
    </>
  );
}
