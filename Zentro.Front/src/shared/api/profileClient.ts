/** HTTP transport only; validation and pending writes belong to the profile feature. */
export async function requestProfile(method: "GET" | "PUT", body?: string) {
  const response = await fetch("/api/state", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw Error(
      `La API no pudo guardar o cargar los datos (${response.status}).`,
    );
  }
  return response;
}
