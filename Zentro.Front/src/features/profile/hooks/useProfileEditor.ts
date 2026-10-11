import { type Profile, today, validateProfile } from "../../../domain/index.ts";
import { type SaveProfile, type Modal } from "../types.ts";
import { useRef, useState } from "react";
import { applyProfileForm } from "../forms/applyProfileForm.ts";

export function useProfileEditor(data: Profile, save: SaveProfile) {
  const [modal, setModal] = useState<Modal>(null),
    [formError, setFormError] = useState(""),
    [returnToSettings, setReturnToSettings] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    name: string;
    data: Profile;
  } | null>(null);
  const importSequence = useRef(0);
  function open(next: NonNullable<Modal>) {
    setFormError("");
    setReturnToSettings(modal?.type === "settings");
    setModal(next);
  }
  const close = () => {
    importSequence.current++;
    setFormError("");
    setPendingImport(null);
    setModal(returnToSettings ? { type: "settings" } : null);
    setReturnToSettings(false);
  };
  function submit(
    event: React.FormEvent<HTMLFormElement>,
    monthSelection: string,
  ) {
    event.preventDefault();
    if (!modal) return;
    try {
      if (
        save(
          applyProfileForm(
            data,
            modal,
            new FormData(event.currentTarget),
            monthSelection,
          ),
        )
      )
        close();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Revisa los importes.",
      );
    }
  }
  function exportBackup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `zentro-${today()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFormError("");
    setPendingImport(null);
    const sequence = ++importSequence.current;
    try {
      const contents = await file.text();
      if (sequence !== importSequence.current) return;
      const next = validateProfile(JSON.parse(contents));
      setPendingImport({ name: file.name, data: next });
    } catch (err) {
      if (sequence === importSequence.current)
        setFormError(err instanceof Error ? err.message : "Copia no válida.");
    } finally {
      event.target.value = "";
    }
  }
  function confirmImport() {
    if (!pendingImport) return;
    try {
      if (save(pendingImport.data)) setPendingImport(null);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo importar la copia.",
      );
    }
  }
  return {
    modal,
    formError,
    open,
    close,
    submit,
    exportBackup,
    importBackup,
    pendingImport,
    confirmImport,
    cancelImport: () => setPendingImport(null),
  };
}
