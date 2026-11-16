import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { testProfile } from "../fixtures/profile.ts";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    locale: "es-ES",
  });
  let due = true;
  let remindAfter = 0;
  let sends = 0;
  let fail = false;
  let sending = false;
  const status = () => ({
    configured: true,
    recipient: "test@example.invalid",
    due,
    shouldPrompt: due && Date.now() >= remindAfter,
    sentAt: due ? null : new Date().toISOString(),
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const action = new URL(route.request().url()).pathname.split("/").at(-1);
      if (!route.request().url().includes("/api/backups/"))
        return route.fulfill({ json: testProfile() });
      if (action === "status") return route.fulfill({ json: status() });
      assert.equal(route.request().headers()["x-zentro-client"], "web");
      if (action === "prompt") {
        const claimed = status().shouldPrompt;
        if (claimed) remindAfter = Date.now() + 86400000;
        return route.fulfill({ json: { ...status(), claimed } });
      }
      if (action === "defer") {
        remindAfter = Date.now() + 86400000;
        return route.fulfill({
          json: { remindAfter: new Date(remindAfter).toISOString() },
        });
      }
      if (action === "send" || action === "send-now") {
        sending = true;
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (fail)
          return route.fulfill({
            status: 400,
            json: { error: "Fallo de correo simulado" },
          });
        sends++;
        due = false;
        return route.fulfill({ json: { result: "sent" } });
      }
      throw Error("Acción inesperada");
    },
  );
  await page.goto("http://127.0.0.1:5187");
  const dialog = page.getByRole("dialog", {
    name: "¿Enviamos tu copia de seguridad?",
    exact: true,
  });
  await dialog.waitFor();
  assert.equal(sends, 0);
  await dialog.screenshot({
    path: "../checks/monthly-backup-confirmation.png",
  });
  await page.setViewportSize({ width: 375, height: 900 });
  await dialog.screenshot({
    path: "../checks/monthly-backup-confirmation-mobile.png",
  });
  assert.equal(
    await dialog.evaluate((el) => el.scrollWidth > el.clientWidth),
    false,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await dialog
    .getByRole("button", { name: "Ahora no · Recordar en 24 h", exact: true })
    .click();
  await dialog.waitFor({ state: "detached" });
  await page.reload();
  await page
    .getByRole("heading", { name: "Mi espacio", exact: true })
    .waitFor();
  assert.equal(await dialog.count(), 0);
  assert.equal(sends, 0);
  remindAfter = Date.now() - 1; // Simula el siguiente momento permitido; el plazo real se prueba en Node/API.
  await page.reload();
  await dialog.waitFor();
  fail = true;
  await dialog
    .getByRole("button", { name: "Confirmar y enviar", exact: true })
    .click();
  await dialog.getByRole("alert").waitFor();
  assert.equal(sends, 0);
  fail = false;
  await dialog
    .getByRole("button", { name: "Confirmar y enviar", exact: true })
    .click();
  const success = page.getByRole("dialog", {
    name: "Copia enviada",
    exact: true,
  });
  await success.waitFor();
  assert.equal(sends, 1);
  await success.getByRole("button", { name: "Cerrar", exact: true }).click();
  await success.waitFor({ state: "detached" });
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  const settings = page.getByRole("dialog", {
    name: "Configuración",
    exact: true,
  });
  const sendNow = settings.getByRole("button", {
    name: "Enviar copia al correo ahora",
    exact: true,
  });
  await sendNow.waitFor();
  await sendNow.click();
  await settings.getByRole("status").waitFor();
  assert.equal(
    sends,
    2,
    "El botón funciona aunque ya se haya enviado este mes",
  );
  assert.equal(sending, true);
  await page.setViewportSize({ width: 375, height: 900 });
  await settings.locator(".mail-backup-settings").scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () =>
      Number(
        getComputedStyle(document.querySelector(".modal-backdrop")).opacity,
      ) >= 0.999,
  );
  await settings
    .locator(".mail-backup-settings")
    .screenshot({ path: "../checks/mail-backup-settings-mobile.png" });
  assert.equal(
    await settings.evaluate((el) => el.scrollWidth > el.clientWidth),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Correo OK: confirmar, aplazar, recargar, reintentar errores y enviar desde Configuración sin correo real.",
  );
} finally {
  await browser.close();
}
