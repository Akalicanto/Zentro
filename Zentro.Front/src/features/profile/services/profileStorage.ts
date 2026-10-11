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
  let resetting = false;
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
    if (resetting) throw Error("Espera a que termine el borrado de datos.");
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
  async function resetData(): Promise<Profile> {
    if (resetting) throw Error("Ya hay un borrado en curso.");
    resetting = true;
    const empty = validateProfile(blankProfile());
    // Espera las escrituras anteriores. No conserva un borrado fallido para
    // ejecutarlo silenciosamente al volver a abrir la aplicación.
    const reset = queue.then(async () => {
      const pending = storage.getItem(PENDING);
      storage.removeItem(PENDING);
      try {
        await request("PUT", JSON.stringify(empty));
      } catch (error) {
        if (pending) storage.setItem(PENDING, pending);
        throw error;
      }
      return empty;
    });
    queue = reset.then(
      () => {},
      () => {},
    );
    try {
      return await reset;
    } finally {
      resetting = false;
    }
  }
  return { loadData, saveData, resetData };
}

// localStorage se obtiene al llamar, no al importar el módulo.
const storage = createProfileStorage({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
});
export const { loadData, saveData, resetData } = storage;
