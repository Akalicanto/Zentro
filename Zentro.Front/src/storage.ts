import { demo, validateData, type Data } from "./finance";

const KEY = "zentro.v1";
const PENDING = "zentro.v1.pending";
let queue: Promise<void> = Promise.resolve();

async function request(method: string, body?: string) {
  const response = await fetch("/api/state", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`La API no pudo guardar o cargar los datos (${response.status}).`);
  return response;
}

export async function loadData(): Promise<Data> {
  // Una edición pendiente se conserva incluso si la API se detuvo al guardarla.
  const pending = localStorage.getItem(PENDING);
  if (pending) {
    validateData(JSON.parse(pending));
    await request("PUT", pending);
    localStorage.removeItem(PENDING);
  }
  const response = await request("GET");
  if (response.status !== 204) {
    const data = validateData(await response.json());
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }
  // Primera ejecución: migra los datos del navegador original o carga la demo.
  const previous = localStorage.getItem(KEY);
  const data = previous ? validateData(JSON.parse(previous)) : demo();
  await request("PUT", JSON.stringify(data));
  localStorage.setItem(KEY, JSON.stringify(data));
  return data;
}

export function saveData(data: Data, onError: (message: string) => void) {
  const snapshot = JSON.stringify(validateData(data));
  localStorage.setItem(PENDING, snapshot);
  localStorage.setItem(KEY, snapshot);
  // Mantiene el orden de escritura cuando hay varios cambios rápidos.
  queue = queue.catch(() => {}).then(async () => {
    try {
      await request("PUT", snapshot);
      if (localStorage.getItem(PENDING) === snapshot) localStorage.removeItem(PENDING);
    } catch {
      onError("No se ha podido guardar en la base de datos. Tu cambio está conservado en este navegador y se reintentará al recargar. Comprueba que la API esté arrancada.");
    }
  });
}
