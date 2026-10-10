import { Button, Surface } from "../ui/index.tsx";
import { euro } from "../utils/money.ts";
import { ArrowUpRight, Pencil } from "lucide-react";
import PanelInfo from "./PanelInfo.tsx";

import type { ReactNode } from "react";
type Props = {
  label: string;
  amount: number;
  note: string;
  accent?: boolean;
  action?: { label: string; onClick: () => void; disabled?: boolean };
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
    <Surface
      className={`metric ${accent ? "accent" : ""} ${tone ? `tone-${tone}` : ""}`}
    >
      <span>{label}</span>
      <h2>{euro(amount)}</h2>
      <small>{note}</small>
      {action && (
        <Button
          className="metric-action"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label.startsWith("Ver") ? (
            <ArrowUpRight size={14} />
          ) : (
            <Pencil size={13} />
          )}
          {action.label}
        </Button>
      )}
      {help && <PanelInfo title={label}>{help}</PanelInfo>}
    </Surface>
  );
}
