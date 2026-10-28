import {
  blankProfile,
  validateProfile,
  type Profile,
} from "../../../domain/index.ts";
import { requestProfile, ApiError } from "../../../shared/api/profileClient.ts";
const PENDING = "zentro.v3.pending";
const PENDING_VERSION = "zentro.v3.pending-version";
let protectedSession = false;
export const isProtectedSession = () => protectedSession;
type PendingStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Cada instancia ordena las escrituras y permite probar errores sin usar datos personales.
export function createProfileStorage(
  storage: PendingStorage,
  request = requestProfile,
) {
  let queue: Promise<void> = Promise.resolve();
  let resetting = false;
  let version: string | undefined;
  let conflicted = false;
  const remember = (response: Response) => {
    version = response.headers.get("ETag") ?? undefined;
    protectedSession =
      response.headers.get("X-Zentro-Authentication") === "required";
  };
  async function loadData(): Promise<Profile> {
    const pending = storage.getItem(PENDING);
    if (pending) {
      const normalized = JSON.stringify(validateProfile(JSON.parse(pending)));
      await request(
        "PUT",
        normalized,
        storage.getItem(PENDING_VERSION) ?? undefined,
      );
      if (storage.getItem(PENDING) === pending) {
        storage.removeItem(PENDING);
        storage.removeItem(PENDING_VERSION);
      }
    }
    const response = await request("GET");
    remember(response);
    conflicted = false;
    return response.status === 204
      ? blankProfile()
      : validateProfile(await response.json());
  }
  function saveData(data: Profile, onError: (message: string) => void) {
    if (resetting) throw Error("Espera a que termine el borrado de datos.");
    if (conflicted)
      throw Error(
        "Hay cambios de otro dispositivo. Descarga los cambios pendientes y recarga antes de editar.",
      );
    const snapshot = JSON.stringify(validateProfile(data));
    try {
      storage.setItem(PENDING, snapshot);
      if (version) storage.setItem(PENDING_VERSION, version);
      else storage.removeItem(PENDING_VERSION);
    } catch {
      throw Error(
        "El navegador no permite conservar el cambio pendiente. Libera espacio o habilita el almacenamiento antes de guardar.",
      );
    }
    queue = queue.then(async () => {
      // Un cambio más reciente ya incluye el anterior; no enviamos una copia obsoleta.
      if (storage.getItem(PENDING) !== snapshot) return;
      try {
        if (version) storage.setItem(PENDING_VERSION, version);
        const response = await request("PUT", snapshot, version);
        remember(response);
        if (storage.getItem(PENDING) === snapshot) {
          storage.removeItem(PENDING);
          storage.removeItem(PENDING_VERSION);
          onError("");
        }
      } catch (error) {
        if (error instanceof ApiError && [412, 428].includes(error.status))
          conflicted = true;
        if (storage.getItem(PENDING) === snapshot)
          onError(
            `${error instanceof Error ? error.message : "No se pudo guardar en la base de datos."} El cambio está conservado en este navegador.`,
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
        const response = await request("PUT", JSON.stringify(empty), version);
        remember(response);
        storage.removeItem(PENDING_VERSION);
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
  async function refreshData(mayApply: () => boolean) {
    if (resetting || conflicted || storage.getItem(PENDING)) return null;
    const before = version;
    const response = await request("GET");
    const nextVersion = response.headers.get("ETag") ?? undefined;
    if (
      !nextVersion ||
      nextVersion === before ||
      before !== version ||
      storage.getItem(PENDING) ||
      !mayApply()
    )
      return null;
    const profile =
      response.status === 204
        ? blankProfile()
        : validateProfile(await response.json());
    if (before !== version || storage.getItem(PENDING) || !mayApply())
      return null;
    remember(response);
    return profile;
  }
  return { loadData, saveData, resetData, refreshData };
}

// localStorage se obtiene al llamar, no al importar el módulo.
const storage = createProfileStorage({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
});
export const { loadData, saveData, resetData, refreshData } = storage;

export function hasPendingChanges() {
  return localStorage.getItem(PENDING) !== null;
}
export function downloadPendingChanges() {
  const pending = localStorage.getItem(PENDING);
  if (!pending) return;
  const url = URL.createObjectURL(
    new Blob([pending], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "zentro-cambios-pendientes.json";
  link.click();
  URL.revokeObjectURL(url);
}
export function discardPendingChanges() {
  localStorage.removeItem(PENDING);
  localStorage.removeItem(PENDING_VERSION);
  location.reload();
}
