import type { ReactNode } from "react";
import {
  CreditCard,
  LayoutDashboard,
  Sprout,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { Page } from "../../app/navigation.ts";
import { Surface } from "../ui/index.tsx";

const appearance = {
  "Mi espacio": { Icon: LayoutDashboard, tone: "violet" },
  "Día a día": { Icon: Wallet, tone: "peach" },
  Ahorros: { Icon: Sprout, tone: "sage" },
  Inversión: { Icon: TrendingUp, tone: "blue" },
  Deudas: { Icon: CreditCard, tone: "rose" },
};

export default function PageHeading({
  title,
  actions,
  tabs,
}: {
  title: Page;
  actions?: ReactNode;
  tabs?: ReactNode;
}) {
  const { Icon, tone } = appearance[title];
  return (
    <Surface component="section" className={`page-banner page-banner-${tone}`}>
      <div className="page-banner-main">
        <div className="page-banner-title">
          <span className="page-banner-icon">
            <Icon size={28} aria-hidden="true" />
          </span>
          <h1>{title}</h1>
        </div>
        {actions && <div className="page-banner-actions">{actions}</div>}
      </div>
      {tabs && <div className="page-banner-tabs">{tabs}</div>}
    </Surface>
  );
}
