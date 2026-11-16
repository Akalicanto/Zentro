import { useEffect, useRef, useState } from "react";
import { Mail, X } from "lucide-react";
import ModalFrame from "../../../shared/components/ModalFrame.tsx";
import { Button } from "../../../shared/ui/index.tsx";
import {
  backupRequest,
  type BackupStatus,
} from "../../../shared/api/backupClient.ts";

export default function MonthlyBackupPrompt() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const open = useRef(false);
  const sending = useRef(false);
  useEffect(() => {
    let active = true;
    let checking = false;
    const check = async () => {
      if (
        checking ||
        open.current ||
        document.hidden ||
        document.querySelector('[role="dialog"]')
      )
        return;
      checking = true;
      try {
        const value = await backupRequest<BackupStatus>("status");
        if (
          !active ||
          !value.configured ||
          !value.shouldPrompt ||
          document.querySelector('[role="dialog"]')
        )
          return;
        const claimed = await backupRequest<BackupStatus>("prompt", "POST");
        if (
          active &&
          claimed.claimed &&
          !document.querySelector('[role="dialog"]')
        ) {
          open.current = true;
          setStatus(claimed);
          setError("");
          setSent(false);
        }
      } catch {
        /* The backup service may be unavailable; never block financial editing. */
      } finally {
        checking = false;
      }
    };
    void check();
    const interval = setInterval(check, 60_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  if (!status) return null;
  const close = () => {
    if (sending.current) return;
    if (!sent) void backupRequest("defer", "POST").catch(() => {});
    open.current = false;
    setStatus(null);
  };
  const send = async () => {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await backupRequest<{ result: string }>("send", "POST");
      if (!["sent", "already-sent"].includes(result.result))
        throw Error(
          "El envío mensual ya no corresponde. Puedes enviar una copia desde Configuración.",
        );
      setSent(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo enviar la copia.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  return (
    <ModalFrame onClose={close}>
      <section
        className="modal monthly-backup-confirmation"
        role="dialog"
        aria-modal="true"
        aria-labelledby="monthly-backup-title"
        aria-describedby="monthly-backup-description"
        aria-busy={busy}
      >
        <div className="section-title">
          <h3 id="monthly-backup-title">
            {sent ? "Copia enviada" : "¿Enviamos tu copia de seguridad?"}
          </h3>
          <Button
            className="icon"
            aria-label="Cerrar aviso de copia"
            onClick={close}
            disabled={busy}
          >
            <X />
          </Button>
        </div>
        <p id="monthly-backup-description">
          {sent ? (
            <>
              El servidor de correo ha aceptado la copia para{" "}
              <strong>{status.recipient}</strong>. Comprueba tu bandeja de
              entrada y spam.
            </>
          ) : (
            <>
              Está pendiente la copia de este mes. Se enviará a{" "}
              <strong>{status.recipient}</strong> con la base completa
              comprimida como archivo adjunto, sin enlaces.
            </>
          )}
        </p>
        {!sent && (
          <p>
            Si eliges «Ahora no» o cierras este aviso, volveremos a preguntarte
            después de 24 horas, cuando Zentro esté abierto. El archivo adjunto
            no lleva contraseña.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          {sent ? (
            <Button className="primary" onClick={close}>
              Cerrar
            </Button>
          ) : (
            <>
              <Button onClick={close} disabled={busy}>
                Ahora no · Recordar en 24 h
              </Button>
              <Button className="primary" onClick={send} disabled={busy}>
                <Mail size={17} />
                {busy ? "Enviando copia…" : "Confirmar y enviar"}
              </Button>
            </>
          )}
        </div>
      </section>
    </ModalFrame>
  );
}
