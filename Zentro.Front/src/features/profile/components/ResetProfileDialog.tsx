import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, Trash2 } from "lucide-react";
import ModalFrame from "../../../shared/components/ModalFrame.tsx";
import { Button } from "../../../shared/ui/index.tsx";

export default function ResetProfileDialog({
  onCancel,
  onComplete,
  resetProfile,
  exportBackup,
}: {
  onCancel: () => void;
  onComplete: () => void;
  resetProfile: () => Promise<void>;
  exportBackup: () => void;
}) {
  const [phrase, setPhrase] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || phrase !== "BORRAR TODO" || !accepted) return;
    setBusy(true);
    setError("");
    try {
      await resetProfile();
      onComplete();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo confirmar el borrado. Inténtalo de nuevo.",
      );
      setBusy(false);
    }
  }
  return (
    <ModalFrame
      onClose={() => {
        if (!busy) onCancel();
      }}
    >
      <section
        className="modal reset-profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-profile-title"
        aria-describedby="reset-profile-description"
        aria-busy={busy}
      >
        <span className="reset-profile-icon">
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <h2 id="reset-profile-title">¿Borrar todos los datos?</h2>
        <p id="reset-profile-description">
          Se eliminarán los saldos, movimientos, historiales de ahorro e
          inversión, intereses, deudas, destinos del ahorro y tu plan mensual.
          Zentro volverá a un perfil vacío.
        </p>
        <p>
          Solo podrás recuperar esos datos importando una copia. Tus archivos de
          copia de seguridad se conservan.
        </p>
        <Button
          className="history-edit-toggle"
          onClick={exportBackup}
          disabled={busy}
        >
          <Download size={18} />
          Exportar copia antes de borrar
        </Button>
        <form onSubmit={submit}>
          <label className="reset-profile-phrase">
            Escribe BORRAR TODO para confirmar
            <input
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              aria-describedby="reset-profile-description"
            />
          </label>
          <label className="reset-profile-accept">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              disabled={busy}
            />
            Entiendo que se eliminarán mis datos y que necesitaré una copia para
            recuperarlos.
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <Button
              ref={cancel}
              type="button"
              disabled={busy}
              onClick={onCancel}
            >
              Cancelar borrado
            </Button>
            <Button
              className="danger-action"
              type="submit"
              disabled={busy || phrase !== "BORRAR TODO" || !accepted}
            >
              <Trash2 size={17} />
              {busy ? "Borrando datos…" : "Borrar definitivamente"}
            </Button>
          </div>
        </form>
      </section>
    </ModalFrame>
  );
}
