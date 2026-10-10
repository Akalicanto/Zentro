import { ChevronDown, CreditCard, History, CalendarDays } from "lucide-react";
import type { ExternalDebt } from "../../../domain/types.ts";
export default function DebtNavigation({
  debts,
  selectedId,
  collapsed,
  onSelect,
}: {
  debts: ExternalDebt[];
  selectedId: string | null;
  collapsed: boolean;
  onSelect: (id: string | null, section?: "payments" | "activity") => void;
}) {
  const visible = debts.filter((d) => !d.archivedOn && !d.completedOn);
  if (!visible.length) return null;
  return (
    <nav
      className={`debt-sidebar-tree${collapsed ? " collapsed" : ""}`}
      aria-label="Tus deudas"
    >
      <span className="debt-sidebar-label">DEUDAS ACTIVAS</span>
      {visible.map((debt) => (
        <details
          key={debt.id}
          className={selectedId === debt.id ? "selected" : ""}
        >
          <summary title={debt.name} onClick={() => onSelect(debt.id)}>
            <CreditCard size={16} />
            <span>{debt.name}</span>
            <ChevronDown size={14} />
          </summary>
          <div>
            <button onClick={() => onSelect(debt.id, "payments")}>
              <CalendarDays size={14} />
              Plan de pagos
            </button>
            <button onClick={() => onSelect(debt.id, "activity")}>
              <History size={14} />
              Historial
            </button>
          </div>
        </details>
      ))}
    </nav>
  );
}
