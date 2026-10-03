import {
  type Profile,
  cashTotals,
  currentMonth,
  euro,
  sum,
  monthName,
} from "../../../domain/index.ts";
import { type OpenProfileForm, type SaveProfile } from "../../profile/types.ts";
import { useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";
import MetricCard from "../../../shared/components/MetricCard.tsx";

type Props = { data: Profile; open: OpenProfileForm; save: SaveProfile };
export default function DailyPage({ data, open, save }: Props) {
  const daily = cashTotals(data),
    dailyMonth = currentMonth();
  const [editingCash, setEditingCash] = useState({
    expenses: false,
    incomes: false,
  });
  const [editingPossible, setEditingPossible] = useState(false);
  function removeCash(kind: "expenses" | "incomes", id: string) {
    if (
      confirm(
        "¿Eliminar este registro? Se recalculará el saldo y la previsión.",
      )
    )
      save({
        ...data,
        daily: {
          ...data.daily,
          [kind]: data.daily[kind].filter((r) => r.id !== id),
        },
      });
  }
  function cashTable(kind: "expenses" | "incomes") {
    const rows = data.daily[kind].filter((r) => r.month === dailyMonth);
    const expense = kind === "expenses";
    const editing = editingCash[kind];
    return (
      <section className="panel cash-panel">
        <div className="section-title">
          <div>
            <h3>{expense ? "Gastos" : "Ingresos"}</h3>
            <p>
              Total del mes: <b>{euro(sum(rows.map((r) => r.amount)))}</b>
            </p>
          </div>
          <div className="history-actions">
            <button
              className={`history-edit-toggle${editing ? " active" : ""}`}
              aria-label={
                editing
                  ? `Terminar edición de ${expense ? "gastos" : "ingresos"}`
                  : `Editar ${expense ? "gastos" : "ingresos"}`
              }
              aria-pressed={editing}
              onClick={() =>
                setEditingCash({ ...editingCash, [kind]: !editing })
              }
            >
              {editing ? <Check size={16} /> : <Pencil size={16} />}
              {editing ? "Terminar edición" : "Editar"}
            </button>
            <button
              className="history-edit-toggle"
              onClick={() => open({ type: "cash", kind })}
            >
              <Plus size={16} />
              {expense ? "Añadir gasto" : "Añadir ingreso"}
            </button>
          </div>
        </div>
        {editing && (
          <p className="history-edit-note">
            Selecciona un concepto para editarlo.
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Importe</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {editing ? (
                      <button
                        className="history-month-edit"
                        aria-label={`Editar ${row.concept}`}
                        onClick={() => open({ type: "cash", kind, item: row })}
                      >
                        {row.concept}
                      </button>
                    ) : (
                      row.concept
                    )}
                    {row.includedInOpening && (
                      <small>Ya incluido en el saldo indicado</small>
                    )}
                  </td>
                  <td>{euro(row.amount)}</td>
                  <td>
                    <span
                      className={`badge ${row.status === "done" ? "green" : "amber"}`}
                    >
                      {row.status === "done" ? "Realizado" : "Previsto"}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      {row.status === "planned" && (
                        <button
                          className="icon"
                          aria-label={`Realizar ${row.concept}`}
                          onClick={() =>
                            save({
                              ...data,
                              daily: {
                                ...data.daily,
                                [kind]: data.daily[kind].map((r) =>
                                  r.id === row.id
                                    ? { ...r, status: "done" }
                                    : r,
                                ),
                              },
                            })
                          }
                        >
                          <Check size={15} />
                        </button>
                      )}
                      {editing && (
                        <button
                          className="icon danger"
                          aria-label={`Eliminar ${row.concept}`}
                          onClick={() => removeCash(kind, row.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="empty">
            Todavía no hay {expense ? "gastos" : "ingresos"} registrados para
            este mes.
          </p>
        )}
        <PanelInfo title={expense ? "Gastos" : "Ingresos"}>
          Las tablas muestran el mes actual. Los movimientos previstos modifican
          el saldo después de pendientes. Al realizarlos, pasan al saldo actual
          una sola vez. Los movimientos ya incluidos en un saldo actualizado no
          se vuelven a sumar ni descontar.
        </PanelInfo>
      </section>
    );
  }
  return (
    <>
      <div className="cards daily-primary">
        {
          <MetricCard
            label="Saldo actual · ING"
            amount={daily.current}
            note="Dinero disponible en este momento"
            accent={true}
            action={{
              label: "Actualizar saldo",
              onClick: () => open({ type: "balance" }),
            }}
            tone="sage"
          />
        }
        {
          <MetricCard
            label="Efectivo"
            amount={data.cash ?? 0}
            note="Importe independiente"

            action={{
              label: "Actualizar efectivo",
              onClick: () => open({ type: "cashBalance" }),
            }}
            tone="peach"
          />
        }
        {
          <MetricCard
            label="Gastos previstos"
            amount={daily.expenses}
            note="Pendientes de realizar"

            tone="rose"
          />
        }
        {
          <MetricCard
            label="Ingresos previstos"
            amount={daily.incomes}
            note="Pendientes de recibir"

            tone="sage"
          />
        }
        {
          <MetricCard
            label="Saldo después de pendientes"
            amount={daily.forecast}
            note="Previsión calculada sobre la marcha"

            tone="blue"
          />
        }
      </div>
      <div className="daily-current-month">
        <span className="month-marker">{dailyMonth.slice(5)}</span>
        <h3>
          {monthName(dailyMonth).replace(/^./, (letter) =>
            letter.toUpperCase(),
          )}
        </h3>
      </div>
      <div className="cards two">
        {cashTable("expenses")}
        {cashTable("incomes")}
      </div>
      <section className="panel possible-expenses-panel">
        <div className="section-title">
          <div>
            <h3>Posibles gastos</h3>
            <p>
              Total estimado:{" "}
              <b>
                {euro(sum((data.possibleExpenses ?? []).map((r) => r.amount)))}
              </b>
            </p>
          </div>
          <div className="history-actions">
            <button
              className={`history-edit-toggle${editingPossible ? " active" : ""}`}
              aria-label={
                editingPossible
                  ? "Terminar edición de posibles gastos"
                  : "Editar posibles gastos"
              }
              aria-pressed={editingPossible}
              onClick={() => setEditingPossible(!editingPossible)}
            >
              {editingPossible ? <Check size={16} /> : <Pencil size={16} />}
              {editingPossible ? "Terminar edición" : "Editar"}
            </button>
            <button
              className="history-edit-toggle"
              onClick={() => open({ type: "possibleExpense" })}
            >
              <Plus size={16} />
              Añadir posible gasto
            </button>
          </div>
        </div>
        {editingPossible && (
          <p className="history-edit-note">
            Selecciona un concepto para editarlo.
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Importe estimado</th>
                {editingPossible && <th>Borrar</th>}
              </tr>
            </thead>
            <tbody>
              {(data.possibleExpenses ?? []).map((row) => (
                <tr key={row.id}>
                  <td>
                    {editingPossible ? (
                      <button
                        className="history-month-edit"
                        aria-label={`Editar posible gasto ${row.concept}`}
                        onClick={() =>
                          open({ type: "possibleExpense", item: row })
                        }
                      >
                        {row.concept}
                      </button>
                    ) : (
                      row.concept
                    )}
                  </td>
                  <td>{euro(row.amount)}</td>
                  {editingPossible && (
                    <td>
                      <button
                        className="icon danger"
                        aria-label={`Eliminar posible gasto ${row.concept}`}
                        onClick={() => {
                          if (confirm("¿Eliminar este posible gasto?"))
                            save({
                              ...data,
                              possibleExpenses: (
                                data.possibleExpenses ?? []
                              ).filter((r) => r.id !== row.id),
                            });
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.possibleExpenses?.length && (
          <p className="empty">Añade gastos que quieras tener en mente.</p>
        )}
        <PanelInfo title="Posibles gastos">
          Lista independiente de gastos que quieres tener en mente. No tiene mes
          ni cuenta y no modifica el saldo actual, el saldo previsto, el
          efectivo ni el patrimonio.
        </PanelInfo>
      </section>
    </>
  );
}
