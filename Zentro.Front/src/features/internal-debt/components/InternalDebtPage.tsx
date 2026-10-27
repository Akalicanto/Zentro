import InlineEdit from "../../../shared/components/InlineEdit.tsx";
import { Button, Surface } from "../../../shared/ui/index.tsx";
import {
  type Profile,
  currentMonth,
  debtTotals,
  monthSeries,
  debtItemPaid,
  editDebtItem,
  euro,
  monthName,
} from "../../../domain/index.ts";
import { type OpenProfileForm } from "../../profile/types.ts";
import { useMemo } from "react";
import MetricCard from "../../../shared/components/MetricCard.tsx";
import { ArrowUpRight, ArrowDownLeft, Trash2 } from "lucide-react";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";
type Props = {
  data: Profile;
  open: OpenProfileForm;
  save: (profile: Profile) => boolean;
};
export default function InternalDebtPage({ data, open, save }: Props) {
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
        <MetricCard
          label="Deuda interna pendiente"
          amount={debt.pending}
          note="Ahorro retirado que falta por reponer"
          tone="rose"
        />
        <MetricCard
          label="Reposición mensual"
          amount={data.plan.repayment}
          note="Además de la aportación base, hasta saldar la deuda"
          tone="sage"
        />
      </div>
      <div className="debt-actions">
        <Button
          className="debt-action"
          aria-label="Añadir deuda"
          onClick={() => open({ type: "withdraw" })}
        >
          <ArrowUpRight size={20} />
          <span>
            <strong>Añadir deuda</strong>
            <small>Sube la deuda · Baja el ahorro del mes</small>
          </span>
        </Button>
        <Button
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
        </Button>
      </div>
      <Surface component="section" className="panel debt-table-panel">
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
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Retirado</th>
                <th>Repuesto</th>
                <th>Pendiente</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {data.internalDebt.items.map((item) => {
                const paid = debtItemPaid(data, item.id);
                return (
                  <tr key={item.id}>
                    <td>
                      <InlineEdit
                        kind="text"
                        label={"Concepto deuda interna " + item.concept}
                        value={item.concept}
                        onSave={(value) =>
                          save(
                            editDebtItem(
                              data,
                              item.id,
                              String(value),
                              item.amount,
                              item.date,
                            ),
                          )
                        }
                      />
                      <small>
                        <InlineEdit
                          kind="date"
                          label={"Fecha " + item.concept}
                          value={item.date}
                          onSave={(value) =>
                            save(
                              editDebtItem(
                                data,
                                item.id,
                                item.concept,
                                item.amount,
                                String(value),
                              ),
                            )
                          }
                        />{" "}
                        ·{" "}
                        {item.source === "work"
                          ? "Ahorro por trabajo"
                          : "Intereses"}
                      </small>
                    </td>
                    <td className="amount">
                      <InlineEdit
                        label={"Retirado " + item.concept}
                        value={item.amount}
                        onSave={(value) =>
                          save(
                            editDebtItem(
                              data,
                              item.id,
                              item.concept,
                              Number(value),
                              item.date,
                            ),
                          )
                        }
                      />
                    </td>
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
                    <td>
                      <Button
                        className="table-row-delete"
                        aria-label={"Borrar " + item.concept}
                        onClick={() => open({ type: "deleteDebt", item })}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
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
      </Surface>
      <Surface component="section" className="panel distribution-panel">
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
          </div>
        </div>

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
                      <Button
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
                      </Button>
                    </span>
                  </td>
                  <td>{euro(row.plannedBase ?? 0)}</td>
                  <td>
                    <span className="amount-pill scheduled">
                      <InlineEdit
                        label={"Reposición " + row.month}
                        value={row.plannedRepayment}
                        onSave={(value) =>
                          save({
                            ...data,
                            internalDebt: {
                              ...data.internalDebt,
                              schedule: [
                                ...data.internalDebt.schedule.filter(
                                  (item) => item.month !== row.month,
                                ),
                                { month: row.month, amount: Number(value) },
                              ],
                            },
                          })
                        }
                      />
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
      </Surface>
    </>
  );
}
