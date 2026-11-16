import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "../../../shared/ui/index.tsx";
import {
  backupRequest,
  type BackupStatus,
} from "../../../shared/api/backupClient.ts";

export default function MailBackupSettings() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void backupRequest<BackupStatus>("status")
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch(() => {
        if (active)
          setStatus({ configured: false, due: false, shouldPrompt: false });
      });
    return () => {
      active = false;
    };
  }, []);
  const send = async () => {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await backupRequest<{ result: string }>(
        "send-now",
        "POST",
      );
      if (result.result !== "sent")
        throw Error("No se pudo completar el envío de la copia.");
      setMessage("Copia enviada. Comprueba tu bandeja de entrada y spam.");
      const updated = await backupRequest<BackupStatus>("status").catch(
        () => null,
      );
      if (updated) setStatus(updated);
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
    <div className="mail-backup-settings" aria-busy={busy}>
      <h4>Copia por correo</h4>
      <p>
        {status?.configured ? (
          <>
            Envía ahora una copia completa a <strong>{status.recipient}</strong>
            , adjunta y sin enlaces. Puedes hacerlo cualquier día, aunque ya
            hayas enviado la de este mes.
          </>
        ) : status ? (
          "El envío por correo no está configurado para esta instalación."
        ) : (
          "Comprobando configuración del correo…"
        )}
      </p>
      {status?.sentAt && (
        <p>
          Último envío de este mes:{" "}
          {new Date(status.sentAt).toLocaleString("es-ES")}.
        </p>
      )}
      <Button onClick={send} disabled={!status?.configured || busy}>
        <Mail size={17} />
        {busy ? "Enviando copia…" : "Enviar copia al correo ahora"}
      </Button>
      <p>
        La copia mensual requiere tu confirmación después del día 15. Si no
        confirmas, se recuerda pasadas 24 horas. El adjunto está comprimido y no
        lleva contraseña.
      </p>
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
