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
  Menu,
  Sun,
  Moon,
  Settings,
} from "lucide-react";

import type { ReactNode } from "react";
type Props = {
  page: Page;
  error: string;
  navigate: (page: Page) => void;
  open: OpenProfileForm;
  children: ReactNode;
  overlay: ReactNode;
};
export default function AppShell({
  page,
  error,
  navigate: onNavigate,
  open,
  children,
  overlay,
}: Props) {
  const [mobile, setMobile] = useState(false),
    [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem("zentro.theme") === "dark",
  );
  const navigate = (next: Page) => {
    onNavigate(next);
    setMobile(false);
  };
  return (
    <div
      className={`app ${dark ? "dark" : ""} ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      <aside className={mobile ? "open" : ""}>
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
            <img src="/brand/logo-ui.png" alt="Zentro" />
          </span>
        </a>
        <button
          className="sidebar-edge-toggle"
          aria-label={collapsed ? "Expandir navegación" : "Contraer navegación"}
          aria-expanded={!collapsed}
          aria-controls="zentro-navigation"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft size={18} />
        </button>
        <nav id="zentro-navigation" aria-label="Navegación principal">
          {pages.map((label, index) => {
            const Icon = [
              LayoutDashboard,
              Wallet,
              Sprout,
              TrendingUp,
              CreditCard,
            ][index];
            return (
              <button
                key={label}
                aria-label={label}
                aria-current={page === label ? "page" : undefined}
                title={collapsed ? label : undefined}
                className={page === label ? "active" : ""}
                onClick={() => navigate(label)}
              >
                <Icon size={18} />
                <span className="nav-item-label">{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main>
        <header>
          <div className="header-left">
            <button
              className="icon mobile-menu"
              aria-label="Abrir menú"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
          </div>
          <div className="header-right">
            <button
              className="theme-toggle"
              aria-label={dark ? "Modo claro" : "Modo oscuro"}
              onClick={() => {
                localStorage.setItem("zentro.theme", dark ? "light" : "dark");
                setDark(!dark);
              }}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
              <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
            </button>
            <button
              className="icon"
              aria-label="Plan y copias de seguridad"
              onClick={() => open({ type: "settings" })}
            >
              <Settings size={20} />
            </button>
          </div>
        </header>
        <div className="content" key={page}>
          <div className="page-heading savings-page-bar">
            <div>
              <h1>
                {page === "Mi espacio" && (
                  <LayoutDashboard size={27} aria-hidden="true" />
                )}
                {page === "Ahorros" && <Sprout size={27} aria-hidden="true" />}
                {page === "Día a día" && (
                  <Wallet size={27} aria-hidden="true" />
                )}
                {page === "Inversión" && (
                  <TrendingUp size={27} aria-hidden="true" />
                )}
                {page === "Deudas" && (
                  <CreditCard size={27} aria-hidden="true" />
                )}
                {page}
              </h1>
            </div>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {children}
        </div>
      </main>
      {overlay}
    </div>
  );
}
