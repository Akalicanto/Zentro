import test from "node:test";
import assert from "node:assert/strict";
import { requestProfile } from "../../src/shared/api/profileClient.ts";

test("El cliente muestra los motivos de validación de la API y conserva el contexto HTTP de otros errores", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json(
        { errors: { daily: ["Revisa el saldo diario."] } },
        { status: 400 },
      );
    await assert.rejects(requestProfile("PUT", "{}"), /Revisa el saldo diario/);
    globalThis.fetch = async () =>
      Response.json(
        { detail: "Mensaje interno del servidor" },
        { status: 500 },
      );
    await assert.rejects(requestProfile("GET"), /datos \(500\)/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
