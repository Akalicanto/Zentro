import { chromium, expect } from "@playwright/test";
import { currentMonth } from "../../src/domain/index.ts";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { testProfile } from "../fixtures/profile.ts";

let state = testProfile();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    locale: "es-ES",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/state", async (route) => {
    if (route.request().method() === "PUT") {
      state = route.request().postDataJSON();
      await route.fulfill({ status: 204 });
    } else await route.fulfill({ json: state });
  });
  await page.goto("http://127.0.0.1:5187");
  await page
    .getByRole("heading", { name: "Mi espacio", exact: true })
    .waitFor();
  assert.equal(
    await page
      .locator("footer, .workspace, .breadcrumb, .nav-dot, aside .eyebrow")
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Contraer navegación" }).click();
  await expect(page.locator("aside")).toHaveCSS("width", "82px");
  await page.getByRole("button", { name: "Expandir navegación" }).click();
  await expect(page.locator(".app > main")).toHaveCSS("margin-left", "240px");
  assert.equal(
    await page
      .getByRole("button", { name: "Minimizar barra superior" })
      .count(),
    0,
  );
  await expect(page.locator("header")).toHaveCSS("height", "79px");
  await page
    .locator("nav")
    .getByRole("button", { name: "Ahorros", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Año del historial" }),
  ).toHaveValue(currentMonth().slice(0, 4));
  await page
    .getByRole("combobox", { name: "Año del historial" })
    .selectOption("all");
  await page
    .locator("nav")
    .getByRole("button", { name: "Inversión", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Año del historial" }),
  ).toHaveValue(currentMonth().slice(0, 4));
  await page
    .locator("nav")
    .getByRole("button", { name: "Ahorros", exact: true })
    .click();
  const interestAction = await page
    .getByRole("button", { name: "Actualizar intereses", exact: true })
    .boundingBox();
  const interestCard = await page
    .locator(".metric")
    .filter({
      has: page.getByRole("button", {
        name: "Actualizar intereses",
        exact: true,
      }),
    })
    .boundingBox();
  assert.ok(
    interestAction.x + interestAction.width >
      interestCard.x + interestCard.width - 30,
  );
  await page.getByRole("tab", { name: "Deuda interna" }).click();
  assert.equal(
    await page.getByRole("heading", { name: "Pagos realizados" }).count(),
    0,
  );
  const debtRow = page.locator(".debt-table-panel tbody tr").first();
  await page.getByRole("button", { name: "Editar deuda", exact: true }).click();
  await debtRow.getByRole("button", { name: /^Editar/ }).click();
  let dialog = page.getByRole("dialog");
  await dialog.locator('[name="concept"]').fill("Viaje editado");
  await dialog.locator('[name="amount"]').fill("10");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await dialog.getByRole("alert").waitFor();
  await dialog.locator('[name="amount"]').fill("100");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar Viaje editado", exact: true })
    .waitFor();
  assert.ok((await debtRow.innerText()).includes("80,00"));
  const firstMonth = page.locator(".distribution-panel tbody tr").first();
  await page
    .getByRole("button", { name: "Editar distribución", exact: true })
    .click();
  await firstMonth.getByRole("button").click();
  dialog = page.getByRole("dialog");
  await dialog.locator('[name="amount"]').fill("0");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  assert.ok((await firstMonth.innerText()).includes("0,00"));
  await firstMonth.getByRole("button").click();
  await page.getByRole("dialog").locator('[name="amount"]').fill("25");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar", exact: true })
    .click();
  assert.ok((await firstMonth.innerText()).includes("25,00"));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(os.tmpdir(), "zentro-debt-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Modo oscuro" }).click();
  assert.equal(
    await page
      .locator("header")
      .getByRole("button", { name: "Modo claro" })
      .count(),
    1,
  );
  await page.waitForTimeout(250);
  await expect(page.locator(".app > main")).toHaveCSS("margin-left", "240px");
  await page.screenshot({
    path: path.join(os.tmpdir(), "zentro-debt-dark.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Modo claro" }).click();
  await page.waitForTimeout(250);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: path.join(os.tmpdir(), "zentro-debt-mobile.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Borrar Viaje editado", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar" })
    .click();
  assert.equal(await page.locator(".debt-table-panel tbody tr").count(), 1);
  await page
    .getByRole("button", { name: "Borrar Viaje editado", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Borrar deuda", exact: true })
    .click();
  await page.locator(".debt-table-panel .empty").waitFor();
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Año del historial" }),
  ).toHaveValue(currentMonth().slice(0, 4));
  await page.getByRole("tab", { name: "Deuda interna" }).click();
  await page.locator(".debt-table-panel .empty").waitFor();
  assert.equal(state.internalDebt.items.length, 0);
  assert.equal(state.internalDebt.payments.length, 0);
  assert.deepEqual(errors, []);
  console.log(
    "Debt tables: editing, validation, redistribution, deletion, persistence and mobile layout passed.",
  );
} finally {
  await browser.close();
}
