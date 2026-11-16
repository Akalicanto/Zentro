import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { testProfile } from "../fixtures/profile.ts";

let profile = testProfile();
profile.debts = [
  { id: "existing", name: "Deuda anterior", total: 10000, installments: [] },
];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    locale: "es-ES",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      if (route.request().method() === "PUT") {
        profile = route.request().postDataJSON();
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({ json: profile });
    },
  );
  await page.goto("http://127.0.0.1:5187");
  await page
    .getByRole("button", { name: "Actualizar oferta", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Hipoteca ofrecida (€)", { exact: true })
    .fill("90000");
  await dialog.getByLabel("Banco", { exact: true }).fill("Banco de prueba");
  await dialog.getByLabel("Plazo ofrecido (años)", { exact: true }).fill("30");
  await dialog.screenshot({ path: "../checks/mortgage-offer-editor.png" });
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  assert.equal(profile.mortgageBank, "Banco de prueba");
  assert.equal(profile.mortgageYears, 30);
  await page.getByText("Banco de prueba · 30 años", { exact: true }).waitFor();
  await page
    .locator("#zentro-navigation")
    .getByRole("button", { name: "Deudas", exact: true })
    .click();
  await page.getByText("Deuda real", { exact: true }).waitFor();
  await page
    .locator(".debts-list-panel")
    .getByRole("button", { name: /Deuda anterior/ })
    .click();
  await page.getByRole("button", { name: "Editar deuda", exact: true }).click();
  assert.equal(
    await dialog.getByLabel("Tipo de deuda", { exact: true }).inputValue(),
    "real",
  );
  await dialog
    .getByLabel("Tipo de deuda", { exact: true })
    .selectOption("fictional");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  assert.equal(profile.debts[0].kind, "fictional");
  assert.equal(profile.debts[0].total, 10000);
  await page
    .locator(".debt-manager-heading")
    .getByText("Deuda ficticia", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Todas las deudas", exact: true })
    .click();
  await page.getByRole("button", { name: /Añadir deuda/ }).click();
  await dialog
    .getByLabel("Nombre de la deuda", { exact: true })
    .fill("Nueva deuda real");
  await dialog.getByLabel("Deuda total (€)", { exact: true }).fill("500");
  assert.equal(
    await dialog.getByLabel("Tipo de deuda", { exact: true }).inputValue(),
    "real",
  );
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  assert.equal(
    profile.debts.find((debt) => debt.name === "Nueva deuda real").kind,
    "real",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Todas las deudas", exact: true })
    .click();
  await page.getByText("Deuda ficticia", { exact: true }).waitFor();
  await page
    .locator(".debts-list-panel")
    .screenshot({ path: "../checks/debt-types-desktop.png" });
  await page.setViewportSize({ width: 375, height: 900 });
  await page
    .locator(".debts-list-panel")
    .screenshot({ path: "../checks/debt-types-mobile.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Tipos de deuda e hipoteca OK: editar, crear, persistir, mostrar y móvil con datos ficticios.",
  );
} finally {
  await browser.close();
}
