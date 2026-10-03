import { type Profile, validateProfile } from "../../../domain/index.ts";
import { useState } from "react";
import { saveData } from "../services/profileStorage.ts";

export function useProfileStore(initialData: Profile) {
  const [data, setData] = useState(initialData),
    [error, setError] = useState("");
  const save = (next: Profile) => {
    validateProfile(next);
    setError("");
    saveData(next, setError);
    setData(next);
    return true;
  };
  return { data, error, save };
}
