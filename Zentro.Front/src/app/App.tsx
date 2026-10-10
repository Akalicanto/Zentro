import { type Profile, currentMonth } from "../domain/index.ts";
import { useProfileStore } from "../features/profile/hooks/useProfileStore.ts";
import { useProfileEditor } from "../features/profile/hooks/useProfileEditor.ts";
import { useHistoryView } from "../features/history/hooks/useHistoryView.ts";
import { useState } from "react";
import { type Page, pages } from "./navigation.ts";
import AppShell from "./components/AppShell.tsx";
import SettingsPanel from "../features/profile/components/SettingsPanel.tsx";
import PlacementForm from "../features/savings/components/PlacementForm.tsx";
import ProfileForms from "../features/profile/components/ProfileForms.tsx";
import OverviewPage from "../features/profile/components/OverviewPage.tsx";
import DailyPage from "../features/daily/components/DailyPage.tsx";
import SavingsPage from "../features/savings/components/SavingsPage.tsx";
import InvestmentPage from "../features/investment/components/InvestmentPage.tsx";
import DebtsPage from "../features/debts/components/DebtsPage.tsx";

export default function App({ initialData }: { initialData: Profile }) {
  const { data, error, save } = useProfileStore(initialData);
  const editor = useProfileEditor(data, save),
    controls = useHistoryView();
  const [page, setPage] = useState<Page>(() => {
    const value = new URLSearchParams(location.hash.slice(1)).get("pagina");
    return pages.includes(value as Page) ? (value as Page) : "Mi espacio";
  });
  const [savingsTab, setSavingsTab] = useState("Historial");
  const [debtId, setDebtId] = useState<string | null>(() =>
    new URLSearchParams(location.hash.slice(1)).get("deuda"),
  );
  function selectDebt(id: string | null) {
    if (page !== "Deudas" || debtId !== id)
      window.scrollTo({ top: 0, behavior: "instant" });
    setPage("Deudas");
    setDebtId(id);
    const params = new URLSearchParams({ pagina: "Deudas" });
    if (id) {
      params.set("deuda", id);
    }
    history.replaceState(null, "", `#${params}`);
  }
  function navigate(next: Page) {
    setPage(next);
    if (next === "Deudas") setDebtId(null);
    controls.setYear(currentMonth().slice(0, 4));
    history.replaceState(null, "", `#pagina=${encodeURIComponent(next)}`);
  }
  const open = editor.open;
  return (
    <AppShell
      page={page}
      error={error}
      navigate={navigate}
      open={open}
      debts={data.debts ?? []}
      selectedDebtId={debtId}
      selectDebt={selectDebt}
      overlay={
        editor.modal ? (
          editor.modal.type === "settings" ? (
            <SettingsPanel data={data} {...editor} />
          ) : editor.modal.type === "placement" ? (
            <PlacementForm
              profile={data}
              onSave={save}
              initialPlacement={editor.modal.item}
              onClose={editor.close}
            />
          ) : (
            <ProfileForms data={data} {...editor} modal={editor.modal} />
          )
        ) : null
      }
    >
      {page === "Mi espacio" && (
        <OverviewPage
          data={data}
          open={open}
          navigate={navigate}
          setSavingsTab={setSavingsTab}
          selectDebt={selectDebt}
        />
      )}
      {page === "Día a día" && (
        <DailyPage data={data} open={open} save={save} />
      )}
      {page === "Ahorros" && (
        <SavingsPage
          data={data}
          open={open}
          save={save}
          savingsTab={savingsTab}
          setSavingsTab={setSavingsTab}
          historyControls={controls}
        />
      )}
      {page === "Inversión" && (
        <InvestmentPage data={data} open={open} controls={controls} />
      )}
      {page === "Deudas" && (
        <DebtsPage
          profile={data}
          onSave={save}
          selectedId={debtId}
          onSelect={selectDebt}
        />
      )}
    </AppShell>
  );
}
