import {
  blankProfile,
  validateProfile,
  type Profile,
} from "../../../domain/index.ts";
import { requestProfile } from "../../../shared/api/profileClient.ts";
const PENDING = "zentro.v3.pending";
let queue: Promise<void> = Promise.resolve();
export async function loadData(): Promise<Profile> {
  const pending = localStorage.getItem(PENDING);
  if (pending) {
    validateProfile(JSON.parse(pending));
    await requestProfile("PUT", pending);
    localStorage.removeItem(PENDING);
  }
  const response = await requestProfile("GET");
  const data =
    response.status === 204
      ? blankProfile()
      : validateProfile(await response.json());
  return data;
}
export function saveData(data: Profile, onError: (message: string) => void) {
  const snapshot = JSON.stringify(validateProfile(data));
  localStorage.setItem(PENDING, snapshot);
  queue = queue
    .catch(() => {})
    .then(async () => {
      try {
        await requestProfile("PUT", snapshot);
        if (localStorage.getItem(PENDING) === snapshot)
          localStorage.removeItem(PENDING);
      } catch {
        onError(
          "No se pudo guardar en la base de datos. El cambio está conservado en este navegador; recarga cuando la API esté disponible.",
        );
      }
    });
}
