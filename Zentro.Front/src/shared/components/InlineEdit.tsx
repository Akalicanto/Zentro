import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../ui/index.tsx";
import { cents, euro } from "../../domain/index.ts";

type Props = {
  label: string;
  value: string | number | null;
  kind?: "money" | "text" | "date";
  nullable?: boolean;
  disabled?: boolean;
  onSave: (value: string | number | null) => boolean | void;
};

export default function InlineEdit({
  label,
  value,
  kind = "money",
  nullable = false,
  disabled = false,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const finishing = useRef(false);
  const id = useId();
  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      button.current?.focus();
    }
  }, [editing]);
  const display =
    value === null
      ? "—"
      : kind === "money"
        ? euro(Number(value))
        : kind === "date"
          ? String(value).split("-").reverse().join("/")
          : String(value);
  function start() {
    finishing.current = false;
    setDraft(
      value === null
        ? ""
        : kind === "money"
          ? String(Number(value) / 100).replace(".", ",")
          : String(value),
    );
    setError("");
    setEditing(true);
  }
  function commit() {
    if (finishing.current) return;
    finishing.current = true;
    try {
      const next =
        kind === "money"
          ? nullable && !draft.trim()
            ? null
            : cents(draft.trim())
          : draft.trim();
      if (next !== value && onSave(next) === false)
        throw Error("No se pudo guardar el cambio.");
      setEditing(false);
    } catch (error) {
      restoreFocus.current = false;
      finishing.current = false;
      setError(error instanceof Error ? error.message : "Revisa el valor.");
    }
  }
  if (disabled) return <span>{display}</span>;
  return editing ? (
    <span className="inline-editor">
      <input
        ref={input}
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error ? id : undefined}
        type={kind === "date" ? "date" : "text"}
        inputMode={kind === "money" ? "decimal" : undefined}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setError("");
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            restoreFocus.current = true;
            finishing.current = true;
            setEditing(false);
          }
          if (event.key === "Enter") {
            event.preventDefault();
            restoreFocus.current = true;
            commit();
          }
        }}
      />
      {error && (
        <span className="inline-editor-error" id={id} role="alert">
          {error}
        </span>
      )}
    </span>
  ) : (
    <Button
      ref={button}
      type="button"
      className="inline-edit-value"
      aria-label={label}
      title="Pulsa para editar · Enter guarda · Escape cancela"
      onClick={start}
    >
      {display}
    </Button>
  );
}
