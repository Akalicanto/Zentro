import { CalendarClock, ArrowUpRight, ClockAlert } from "lucide-react";
import {
  debtPaymentWatch,
  installmentStatus,
  euro,
  monthName,
  type ExternalDebt,
} from "../../../domain/index.ts";
import {
  Badge,
  Box,
  Button,
  Stack,
  Surface,
  statusTones,
} from "../../../shared/ui/index.tsx";
import PanelInfo from "../../../shared/components/PanelInfo.tsx";

export default function DebtPaymentWatch({
  debts,
  onSelect,
}: {
  debts: ExternalDebt[];
  onSelect?: (id: string) => void;
}) {
  const active = debts.filter((debt) => !debt.archivedOn && !debt.completedOn);
  if (!active.length) return null;
  return (
    <Surface component="section" className="panel payment-watch">
      <div className="section-title">
        <h3>
          <CalendarClock size={22} /> Cuotas a la vista
        </h3>
      </div>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(auto-fit, minmax(300px, 1fr))",
          },
          gap: 2,
        }}
      >
        {active.map((debt) => {
          const watch = debtPaymentWatch(debt);
          return (
            <Surface
              key={debt.id}
              className="payment-watch-card"
              sx={{ p: 2.5, borderRadius: 3, containerType: "inline-size" }}
            >
              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <strong>{debt.name}</strong>
                {onSelect && (
                  <Button
                    className="icon"
                    type="button"
                    aria-label={`Ver deuda ${debt.name}`}
                    onClick={() => onSelect(debt.id)}
                  >
                    <ArrowUpRight size={18} />
                  </Button>
                )}
              </Stack>
              <p className="payment-watch-day">
                {debt.dueDay
                  ? `Cobro el día ${debt.dueDay} de cada mes`
                  : "Configura el día de cobro en Editar deuda"}
              </p>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  "@container (min-width: 520px)": {
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  },
                  gap: 1.5,
                }}
              >
                {watch.rows.map((row) => {
                  const status = installmentStatus(debt, row);
                  return (
                    <Box
                      key={row.month}
                      className="payment-watch-row"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        background: "var(--soft)",
                      }}
                    >
                      <Stack
                        direction="row"
                        sx={{ justifyContent: "space-between", gap: 1 }}
                      >
                        <span>
                          {monthName(row.month)}
                          {status.due
                            ? ` · día ${Number(status.due.slice(-2))}`
                            : ""}
                        </span>
                        <strong>{euro(row.amount)}</strong>
                      </Stack>
                      <Badge
                        size="small"
                        label={status.label}
                        sx={{
                          mt: 1,
                          color: "var(--text)",
                          background: `color-mix(in srgb, ${statusTones[status.key]} 35%, var(--panel))`,
                        }}
                      />
                    </Box>
                  );
                })}
                {!watch.rows.length && (
                  <p className="payment-watch-day">
                    Sin cuotas este mes ni el próximo.
                  </p>
                )}
                {watch.overdue.length > 0 && (
                  <div
                    className="payment-watch-overdue"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <ClockAlert size={18} />
                    <span>
                      {watch.overdue.length}{" "}
                      {watch.overdue.length === 1
                        ? "cuota vencida"
                        : "cuotas vencidas"}{" "}
                      · {euro(watch.overdueAmount)}
                    </span>
                  </div>
                )}
              </Box>
            </Surface>
          );
        })}
      </Box>
      <PanelInfo title="Cobros y vencimientos">
        Se muestran este mes y el siguiente. Los estados dependen de tus
        registros: pagada, dinero apartado o pendiente. Una cuota pagada antes
        de su vencimiento aparece adelantada; apartar dinero no significa pagar.
        Si el mes no tiene el día elegido, vence su último día. No hay conexión
        automática con el banco.
      </PanelInfo>
    </Surface>
  );
}
