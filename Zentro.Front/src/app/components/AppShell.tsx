import { Button, Snackbar, Surface } from "../../shared/ui/index.tsx";
import { type Page, pages } from "../navigation.ts";
import { type OpenProfileForm } from "../../features/profile/types.ts";
import { useState } from "react";
import {
  ChevronLeft,
  LayoutDashboard,
  Wallet,
  Sprout,
  TrendingUp,
  CreditCard,
  Sun,
  Moon,
  Settings,
  CheckCheck,
} from "lucide-react";

import type { ReactNode } from "react";
import PwaStatus from "../../shared/components/PwaStatus.tsx";
import type { ExternalDebt } from "../../domain/types.ts";
import DebtNavigation from "../../features/debts/components/DebtNavigation.tsx";
import { m, useReducedMotion, AnimatePresence } from "motion/react";
import { motionSettings, Tooltip } from "../../shared/ui/index.tsx";
type Props = {
  page: Page;
  error: string;
  saved: boolean;
  dismissSaved: () => void;
  navigate: (page: Page) => void;
  open: OpenProfileForm;
  children: ReactNode;
  overlay: ReactNode;
  debts: ExternalDebt[];
  selectedDebtId: string | null;
  selectDebt: (id: string | null) => void;
};
export default function AppShell({
  page,
  error,
  saved,
  dismissSaved,
  navigate: onNavigate,
  open,
  children,
  overlay,
  debts,
  selectedDebtId,
  selectDebt,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const reducedMotion = useReducedMotion();
  const [dark, setDark] = useState(
    () => localStorage.getItem("zentro.theme") === "dark",
  );
  const navigate = (next: Page) => {
    onNavigate(next);
  };
  return (
    <div
      className={`app ${dark ? "dark" : ""} ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      <aside>
        <a
          className="brand"
          href="#pagina=Mi%20espacio"
          aria-label="Zentro · Mi espacio"
          onClick={(event) => {
            event.preventDefault();
            navigate("Mi espacio");
          }}
        >
          <span className="brand-mark">
            <img src="/brand/symbol-mini.png" alt="" />
          </span>
          <span className="brand-name">
            <img src="/brand/logo-full.png" alt="" />
          </span>
        </a>
        <Button
          className="sidebar-edge-toggle"
          aria-label={collapsed ? "Expandir navegación" : "Contraer navegación"}
          aria-expanded={!collapsed}
          aria-controls="zentro-navigation"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft size={18} />
        </Button>
        <nav id="zentro-navigation" aria-label="Navegación principal">
          {pages.map((label, index) => {
            const Icon = [
              LayoutDashboard,
              Wallet,
              Sprout,
              TrendingUp,
              CreditCard,
            ][index];
            if (label === "Deudas")
              return (
                <DebtNavigation
                  key={label}
                  debts={debts}
                  selectedId={page === "Deudas" ? selectedDebtId : null}
                  collapsed={collapsed}
                  active={page === "Deudas"}
                  onSelect={selectDebt}
                />
              );
            return (
              <Button
                key={label}
                aria-label={label}
                aria-current={page === label ? "page" : undefined}
                title={collapsed ? label : undefined}
                className={page === label ? "active" : ""}
                onClick={() => navigate(label)}
              >
                <Icon size={18} />
                <span className="nav-item-label">{label}</span>
              </Button>
            );
          })}
        </nav>
      </aside>
      <main>
        <header>
          <div className="header-left">
            <span className="mobile-brand" aria-label="Zentro">
              <img src="/brand/logo-full.png" alt="" />
            </span>
          </div>
          <div className="header-right">
            <PwaStatus />
            <Button
              className="theme-toggle"
              aria-label={dark ? "Modo claro" : "Modo oscuro"}
              onClick={() => {
                localStorage.setItem("zentro.theme", dark ? "light" : "dark");
                setDark(!dark);
              }}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
              <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
            </Button>
            <Button
              className="icon"
              aria-label="Configuración"
              title="Configuración"
              onClick={() => open({ type: "settings" })}
            >
              <Settings size={20} />
            </Button>
          </div>
        </header>
        <m.div
          className="content"
          key={page}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={motionSettings.page}
        >
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {children}
        </m.div>
      </main>
      <nav className="mobile-navigation" aria-label="Navegación móvil">
        {pages.map((label, index) => {
          const Icon = [
            LayoutDashboard,
            Wallet,
            Sprout,
            TrendingUp,
            CreditCard,
          ][index];
          return (
            <Tooltip key={label} title={label}>
              <Button
                aria-label={label}
                aria-current={page === label ? "page" : undefined}
                onClick={() => navigate(label)}
              >
                <Icon aria-hidden="true" />
              </Button>
            </Tooltip>
          );
        })}
      </nav>
      <AnimatePresence>{overlay}</AnimatePresence>
      <Snackbar
        open={saved}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        onClose={(_, reason) => {
          if (reason !== "clickaway") dismissSaved();
        }}
      >
        <Surface className="save-notice" role="status" aria-live="polite">
          <CheckCheck size={20} aria-hidden="true" />
          Cambios guardados
        </Surface>
      </Snackbar>
    </div>
  );
}
