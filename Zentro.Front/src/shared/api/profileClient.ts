/** HTTP transport only; validation and pending writes belong to the profile feature. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function requestProfile(
  method: "GET" | "PUT",
  body?: string,
  version?: string,
) {
  const response = await fetch("/api/state", {
    method,
    headers: {
      "X-Zentro-Client": "web",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(method === "PUT" && version ? { "If-Match": version } : {}),
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined")
      window.dispatchEvent(new Event("zentro:authentication-required"));
    let detail = "";
    if (response.status === 400) {
      const problem = await response.json().catch(() => null);
      const messages = Object.values(problem?.errors ?? {}).flat();
      detail = messages
        .filter((message) => typeof message === "string")
        .join(" ");
    }
    throw new ApiError(
      response.status === 401
        ? "Inicia sesión para continuar."
        : response.status === 412 || response.status === 428
          ? "Hay cambios más recientes en el servidor. Descarga tus cambios pendientes y recarga los datos; no se ha sobrescrito el otro dispositivo."
          : detail ||
            `La API no pudo guardar o cargar los datos (${response.status}).`,
      response.status,
    );
  }
  return response;
}
