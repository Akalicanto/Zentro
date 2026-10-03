import {
  type Profile,
  currentMonth,
  debtTotals,
  monthSeries,
  debtItemPaid,
  euro,
  monthName,
} from "../../../domain/index.ts";
import { type OpenProfileForm } from "../../profile/types.ts";
import { useState, useMemo } from "react";
import MetricCard from "../../../shared/components/MetricCard.tsx";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  Pencil,
  Trash2,
} from "lucide-react";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";

type Props = { data: Profile; open: OpenProfileForm };
export default function InternalDebtPage({ data, open }: Props) {
  const [editingDebt, setEditingDebt] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const dailyMonth = currentMonth();
  const { debt, savingsSeries } = useMemo(
    () => ({
      debt: debtTotals(data),
      savingsSeries: monthSeries(data, "savings"),
    }),
    [data],
  );
  const plan = savingsSeries.filter(
    (r) =>
      r.plannedRepayment > 0 ||
      (r.month >= data.plan.start &&
        r.month <= data.plan.horizon &&
        data.internalDebt.schedule.some((item) => item.month === r.month)),
  );
  return (
    <>
      <div className="cards two savings-secondary">
        {
          <MetricCard
            label="Deuda interna pendiente"
            amount={debt.pending}
            note="Ahorro retirado que falta por reponer"

            tone="rose"
          />
        }
        {
          <MetricCard
            label="Reposición mensual"
            amount={data.plan.repayment}
            note="Además de la aportación base, hasta saldar la deuda"

            tone="sage"
          />
        }
      </div>
      <div className="debt-actions">
        <button
          className="debt-action"
          aria-label="Añadir deuda"
          onClick={() => open({ type: "withdraw" })}
        >
          <ArrowUpRight size={20} />
          <span>
            <strong>Añadir deuda</strong>
            <small>Sube la deuda · Baja el ahorro del mes</small>
          </span>
        </button>
        <button
          className="debt-action repay"
          aria-label="Devolver deuda"
          disabled={debt.pending === 0}
          onClick={() => open({ type: "repay" })}
        >
          <ArrowDownLeft size={20} />
          <span>
            <strong>Devolver deuda</strong>
            <small>Baja la deuda · Sube el ahorro del mes</small>
          </span>
        </button>
      </div>
      <section className="panel debt-table-panel">
        <div className="section-title table-heading">
          <div>
            <span className="table-eyebrow">TU AHORRO, DE VUELTA</span>
            <h3>Por reponer</h3>
          </div>
          <div className="history-actions">
            <span className="table-count">
              {data.internalDebt.items.length}{" "}
              {data.internalDebt.items.length === 1 ? "concepto" : "conceptos"}
            </span>
            <button
              className={`history-edit-toggle${editingDebt ? " active" : ""}`}
              aria-label={
                editingDebt ? "Terminar edición de deuda" : "Editar deuda"
              }
              aria-pressed={editingDebt}
              disabled={!data.internalDebt.items.length}
              onClick={() => setEditingDebt(!editingDebt)}
            >
              {editingDebt ? <Check size={16} /> : <Pencil size={16} />}
              {editingDebt ? "Terminar edición" : "Editar"}
            </button>
          </div>
        </div>
        {editingDebt && (
          <p className="history-edit-note">
            Selecciona un concepto para editarlo. También puedes borrar una
            deuda.
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Retirado</th>
                <th>Repuesto</th>
                <th>Pendiente</th>
                {editingDebt && <th className="right">Borrar</th>}
              </tr>
            </thead>
            <tbody>
              {data.internalDebt.items.map((item) => {
                const paid = debtItemPaid(data, item.id);
                return (
                  <tr key={item.id}>
                    <td>
                      {editingDebt ? (
                        <button
                          className="history-month-edit"
                          aria-label={`Editar ${item.concept}`}
                          onClick={() => open({ type: "editDebt", item })}
                        >
                          {item.concept}
                        </button>
                      ) : (
                        <strong>{item.concept}</strong>
                      )}
                      <small>
                        {item.date.split("-").reverse().join("/")} ·{" "}
                        {item.source === "work"
                          ? "Ahorro por trabajo"
                          : "Intereses"}
                      </small>
                    </td>
                    <td className="amount">{euro(item.amount)}</td>
                    <td className="repaid-value">
                      {euro(paid)}
                      <div
                        className="repayment-progress"
                        role="progressbar"
                        aria-label={`Reposición de ${item.concept}`}
                        aria-valuenow={Math.round((paid / item.amount) * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span
                          style={{ width: `${(paid / item.amount) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td>
                      <span
                        className={`amount-pill ${item.amount > paid ? "pending" : "settled"}`}
                      >
                        {item.amount > paid
                          ? euro(item.amount - paid)
                          : "Saldado"}
                      </span>
                    </td>
                    {editingDebt && (
                      <td>
                        <div className="table-row-actions">
                          <button
                            className="table-action delete"
                            aria-label={`Borrar ${item.concept}`}
                            onClick={() => open({ type: "deleteDebt", item })}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!data.internalDebt.items.length && (
          <p className="empty">No hay deuda interna.</p>
        )}
        <PanelInfo title="Por reponer">
          Añadir deuda reduce el ahorro por trabajo del mes; devolver deuda lo
          aumenta. Retirado es el importe original, Repuesto es lo devuelto y
          Pendiente es lo que falta recuperar. Las reposiciones históricas ya
          incluidas en el ahorro no se suman otra vez.
        </PanelInfo>
      </section>
      <section className="panel distribution-panel">
        <div className="section-title table-heading">
          <div>
            <span className="table-eyebrow">PASO A PASO</span>
            <h3>Distribución de las reposiciones</h3>
          </div>
          <div className="history-actions">
            <span className="table-count">
              {plan.length}{" "}
              {plan.length === 1 ? "mes previsto" : "meses previstos"}
            </span>
            <button
              className={`history-edit-toggle${editingSchedule ? " active" : ""}`}
              aria-label={
                editingSchedule
                  ? "Terminar edición de distribución"
                  : "Editar distribución"
              }
              aria-pressed={editingSchedule}
              disabled={!plan.length}
              onClick={() => setEditingSchedule(!editingSchedule)}
            >
              {editingSchedule ? <Check size={16} /> : <Pencil size={16} />}
              {editingSchedule ? "Terminar edición" : "Editar"}
            </button>
          </div>
        </div>
        {editingSchedule && (
          <p className="history-edit-note">
            Selecciona un mes para ajustar su reposición prevista.
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Ahorro base</th>
                <th>Reposición</th>
                <th>Total previsto</th>
              </tr>
            </thead>
            <tbody>
              {plan.map((row) => (
                <tr
                  key={row.month}
                  className={
                    row.month === dailyMonth ? "current-month-row" : undefined
                  }
                  aria-current={row.month === dailyMonth ? "date" : undefined}
                >
                  <td>
                    <span className="distribution-month">
                      <span className="month-marker">{row.month.slice(5)}</span>
                      {editingSchedule ? (
                        <button
                          className="history-month-edit"
                          aria-label={`Editar distribución ${row.month}`}
                          onClick={() =>
                            open({
                              type: "schedule",
                              item: {
                                month: row.month,
                                amount: row.plannedRepayment,
                              },
                            })
                          }
                        >
                          {monthName(row.month)}
                        </button>
                      ) : (
                        monthName(row.month)
                      )}
                    </span>
                  </td>
                  <td>{euro(row.plannedBase ?? 0)}</td>
                  <td>
                    <span className="amount-pill scheduled">
                      +{euro(row.plannedRepayment)}
                    </span>
                  </td>
                  <td className="forecast-total">{euro(row.planned ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!plan.length && (
          <p className="empty">No hay reposiciones futuras pendientes.</p>
        )}
        <PanelInfo title="Distribución de las reposiciones">
          Total previsto es el ahorro base más la reposición pendiente de ese
          mes. Las cuotas se limitan a la deuda restante y descuentan lo ya
          devuelto. Editar permite ajustar cada mes, incluido indicar cero para
          saltarlo; las previsiones no cuentan como ahorro realizado.
        </PanelInfo>
      </section>
    </>
  );
}
