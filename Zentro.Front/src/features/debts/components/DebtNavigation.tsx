import { useState } from "react";
import { ChevronDown, CreditCard } from "lucide-react";
import type { ExternalDebt } from "../../../domain/types.ts";

export default function DebtNavigation({
  debts,
  selectedId,
  collapsed,
  active,
  onSelect,
}: {
  debts: ExternalDebt[];
  selectedId: string | null;
  collapsed: boolean;
  active: boolean;
  onSelect: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(active);
  const visible = debts.filter((d) => !d.archivedOn && !d.completedOn);
  return (
    <div className="debt-navigation-group">
      <div className={`debt-navigation-header${active ? " active" : ""}`}>
        <button
          aria-label="Deudas"
          aria-current={active ? "page" : undefined}
          className={active ? "active" : ""}
          title={collapsed ? "Deudas" : undefined}
          onClick={() => {
            setExpanded(true);
            onSelect(null);
          }}
        >
          <CreditCard size={18} />
          <span className="nav-item-label">Deudas</span>
        </button>
        <button
          className="debt-navigation-disclosure"
          aria-label={
            expanded ? "Ocultar deudas activas" : "Mostrar deudas activas"
          }
          aria-expanded={expanded && !collapsed}
          aria-controls="active-debt-navigation"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown size={17} className="debt-navigation-chevron" />
        </button>
      </div>
      <div
        id="active-debt-navigation"
        className={`debt-sidebar-tree${expanded && !collapsed ? " is-open" : ""}`}
      >
        <div className="debt-sidebar-list" inert={!expanded || collapsed}>
          {visible.map((debt) => (
            <button
              key={debt.id}
              title={debt.name}
              aria-current={selectedId === debt.id ? "page" : undefined}
              className={selectedId === debt.id ? "selected" : ""}
              onClick={() => onSelect(debt.id)}
            >
              <span className="debt-navigation-dot" />
              <span>{debt.name}</span>
            </button>
          ))}
          {!visible.length && (
            <span className="debt-sidebar-empty">Sin deudas activas</span>
          )}
        </div>
      </div>
    </div>
  );
}
