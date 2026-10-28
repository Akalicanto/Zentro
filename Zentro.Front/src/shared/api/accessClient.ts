export async function login(password: string, code: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Zentro-Client": "web" },
    body: JSON.stringify({ password, code }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw Error(
      response.status === 429
        ? "Demasiados intentos. Espera un minuto y vuelve a probar."
        : "Revisa la contraseña y el código de tu aplicación de autenticación.",
    );
}
export async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "X-Zentro-Client": "web" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw Error("No se pudo cerrar la sesión. Inténtalo de nuevo.");
  window.dispatchEvent(new Event("zentro:authentication-required"));
}
