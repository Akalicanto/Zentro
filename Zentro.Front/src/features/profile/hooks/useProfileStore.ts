import { type Profile, validateProfile } from "../../../domain/index.ts";
import { useState } from "react";
import { saveData } from "../services/profileStorage.ts";

export function useProfileStore(initialData: Profile) {
  const [data, setData] = useState(initialData),
    [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const save = (next: Profile) => {
    const validated = validateProfile(next);
    setError("");
    void saveData(validated, (message) => {
      setError(message);
      setSaved(message === "");
    });
    setSaved(false);
    setData(validated);
    return true;
  };
  return { data, error, save, saved, dismissSaved: () => setSaved(false) };
}
