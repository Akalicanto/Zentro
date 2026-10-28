import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { testProfile } from "../fixtures/profile.ts";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 412, height: 915 },
    locale: "es-ES",
  });
  page.setDefaultTimeout(15000);
  let profile = testProfile(),
    version = 1,
    signedIn = false;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const request = route.request();
      const headers = {
        ETag: '"' + version + '"',
        "X-Zentro-Authentication": "required",
      };
      if (request.url().endsWith("/auth/login")) {
        signedIn = request.postDataJSON().password === "test-password";
        return route.fulfill({ status: signedIn ? 204 : 401 });
      }
      if (!signedIn) return route.fulfill({ status: 401 });
      if (request.url().endsWith("/auth/logout")) {
        signedIn = false;
        return route.fulfill({ status: 204 });
      }
      if (request.method() === "PUT") {
        assert.equal(request.headers()["x-zentro-client"], "web");
        if (request.headers()["if-match"] !== headers.ETag)
          return route.fulfill({ status: 412 });
        profile = request.postDataJSON();
        version++;
        return route.fulfill({
          status: 204,
          headers: { ...headers, ETag: '"' + version + '"' },
        });
      }
      return route.fulfill({ json: profile, headers });
    },
  );
  await page.goto("http://127.0.0.1:5187");
  await page.getByRole("heading", { name: "Entrar en Zentro" }).waitFor();
  await page.getByLabel("Contraseña", { exact: true }).fill("bad-password");
  await page.getByLabel("Código de autenticación").fill("123456");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await page.getByRole("alert").waitFor();
  await page.getByLabel("Contraseña", { exact: true }).fill("test-password");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  const edit = page.getByRole("button", {
    name: "Editar salario neto mensual",
    exact: true,
  });
  await edit.waitFor();
  profile = { ...profile, monthlyNetSalary: 178900 };
  version++;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/state") &&
      response.request().method() === "GET",
  );
  await edit.click();
  const input = page
    .getByLabel("Editar salario neto mensual", { exact: true })
    .and(page.locator("input"));
  await input.waitFor();
  assert.equal(Number((await input.inputValue()).replace(",", ".")), 1789);
  // Otro dispositivo cambia mientras el editor permanece abierto.
  profile = { ...profile, monthlyNetSalary: 180000 };
  version++;
  await input.fill("1900");
  await input.press("Enter");
  await page
    .getByRole("button", { name: "Descargar cambios pendientes" })
    .waitFor();
  assert.equal(profile.monthlyNetSalary, 180000);
  assert.ok(
    await page.evaluate(() => localStorage.getItem("zentro.v3.pending")),
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar cambios pendientes" })
    .click();
  assert.equal(
    (await download).suggestedFilename(),
    "zentro-cambios-pendientes.json",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cargar datos del servidor" }).click();
  await edit.waitFor();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await page.getByRole("heading", { name: "Entrar en Zentro" }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Acceso móvil OK: inicio, error, sincronización, conflicto sin sobrescritura, descarga, recarga y cierre de sesión.",
  );
} finally {
  await browser.close();
}
