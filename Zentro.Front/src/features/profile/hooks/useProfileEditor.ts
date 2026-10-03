import { type Profile, today, validateProfile } from "../../../domain/index.ts";
import { type SaveProfile, type Modal } from "../types.ts";
import { useState } from "react";
import { applyProfileForm } from "../forms/applyProfileForm.ts";

export function useProfileEditor(data: Profile, save: SaveProfile) {
  const [modal, setModal] = useState<Modal>(null),
    [formError, setFormError] = useState("");
  function open(next: NonNullable<Modal>) {
    setFormError("");
    setModal(next);
  }
  const close = () => setModal(null);
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
    try {
      const next = validateProfile(JSON.parse(await file.text()));
      if (confirm("¿Sustituir tus datos por esta copia?")) save(next);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Copia no válida.");
    }
    event.target.value = "";
  }
  return { modal, formError, open, close, submit, exportBackup, importBackup };
}
