import { blankProfile, validateProfile, type Profile } from "./model";
const KEY = "zentro.v3";
const PENDING = "zentro.v3.pending";
let queue: Promise<void> = Promise.resolve();
async function request(method: string, body?: string) {
  const response = await fetch("/api/state", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw Error(
      `La API no pudo guardar o cargar los datos (${response.status}).`,
    );
  return response;
}
export async function loadData(): Promise<Profile> {
  const pending = localStorage.getItem(PENDING);
  if (pending) {
    validateProfile(JSON.parse(pending));
    await request("PUT", pending);
    localStorage.removeItem(PENDING);
  }
  const response = await request("GET");
  const data =
    response.status === 204
      ? blankProfile()
      : validateProfile(await response.json());
  localStorage.setItem(KEY, JSON.stringify(data));
  return data;
}
export function saveData(data: Profile, onError: (message: string) => void) {
  const snapshot = JSON.stringify(validateProfile(data));
  localStorage.setItem(PENDING, snapshot);
  localStorage.setItem(KEY, snapshot);
  queue = queue
    .catch(() => {})
    .then(async () => {
      try {
        await request("PUT", snapshot);
        if (localStorage.getItem(PENDING) === snapshot)
          localStorage.removeItem(PENDING);
      } catch {
        onError(
          "No se pudo guardar en la base de datos. El cambio está conservado en este navegador; recarga cuando la API esté disponible.",
        );
      }
    });
}
