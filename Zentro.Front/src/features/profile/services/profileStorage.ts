import {
  blankProfile,
  validateProfile,
  type Profile,
} from "../../../domain/index.ts";
import { requestProfile } from "../../../shared/api/profileClient.ts";
const PENDING = "zentro.v3.pending";
type PendingStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Cada instancia ordena las escrituras y permite probar errores sin usar datos personales.
export function createProfileStorage(
  storage: PendingStorage,
  request = requestProfile,
) {
  let queue: Promise<void> = Promise.resolve();
  async function loadData(): Promise<Profile> {
    const pending = storage.getItem(PENDING);
    if (pending) {
      const normalized = JSON.stringify(validateProfile(JSON.parse(pending)));
      await request("PUT", normalized);
      if (storage.getItem(PENDING) === pending) storage.removeItem(PENDING);
    }
    const response = await request("GET");
    return response.status === 204
      ? blankProfile()
      : validateProfile(await response.json());
  }
  function saveData(data: Profile, onError: (message: string) => void) {
    const snapshot = JSON.stringify(validateProfile(data));
    try {
      storage.setItem(PENDING, snapshot);
    } catch {
      throw Error(
        "El navegador no permite conservar el cambio pendiente. Libera espacio o habilita el almacenamiento antes de guardar.",
      );
    }
    queue = queue.then(async () => {
      // Un cambio más reciente ya incluye el anterior; no enviamos una copia obsoleta.
      if (storage.getItem(PENDING) !== snapshot) return;
      try {
        await request("PUT", snapshot);
        if (storage.getItem(PENDING) === snapshot) {
          storage.removeItem(PENDING);
          onError("");
        }
      } catch (error) {
        if (storage.getItem(PENDING) === snapshot)
          onError(
            `${error instanceof Error ? error.message : "No se pudo guardar en la base de datos."} El cambio está conservado en este navegador; recarga para reintentar.`,
          );
      }
    });
    return queue;
  }
  return { loadData, saveData };
}

// localStorage se obtiene al llamar, no al importar el módulo.
const storage = createProfileStorage({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
});
export const { loadData, saveData } = storage;
