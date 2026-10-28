import { type Profile, validateProfile } from "../../../domain/index.ts";
import { useEffect, useRef, useState } from "react";
import {
  saveData,
  resetData,
  refreshData,
} from "../services/profileStorage.ts";

export function useProfileStore(initialData: Profile) {
  const [data, setData] = useState(initialData),
    [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const resetting = useRef(false);
  const latest = useRef(data);
  latest.current = data;
  useEffect(() => {
    let disposed = false,
      refreshing = false;
    const mayApply = () =>
      !disposed &&
      !resetting.current &&
      !document.hidden &&
      !document.querySelector('.inline-editor input, [role="dialog"]');
    const refresh = async () => {
      if (refreshing || !mayApply()) return;
      refreshing = true;
      try {
        const next = await refreshData(mayApply);
        if (next && !disposed) {
          latest.current = next;
          setData(next);
        }
      } catch {
        /* El próximo foco/intervalo vuelve a comprobar la conexión. */
      } finally {
        refreshing = false;
      }
    };
    const interval = window.setInterval(() => void refresh(), 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const save = (next: Profile) => {
    if (latest.current !== data)
      throw Error(
        "Los datos se han actualizado desde otro dispositivo. Revisa el valor antes de guardar.",
      );
    const validated = validateProfile(next);
    setError("");
    void saveData(validated, (message) => {
      setError(message);
      setSaved(!resetting.current && message === "");
    });
    setSaved(false);
    latest.current = validated;
    setData(validated);
    return true;
  };
  async function resetProfile() {
    if (resetting.current) throw Error("Ya hay un borrado en curso.");
    resetting.current = true;
    setError("");
    setSaved(false);
    try {
      const empty = await resetData();
      latest.current = empty;
      setData(empty);
      setError("");
      setSaved(true);
    } catch (error) {
      setSaved(false);
      throw error;
    } finally {
      resetting.current = false;
    }
  }
  return {
    data,
    error,
    save,
    saved,
    dismissSaved: () => setSaved(false),
    resetProfile,
  };
}
