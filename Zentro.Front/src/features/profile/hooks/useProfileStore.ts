import { type Profile, validateProfile } from "../../../domain/index.ts";
import { useRef, useState } from "react";
import { saveData, resetData } from "../services/profileStorage.ts";

export function useProfileStore(initialData: Profile) {
  const [data, setData] = useState(initialData),
    [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const resetting = useRef(false);
  const save = (next: Profile) => {
    const validated = validateProfile(next);
    setError("");
    void saveData(validated, (message) => {
      setError(message);
      setSaved(!resetting.current && message === "");
    });
    setSaved(false);
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
