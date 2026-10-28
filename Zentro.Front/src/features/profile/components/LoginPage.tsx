import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Button, Surface } from "../../../shared/ui/index.tsx";
import { login } from "../../../shared/api/accessClient.ts";

export default function LoginPage({
  onSuccess,
}: {
  onSuccess: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="app login-screen">
      <main>
        <Surface className="login-panel">
          <img className="login-logo" src="/brand/logo-full.png" alt="Zentro" />
          <h1>Entrar en Zentro</h1>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              const form = new FormData(event.currentTarget);
              setBusy(true);
              setError("");
              try {
                await login(
                  String(form.get("password")),
                  String(form.get("code")),
                );
                await onSuccess();
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "No se pudo iniciar sesión.",
                );
                setBusy(false);
              }
            }}
          >
            <label>
              Contraseña
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={1024}
                disabled={busy}
              />
            </label>
            <label>
              Código de autenticación
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                minLength={6}
                required
                disabled={busy}
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <Button className="primary" type="submit" disabled={busy}>
              <LockKeyhole size={18} />
              {busy ? "Entrando…" : "Iniciar sesión"}
            </Button>
          </form>
        </Surface>
      </main>
    </div>
  );
}
