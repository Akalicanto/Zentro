import { AnimatePresence } from "motion/react";
import { Button, Surface } from "../../../shared/ui/index.tsx";
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  CheckCheck,
  Trash2,
  RotateCcw,
  CalendarDays,
  Calculator,
  ChevronRight,
} from "lucide-react";
import {
  debtStatus,
  debtAnalytics,
  externalDebtTotals,
  euro,
  monthName,
  sum,
  validateProfile,
  reopenDebt,
  restoreDebt,
  type Profile,
  type ExternalDebt,
} from "../../../domain/index.ts";
import MetricCard from "../../../shared/components/MetricCard.tsx";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";
import DebtDetail from "./DebtDetail.tsx";
import DebtEditor, { type DebtEditorMode } from "./DebtEditor.tsx";
import DebtAdvanceSimulator from "./DebtAdvanceSimulator.tsx";
import DebtPaymentWatch from "./DebtPaymentWatch.tsx";

export default function DebtsPage({
  profile,
  onSave,
  selectedId,
  onSelect,
}: {
  profile: Profile;
  onSave: (profile: Profile) => boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const debts = profile.debts ?? [];
  const debt = debts.find((d) => d.id === selectedId);
  const [filter, setFilter] = useState<"active" | "completed" | "archived">(
    "active",
  );
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{
    mode: DebtEditorMode;
    debt?: ExternalDebt;
  } | null>(null);
  const [error, setError] = useState("");
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const active = debts.filter((d) => debtStatus(d) === "active");
  const live = debts.filter((d) => !d.archivedOn);
  const visible = debts
    .filter(
      (d) =>
        debtStatus(d) === filter &&
        d.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    )
    .sort((a, b) =>
      (b.completedOn ?? b.createdOn ?? "").localeCompare(
        a.completedOn ?? a.createdOn ?? "",
      ),
    );
  function saveDebt(next: ExternalDebt) {
    const nextProfile = {
      ...profile,
      debts: debts.some((d) => d.id === next.id)
        ? debts.map((d) => (d.id === next.id ? next : d))
        : [...debts, next],
    };
    validateProfile(nextProfile);
    const saved = onSave(nextProfile);
    if (saved) {
      setError("");
      onSelect(next.id);
    }
    return saved;
  }
  function action(next: ExternalDebt) {
    try {
      saveDebt(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }
  const open = (mode: DebtEditorMode, item?: ExternalDebt) => {
    setError("");
    setModal({ mode, debt: mode === "create" ? undefined : (item ?? debt) });
  };
  return (
    <>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="debt-manager-heading">
        <div>
          {debt ? (
            <>
              <Button className="debt-back" onClick={() => onSelect(null)}>
                <ArrowLeft size={16} />
                Todas las deudas
              </Button>
              <h2>
                {debt.name}
                <span className={`debt-state debt-state-${debtStatus(debt)}`}>
                  {
                    {
                      active: "Activa",
                      completed: "Completada",
                      archived: "Eliminada",
                    }[debtStatus(debt)]
                  }
                </span>
              </h2>
              {debt.notes && <p className="debt-notes">{debt.notes}</p>}
            </>
          ) : (
            <>
              <h2>Tus deudas, bajo control</h2>
              <p>Lo pendiente hoy y lo que ya has dejado atrás.</p>
            </>
          )}
        </div>
        {!debt && (
          <Button className="primary" onClick={() => open("create", undefined)}>
            <Plus size={17} />
            Añadir deuda
          </Button>
        )}
      </div>
      {debt ? (
        <>
          <section
            className="debt-manager-actions"
            aria-label="Gestionar deuda"
          >
            <div className="debt-edit-actions">
              {!debt.archivedOn && !debt.completedOn && (
                <>
                  <Button onClick={() => open("edit")}>
                    <Pencil size={16} />
                    Editar deuda
                  </Button>
                  {debtAnalytics(debt).unassigned > 0 && (
                    <Button onClick={() => open("plan")}>
                      <CalendarDays size={16} />
                      Planificar cuotas
                    </Button>
                  )}
                  {externalDebtTotals(debt).remaining > 0 && (
                    <Button
                      className="debt-simulate-action"
                      onClick={() => setAdvanceOpen(true)}
                    >
                      <Calculator size={17} />
                      Valorar adelanto
                    </Button>
                  )}
                </>
              )}
              {debt.completedOn && !debt.archivedOn && (
                <Button onClick={() => action(reopenDebt(debt))}>
                  <RotateCcw size={16} />
                  Reabrir deuda
                </Button>
              )}
            </div>
            <div className="debt-close-actions">
              {!debt.archivedOn && !debt.completedOn && (
                <Button
                  className="debt-complete-action"
                  onClick={() => open("complete")}
                >
                  <CheckCheck size={16} />
                  Completar deuda
                </Button>
              )}
              {debt.archivedOn ? (
                <Button onClick={() => action(restoreDebt(debt))}>
                  <RotateCcw size={16} />
                  Recuperar deuda
                </Button>
              ) : (
                <Button
                  className="debt-remove"
                  aria-label="Eliminar deuda"
                  title="Eliminar deuda"
                  onClick={() => open("archive")}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </section>
          {debt.completedOn && (
            <div className="debt-completed-note">
              <CheckCheck size={19} />
              <span>
                Completada el{" "}
                {new Date(debt.completedOn + "T12:00:00").toLocaleDateString(
                  "es-ES",
                )}
                . Esta deuda se conserva en tu historial.
              </span>
            </div>
          )}
          {!debt.completedOn &&
            !debt.archivedOn &&
            debt.total > 0 &&
            externalDebtTotals(debt).remaining === 0 && (
              <div className="debt-ready-note">
                <CheckCheck size={19} />
                <span>
                  Todas las cuotas están pagadas. Ya puedes completar esta
                  deuda.
                </span>
              </div>
            )}
          <DebtDetail
            key={debt.id}
            debt={debt}
            profile={profile}
            onSave={onSave}
            onFullyPaid={(paidDebt) =>
              setModal({ mode: "complete", debt: paidDebt })
            }
          />
        </>
      ) : (
        <>
          <div className="cards three debts-overview-kpis">
            <MetricCard
              label="Por pagar"
              amount={sum(active.map((d) => externalDebtTotals(d).remaining))}
              note={`${active.length} deudas activas`}
              tone="rose"
            />
            <MetricCard
              label="Dinero apartado"
              amount={sum(active.map((d) => externalDebtTotals(d).reserved))}
              note="Preparado, todavía por abonar"
              tone="butter"
            />
            <MetricCard
              label="Ya pagado"
              amount={sum(live.map((d) => externalDebtTotals(d).paid))}
              note="Deudas activas y completadas"
              tone="sage"
            />
          </div>
          <DebtPaymentWatch debts={debts} onSelect={onSelect} />
          <Surface component="section" className="panel debts-list-panel">
            <div className="section-title">
              <h3>
                {filter === "completed"
                  ? "Historial de deudas completadas"
                  : filter === "archived"
                    ? "Deudas eliminadas"
                    : "Deudas activas"}
              </h3>
              <label className="debt-search">
                Buscar deuda
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre"
                />
              </label>
            </div>
            <div
              className="debt-filters"
              role="tablist"
              aria-label="Estado de las deudas"
            >
              {(["active", "completed", "archived"] as const).map((status) => (
                <Button
                  key={status}
                  role="tab"
                  aria-selected={filter === status}
                  onClick={() => setFilter(status)}
                >
                  {
                    {
                      active: "Activas",
                      completed: "Completadas",
                      archived: "Eliminadas",
                    }[status]
                  }
                  <span className="debt-filter-count">
                    {debts.filter((d) => debtStatus(d) === status).length}
                  </span>
                </Button>
              ))}
            </div>
            <div className="debt-summary-grid">
              {visible.map((item) => {
                const a = debtAnalytics(item);
                return (
                  <Button
                    className={`debt-summary-card debt-state-${debtStatus(item)}`}
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                  >
                    <div>
                      <h4>{item.name}</h4>
                      <ChevronRight size={20} />
                    </div>
                    <span>
                      {debtStatus(item) === "completed"
                        ? "Completada"
                        : debtStatus(item) === "archived"
                          ? "Conservada en el historial"
                          : "Falta por pagar"}
                    </span>
                    <strong>{euro(a.totals.remaining)}</strong>
                    <div className="debt-card-progress">
                      <i style={{ width: `${a.paidPercent}%` }} />
                    </div>
                    <small>
                      {euro(a.totals.paid)} de {euro(item.total)} pagados
                    </small>
                    {item.completedOn && (
                      <small className="debt-completed-date">
                        Completada el{" "}
                        {new Date(
                          item.completedOn + "T12:00:00",
                        ).toLocaleDateString("es-ES")}
                      </small>
                    )}
                    {a.next && (
                      <small>
                        Siguiente: {monthName(a.next.month)} ·{" "}
                        {euro(a.next.amount)}
                      </small>
                    )}
                    {a.unassigned > 0 && (
                      <small>{euro(a.unassigned)} sin calendario</small>
                    )}
                  </Button>
                );
              })}
            </div>
            {!visible.length && (
              <div className="empty">
                {search
                  ? "No hay deudas con ese nombre."
                  : filter === "active"
                    ? "No tienes deudas activas. Añade una cuando lo necesites."
                    : filter === "completed"
                      ? "Las deudas que completes se guardarán aquí."
                      : "Las deudas eliminadas se conservarán aquí para recuperarlas."}
              </div>
            )}
            <PanelInfo title="Tus deudas">
              Los totales pendientes y el calendario financiero incluyen solo
              deudas activas. Lo apartado sigue pendiente de pago. Eliminar
              conserva la ficha y sus cuotas; completar registra el importe
              restante como pagado tras confirmarlo. Estas operaciones no
              modifican tus otros saldos.
            </PanelInfo>
          </Surface>
        </>
      )}
      <AnimatePresence>
        {modal && (
          <DebtEditor
            mode={modal.mode}
            debt={modal.debt}
            onSave={saveDebt}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {advanceOpen && debt && (
          <DebtAdvanceSimulator
            debt={debt}
            onClose={() => setAdvanceOpen(false)}
            onApply={(next) => {
              const saved = saveDebt(next);
              if (saved && externalDebtTotals(next).remaining === 0)
                setModal({ mode: "complete", debt: next });
              return saved;
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
