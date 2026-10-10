/** HTTP transport only; validation and pending writes belong to the profile feature. */
export async function requestProfile(method: "GET" | "PUT", body?: string) {
  const response = await fetch("/api/state", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    let detail = "";
    if (response.status === 400) {
      const problem = await response.json().catch(() => null);
      const messages = Object.values(problem?.errors ?? {}).flat();
      detail = messages
        .filter((message) => typeof message === "string")
        .join(" ");
    }
    throw Error(
      detail ||
        `La API no pudo guardar o cargar los datos (${response.status}).`,
    );
  }
  return response;
}
