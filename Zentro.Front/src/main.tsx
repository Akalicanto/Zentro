import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { loadData } from "./features/profile/services/profileStorage.ts";
const root = ReactDOM.createRoot(document.getElementById("root")!);
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
        <App initialData={data} />
      </React.StrictMode>,
    );
  } catch (error) {
    root.render(
      <main className="panel">
        <h1>No se pudo cargar Zentro</h1>
        <p>
          Comprueba que el backend esté arrancado. Tus datos guardados se
          conservan.
        </p>
        <p>{error instanceof Error ? error.message : "Error de conexión"}</p>
        <button onClick={() => void start()}>Reintentar</button>
      </main>,
    );
  }
}
void start();
