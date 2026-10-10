import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  CheckCheck,
  Trash2,
  RotateCcw,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import {
  debtStatus,
  debtAnalytics,
  externalDebtTotals,
  euro,
  monthName,
  currentMonth,
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

export default function DebtsPage({
  profile,
  onSave,
  selectedId,
  section,
  onSelect,
}: {
  profile: Profile;
  onSave: (profile: Profile) => boolean;
  selectedId: string | null;
  section: "payments" | "activity";
  onSelect: (id: string | null, section?: "payments" | "activity") => void;
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
  const active = debts.filter((d) => debtStatus(d) === "active");
  const live = debts.filter((d) => !d.archivedOn);
  const visible = debts.filter(
    (d) =>
      debtStatus(d) === filter &&
      d.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const outstanding = active
    .flatMap((d) => d.installments.map((r) => ({ ...r, debt: d })))
    .filter((r) => r.status !== "paid")
    .sort((a, b) => a.month.localeCompare(b.month));
  const overdue = outstanding.filter((r) => r.month < currentMonth());
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
              <button className="debt-back" onClick={() => onSelect(null)}>
                <ArrowLeft size={16} />
                Todas las deudas
              </button>
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
        <button className="primary" onClick={() => open("create", undefined)}>
          <Plus size={17} />
          Añadir deuda
        </button>
      </div>
      {debt ? (
        <>
          <div className="debt-manager-actions">
            {!debt.archivedOn && !debt.completedOn && (
              <>
                <button onClick={() => open("edit")}>
                  <Pencil size={16} />
                  Editar deuda
                </button>
                <button
                  disabled={
                    debt.total <= sum(debt.installments.map((r) => r.amount))
                  }
                  onClick={() => open("plan")}
                >
                  <CalendarDays size={16} />
                  Planificar cuotas
                </button>
                <button onClick={() => open("complete")}>
                  <CheckCheck size={16} />
                  Completar deuda
                </button>
              </>
            )}
            {debt.completedOn && !debt.archivedOn && (
              <button onClick={() => action(reopenDebt(debt))}>
                <RotateCcw size={16} />
                Reabrir deuda
              </button>
            )}
            {debt.archivedOn ? (
              <button onClick={() => action(restoreDebt(debt))}>
                <RotateCcw size={16} />
                Recuperar deuda
              </button>
            ) : (
              <button className="debt-remove" onClick={() => open("archive")}>
                <Trash2 size={16} />
                Eliminar deuda
              </button>
            )}
          </div>
          <div className="tabs" role="tablist" aria-label="Detalle de deuda">
            <button
              role="tab"
              aria-selected={section === "payments"}
              className={section === "payments" ? "active" : ""}
              onClick={() => onSelect(debt.id, "payments")}
            >
              Plan de pagos
            </button>
            <button
              role="tab"
              aria-selected={section === "activity"}
              className={section === "activity" ? "active" : ""}
              onClick={() => onSelect(debt.id, "activity")}
            >
              Historial de cambios
            </button>
          </div>
          {section === "payments" ? (
            <DebtDetail
              key={debt.id}
              debt={debt}
              profile={profile}
              onSave={onSave}
            />
          ) : (
            <section className="panel debt-activity-panel">
              <h3>Historial de {debt.name}</h3>
              {debt.completedOn && (
                <p>
                  Cerrada el{" "}
                  {new Date(debt.completedOn + "T12:00:00").toLocaleDateString(
                    "es-ES",
                  )}
                  .
                </p>
              )}
              <ol className="debt-activity">
                {[...(debt.activity ?? [])].reverse().map((row) => (
                  <li key={row.id}>
                    <time dateTime={row.date}>
                      {new Date(row.date + "T12:00:00").toLocaleDateString(
                        "es-ES",
                      )}
                    </time>
                    <span>{row.description}</span>
                  </li>
                ))}
              </ol>
              {!debt.activity?.length && (
                <p className="empty">
                  Los cambios que hagas desde ahora aparecerán aquí. Tus cuotas
                  anteriores se conservan.
                </p>
              )}
              <PanelInfo title="Historial de deuda">
                Este historial recoge las operaciones realizadas en Zentro desde
                la incorporación de esta función; las cuotas importadas siguen
                en el plan de pagos.
              </PanelInfo>
            </section>
          )}
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
          {outstanding[0] && (
            <section className="panel debt-next-payment">
              <CalendarDays size={24} />
              <div>
                <span>Próxima cuota por pagar</span>
                <strong>
                  {outstanding[0].debt.name} · {euro(outstanding[0].amount)}
                </strong>
                <small>
                  {monthName(outstanding[0].month)}
                  {outstanding[0].status === "reserved"
                    ? " · Dinero apartado"
                    : ""}
                </small>
              </div>
              <button onClick={() => onSelect(outstanding[0].debt.id)}>
                Ver deuda
                <ChevronRight size={16} />
              </button>
            </section>
          )}
          {overdue.length > 0 && (
            <p className="debt-overdue" role="status">
              Hay {overdue.length} cuotas de meses anteriores sin marcar como
              pagadas: {euro(sum(overdue.map((r) => r.amount)))}. Revisa si
              falta actualizar su estado.
            </p>
          )}
          <section className="panel debts-list-panel">
            <div className="section-title">
              <h3>Listado de deudas</h3>
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
                <button
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
                  <span>
                    {debts.filter((d) => debtStatus(d) === status).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="debt-summary-grid">
              {visible.map((item) => {
                const a = debtAnalytics(item);
                return (
                  <button
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
                    {a.next && (
                      <small>
                        Siguiente: {monthName(a.next.month)} ·{" "}
                        {euro(a.next.amount)}
                      </small>
                    )}
                    {a.unassigned > 0 && (
                      <small>{euro(a.unassigned)} sin calendario</small>
                    )}
                  </button>
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
          </section>
        </>
      )}
      {modal && (
        <DebtEditor
          mode={modal.mode}
          debt={modal.debt}
          onSave={saveDebt}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
