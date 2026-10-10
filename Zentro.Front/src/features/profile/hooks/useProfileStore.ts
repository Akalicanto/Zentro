import { type Profile, validateProfile } from "../../../domain/index.ts";
import { useState } from "react";
import { saveData } from "../services/profileStorage.ts";

export function useProfileStore(initialData: Profile) {
  const [data, setData] = useState(initialData),
    [error, setError] = useState("");
  const save = (next: Profile) => {
    const validated = validateProfile(next);
    setError("");
    void saveData(validated, setError);
    setData(validated);
    return true;
  };
  return { data, error, save };
}
