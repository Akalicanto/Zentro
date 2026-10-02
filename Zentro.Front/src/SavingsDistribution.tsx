import { memo, useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, X, Landmark } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  addMonth,
  cents,
  currentMonth,
  euro,
  monthName,
  placementReturn,
  savingsDistribution,
  uid,
  validateProfile,
  type Profile,
  type SavingsPlacement,
} from "./model";
import PanelInfo from "./PanelInfo";

const colours = ["#a68acb", "#8eae9b", "#d4a688", "#b896ac", "#8ba7cc"];
const percent = (bps: number) =>
  `${(bps / 100).toLocaleString("es-ES", { maximumFractionDigits: 2 })} %`;
const dateName = (date: string) => date.split("-").reverse().join("/");
const fiscalSource = "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820#a90";
type Distribution = ReturnType<typeof savingsDistribution>;
const DistributionCharts = memo(function DistributionCharts({
  distribution,
}: {
  distribution: Distribution;
}) {
  const slices = distribution.rows.map((r, i) => ({
    name: r.name,
    value: r.balance,
    colour: colours[i % colours.length],
  }));
  if (distribution.unassigned)
    slices.push({
      name: "Sin asignar",
      value: distribution.unassigned,
      colour: "#c5becb",
    });
  const projection = Array.from({ length: 13 }, (_, i) => {
    const point: Record<string, number> = { month: i };
    distribution.rows.forEach((row, j) => {
      point[`p${j}`] =
        row.kind === "deposit"
          ? placementReturn(row, row.balance, Math.min(i, row.months!)).net
          : Array.from(
              { length: i },
              (_, n) =>
                placementReturn(
                  row,
                  row.balance,
                  1,
                  addMonth(currentMonth(), n),
                ).net,
            ).reduce((a, b) => a + b, 0);
    });
    return point;
  });
  return (
    <div className="cards two allocation-charts">
      <section className="panel">
        <h3>Dónde está tu ahorro</h3>
        <div
          className="allocation-donut"
          role="img"
          aria-label="Gráfico de distribución del ahorro"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices.filter((r) => r.value > 0)}
                dataKey="value"
                nameKey="name"
                innerRadius="65%"
                outerRadius="90%"
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {slices
                  .filter((r) => r.value > 0)
                  .map((r) => (
                    <Cell key={r.name} fill={r.colour} />
                  ))}
              </Pie>
              <Tooltip
                formatter={(v) => euro(Number(v))}
                contentStyle={{
                  background: "var(--panel)",
                  borderColor: "var(--line)",
                  borderRadius: 12,
                  color: "var(--text)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-total">
            <span>Ahorro total</span>
            <strong>{euro(distribution.total)}</strong>
          </div>
        </div>
        <div className="allocation-legend">
          {slices.map((r, i) => (
            <div key={i}>
              <span
                className="allocation-dot"
                style={{ background: r.colour }}
              />
              <span>{r.name}</span>
              <strong>{euro(r.value)}</strong>
            </div>
          ))}
        </div>
        <PanelInfo title="Distribución del ahorro">
          Los destinos muestran dónde está el ahorro total, incluyendo los
          intereses ya registrados. Una cuenta puede recibir automáticamente el
          resto del ahorro. Cambiar esta distribución no registra aportaciones
          ni altera tu patrimonio.
        </PanelInfo>
      </section>
      <section className="panel">
        <h3>Generación neta estimada</h3>
        <p className="allocation-chart-caption">
          Doce meses, manteniendo el saldo actual
        </p>
        <div
          className="chart allocation-projection"
          role="img"
          aria-label="Gráfico de intereses netos estimados"
        >
          {distribution.rows.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={projection}
                margin={{ top: 12, right: 28, bottom: 8, left: 0 }}
              >
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(n) => `Mes ${n}`}
                  interval={2}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(n) => `${Math.round(Number(n) / 100)} €`}
                  width={64}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                />
                <Tooltip
                  labelFormatter={(n) => `Mes ${n}`}
                  formatter={(v, name) => [euro(Number(v)), name]}
                  contentStyle={{
                    background: "var(--panel)",
                    borderColor: "var(--line)",
                    borderRadius: 12,
                    color: "var(--text)",
                  }}
                />
                {distribution.rows.map((row, i) => (
                  <Line
                    key={row.id}
                    dataKey={`p${i}`}
                    name={row.name}
                    stroke={colours[i % colours.length]}
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty">Añade un destino para ver la estimación.</p>
          )}
        </div>
        <div className="allocation-projection-key">
          {distribution.rows.map((r, i) => (
            <span key={r.id}>
              <i style={{ background: colours[i % colours.length] }} />
              {r.name}
            </span>
          ))}
        </div>
        <PanelInfo title="Intereses netos estimados">
          Es una proyección: no se suma a tus intereses cobrados. El depósito
          muestra el interés desde el inicio del contrato hasta su plazo y la
          cuenta suma estimaciones desde el mes actual sin reinvertir intereses
          ni añadir aportaciones. Neto significa descontar el porcentaje fiscal
          editable; la liquidación final del IRPF puede variar. El cálculo
          Actual/360 usa los días de cada mes con saldo constante.{" "}
          <a href={fiscalSource} target="_blank" rel="noreferrer">
            Referencia fiscal
          </a>
          .
        </PanelInfo>
      </section>
    </div>
  );
});

export default function SavingsDistribution({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (p: Profile) => boolean;
}) {
  const distribution = useMemo(() => savingsDistribution(profile), [profile]);
  const [editing, setEditing] = useState(false);
  const [modal, setModal] = useState<{ row?: SavingsPlacement } | null>(null);
  const [kind, setKind] = useState<SavingsPlacement["kind"]>("deposit");
  const [automatic, setAutomatic] = useState(false);
  const [error, setError] = useState("");
  function open(row?: SavingsPlacement) {
    setError("");
    setKind(row?.kind ?? "deposit");
    setAutomatic(row?.amount === null);
    setModal({ row });
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget),
        text = (key: string) => String(form.get(key) ?? "").trim();
      const row: SavingsPlacement = {
        id: modal?.row?.id ?? uid(),
        name: text("name"),
        kind,
        amount:
          kind === "remunerated" && automatic ? null : cents(text("amount")),
        annualRateBps: cents(text("rate")),
        rateType: text("rateType") as SavingsPlacement["rateType"],
        dayCount:
          kind === "remunerated"
            ? (text("dayCount") as SavingsPlacement["dayCount"])
            : "monthly",
        withholdingBps: cents(text("tax")),
        start: kind === "deposit" ? text("start") : null,
        months: kind === "deposit" ? Number(text("months")) : null,
      };
      const next = {
        ...profile,
        savingsPlacements: modal?.row
          ? (profile.savingsPlacements ?? []).map((r) =>
              r.id === row.id ? row : r,
            )
          : [...(profile.savingsPlacements ?? []), row],
      };
      validateProfile(next);
      if (savingsDistribution(next).excess > 0)
        throw Error(
          "Los importes asignados superan el ahorro total. Revisa el capital de los destinos.",
        );
      if (onSave(next)) setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisa el destino.");
    }
  }
  function remove(row: SavingsPlacement) {
    if (
      confirm(
        `¿Quitar «${row.name}» de la distribución? El ahorro total se conserva.`,
      )
    )
      onSave({
        ...profile,
        savingsPlacements: (profile.savingsPlacements ?? []).filter(
          (r) => r.id !== row.id,
        ),
      });
  }
  return (
    <>
      <div className="cards two savings-secondary allocation-yield-summary">
        <div className="metric tone-blue">
          <span>Depósitos · neto al vencimiento</span>
          <h2>{euro(distribution.depositNet)}</h2>
          <small>Intereses previstos, sin incluir el capital</small>
        </div>
        <div className="metric tone-sage">
          <span>Cuenta remunerada · neto mensual</span>
          <h2>{euro(distribution.monthlyNet)}</h2>
          <small>Estimación de {monthName(currentMonth())}</small>
        </div>
      </div>
      {distribution.excess > 0 && (
        <p className="error" role="alert">
          La distribución supera el ahorro en {euro(distribution.excess)}.
          Actualiza los importes de los destinos.
        </p>
      )}
      <DistributionCharts distribution={distribution} />
      <div className="section-title allocation-heading">
        <div>
          <span className="table-eyebrow">CADA CÉNTIMO, EN SU SITIO</span>
          <h3>Destinos del ahorro</h3>
        </div>
        <div className="history-actions">
          <button
            className={`history-edit-toggle${editing ? " active" : ""}`}
            aria-pressed={editing}
            aria-label={
              editing
                ? "Terminar edición de distribución"
                : "Editar distribución"
            }
            onClick={() => setEditing(!editing)}
          >
            {editing ? <Check size={16} /> : <Pencil size={16} />}{" "}
            {editing ? "Terminar edición" : "Editar"}
          </button>
          <button className="history-edit-toggle" onClick={() => open()}>
            <Plus size={16} />
            Añadir destino
          </button>
        </div>
      </div>
      <div className="cards two allocation-destinations">
        {distribution.rows.map((row) => (
          <section className="panel placement-card" key={row.id}>
            <div className="placement-heading">
              <div className="placement-provider">
                {row.name.toLowerCase().includes("myinvestor") ? (
                  <img src="/logos/myinvestor.webp" alt="" />
                ) : row.name.toLowerCase().includes("trade republic") ? (
                  <img src="/logos/trade-republic.svg" alt="" />
                ) : (
                  <Landmark size={26} />
                )}
              </div>
              <div>
                <span>
                  {row.kind === "deposit" ? "Depósito" : "Cuenta remunerada"}
                </span>
                <h3>{row.name}</h3>
              </div>
              {editing && (
                <button
                  className="history-edit-toggle"
                  aria-label={`Editar destino ${row.name}`}
                  onClick={() => open(row)}
                >
                  <Pencil size={16} />
                  Editar
                </button>
              )}
            </div>
            <div className="placement-balance">
              <strong>{euro(row.balance)}</strong>
              <span>
                {distribution.total
                  ? ((100 * row.balance) / distribution.total).toLocaleString(
                      "es-ES",
                      { maximumFractionDigits: 2 },
                    )
                  : "0"}{" "}
                % del ahorro
              </span>
            </div>
            <dl className="placement-details">
              <div>
                <dt>Tipo anual</dt>
                <dd>
                  {percent(row.annualRateBps)} {row.rateType.toUpperCase()}
                </dd>
              </div>
              {row.kind === "deposit" && (
                <>
                  <div>
                    <dt>Plazo</dt>
                    <dd>{row.months} meses</dd>
                  </div>
                  <div>
                    <dt>Inicio</dt>
                    <dd>{dateName(row.start!)}</dd>
                  </div>
                  <div>
                    <dt>Vencimiento</dt>
                    <dd>{dateName(row.maturity!)}</dd>
                  </div>
                </>
              )}
              <div>
                <dt>Retención estimada</dt>
                <dd>{percent(row.withholdingBps)}</dd>
              </div>
              {row.amount === null && (
                <div>
                  <dt>Importe</dt>
                  <dd>Resto del ahorro · automático</dd>
                </div>
              )}
            </dl>
            <div className={`placement-yield ${row.kind}`}>
              <span>
                {row.kind === "deposit"
                  ? "Generará neto al finalizar"
                  : "Generará neto este mes"}
              </span>
              <strong>{euro(row.yield.net)}</strong>
              <small>
                {euro(row.yield.gross)} brutos · {euro(row.yield.withheld)} de
                retención
              </small>
            </div>
            {editing && (
              <button className="placement-remove" onClick={() => remove(row)}>
                <Trash2 size={14} />
                Quitar destino
              </button>
            )}
            <PanelInfo title={row.name}>
              {row.kind === "deposit"
                ? "El capital se mantiene separado de los intereses estimados. TIN usa interés proporcional al plazo; TAE usa el rendimiento efectivo equivalente."
                : "La estimación mantiene el saldo constante. TIN divide el tipo anual entre doce o usa Actual/360; TAE obtiene su tipo mensual equivalente."}{" "}
              La retención es editable y las estimaciones no se añaden al
              patrimonio.{" "}
              {row.name.toLowerCase().includes("trade republic") && (
                <>
                  Trade Republic calcula por días reales/360 y abona los
                  intereses mensualmente.{" "}
                  <a
                    href="https://support.traderepublic.com/es-es/1533-What-do-I-need-to-know-about-interest"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Método de cálculo
                  </a>
                  .{" "}
                </>
              )}
              {row.amount === null &&
                "El saldo toma automáticamente el ahorro que no esté asignado a otros destinos."}
            </PanelInfo>
          </section>
        ))}
      </div>
      {!distribution.rows.length && (
        <section className="panel empty">
          Añade tu depósito o una cuenta remunerada para distribuir el ahorro.
        </section>
      )}
      {modal && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="placement-modal-title"
          >
            <div className="section-title">
              <h3 id="placement-modal-title">
                {modal.row
                  ? "Editar destino del ahorro"
                  : "Nuevo destino del ahorro"}
              </h3>
              <button
                className="icon"
                aria-label="Cerrar formulario"
                onClick={() => setModal(null)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={submit}>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-grid">
                <label className="full">
                  Nombre del destino
                  <input
                    required
                    name="name"
                    defaultValue={modal.row?.name ?? ""}
                  />
                </label>
                <label>
                  Tipo
                  <select
                    aria-label="Tipo"
                    value={kind}
                    onChange={(e) => {
                      setKind(e.target.value as SavingsPlacement["kind"]);
                      setAutomatic(false);
                    }}
                  >
                    <option value="deposit">Depósito</option>
                    <option value="remunerated">Cuenta remunerada</option>
                  </select>
                </label>
                <label>
                  Capital (€)
                  <input
                    required={!automatic}
                    name="amount"
                    inputMode="decimal"
                    disabled={automatic}
                    defaultValue={
                      modal.row?.amount !== null &&
                      modal.row?.amount !== undefined
                        ? modal.row.amount / 100
                        : ""
                    }
                    placeholder={automatic ? "Resto automático" : ""}
                  />
                </label>
                {kind === "remunerated" && (
                  <label className="automatic-placement full">
                    <input
                      type="checkbox"
                      checked={automatic}
                      onChange={(e) => setAutomatic(e.target.checked)}
                    />
                    <span>
                      Asignar aquí el resto del ahorro automáticamente
                    </span>
                  </label>
                )}
                <label>
                  Interés anual (%)
                  <input
                    required
                    name="rate"
                    inputMode="decimal"
                    defaultValue={
                      modal.row ? modal.row.annualRateBps / 100 : ""
                    }
                  />
                </label>
                <label>
                  Tipo de interés
                  <select
                    name="rateType"
                    aria-label="Tipo de interés"
                    defaultValue={modal.row?.rateType ?? "tin"}
                  >
                    <option value="tin">TIN</option>
                    <option value="tae">TAE</option>
                  </select>
                </label>
                {kind === "deposit" && (
                  <>
                    <label>
                      Fecha de inicio
                      <input
                        type="date"
                        required
                        name="start"
                        defaultValue={modal.row?.start ?? ""}
                      />
                    </label>
                    <label>
                      Duración (meses)
                      <input
                        type="number"
                        min="1"
                        max="600"
                        step="1"
                        required
                        name="months"
                        defaultValue={modal.row?.months ?? ""}
                      />
                    </label>
                  </>
                )}
                <label>
                  Retención estimada (%)
                  <input
                    required
                    name="tax"
                    inputMode="decimal"
                    defaultValue={
                      modal.row ? modal.row.withholdingBps / 100 : 19
                    }
                  />
                </label>
                {kind === "remunerated" && (
                  <label>
                    Cálculo mensual
                    <select
                      name="dayCount"
                      aria-label="Cálculo mensual"
                      defaultValue={modal.row?.dayCount ?? "monthly"}
                    >
                      <option value="monthly">Mes equivalente · TIN/TAE</option>
                      <option value="actual360">Días reales / 360 · TIN</option>
                    </select>
                  </label>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="primary">
                  Guardar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
