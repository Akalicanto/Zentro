import { euro } from "../utils/money.ts";
import { ArrowUpRight, Pencil } from "lucide-react";
import PanelInfo from "./PanelInfo.tsx";

import type { ReactNode } from "react";
type Props = {
  label: string;
  amount: number;
  note: string;
  accent?: boolean;
  action?: { label: string; onClick: () => void };
  tone?: string;
  help?: ReactNode;
};
export default function MetricCard({
  label,
  amount,
  note,
  accent = false,
  action,
  tone = "",
  help,
}: Props) {
  return (
    <div
      className={`metric ${accent ? "accent" : ""} ${tone ? `tone-${tone}` : ""}`}
    >
      <span>{label}</span>
      <h2>{euro(amount)}</h2>
      <small>{note}</small>
      {action && (
        <button className="metric-action" onClick={action.onClick}>
          {action.label.startsWith("Ver") ? (
            <ArrowUpRight size={14} />
          ) : (
            <Pencil size={13} />
          )}
          {action.label}
        </button>
      )}
      {help && <PanelInfo title={label}>{help}</PanelInfo>}
    </div>
  );
}
