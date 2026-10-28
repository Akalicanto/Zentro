import { Button } from "./shared/ui/index.tsx";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.tsx";
import { UiProvider } from "./shared/ui/index.tsx";
import "./styles/index.css";
import { loadData } from "./features/profile/services/profileStorage.ts";
import { ApiError } from "./shared/api/profileClient.ts";
import LoginPage from "./features/profile/components/LoginPage.tsx";
import PendingChangesActions from "./features/profile/components/PendingChangesActions.tsx";
const root = ReactDOM.createRoot(document.getElementById("root")!);
const showLogin = () =>
  root.render(
    <UiProvider>
      <LoginPage onSuccess={start} />
    </UiProvider>,
  );
window.addEventListener("zentro:authentication-required", showLogin);
async function start() {
  root.render(
    <main className="panel">
      <h1>Cargando Zentro…</h1>
    </main>,
  );
  try {
    const data = await loadData();
    root.render(
      <React.StrictMode>
        <UiProvider>
          <App initialData={data} />
        </UiProvider>
      </React.StrictMode>,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      showLogin();
      return;
    }
    root.render(
      <UiProvider>
        <div className="app login-screen">
          <main className="panel">
            <h1>No se pudo cargar Zentro</h1>
            <p>
              Comprueba que el backend esté arrancado. Tus datos guardados se
              conservan.
            </p>
            <p>
              {error instanceof Error ? error.message : "Error de conexión"}
            </p>
            <Button onClick={() => void start()}>Reintentar</Button>
            <PendingChangesActions />
          </main>
        </div>
      </UiProvider>,
    );
  }
}
void start();
