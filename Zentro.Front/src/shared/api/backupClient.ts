export type BackupStatus = {
  configured: boolean;
  recipient?: string;
  due: boolean;
  shouldPrompt: boolean;
  remindAfter?: string | null;
  sentAt?: string | null;
  claimed?: boolean;
};

export async function backupRequest<T>(
  action: string,
  method: "GET" | "POST" = "GET",
): Promise<T> {
  const response = await fetch(`/api/backups/${action}`, {
    method,
    headers: { "X-Zentro-Client": "web" },
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw Error(
      body?.error ||
        "No se pudo completar la copia. Comprueba la conexión y la configuración del correo.",
    );
  }
  return response.json() as Promise<T>;
}
