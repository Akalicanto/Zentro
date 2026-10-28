import { Button } from "../../../shared/ui/index.tsx";
import {
  downloadPendingChanges,
  discardPendingChanges,
  hasPendingChanges,
} from "../services/profileStorage.ts";

export default function PendingChangesActions() {
  if (!hasPendingChanges()) return null;
  return (
    <div className="pending-actions">
      <Button onClick={downloadPendingChanges}>
        Descargar cambios pendientes
      </Button>
      <Button
        onClick={() => {
          if (
            confirm(
              "¿Descartar los cambios de este navegador y cargar los del servidor? Descarga una copia antes si quieres conservarlos.",
            )
          )
            discardPendingChanges();
        }}
      >
        Cargar datos del servidor
      </Button>
    </div>
  );
}
