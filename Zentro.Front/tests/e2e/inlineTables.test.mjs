import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { testProfile } from "../fixtures/profile.ts";
import { validateProfile, installmentAmounts } from "../../src/domain/index.ts";
import { setCell } from "./inlineEditHelpers.mjs";

let profile = testProfile();
profile.debts = [
  {
    id: "partial",
    name: "Dentista de prueba",
    dueDay: 4,
    total: 10540,
    installments: [{ month: "2027-01", amount: 10540, status: "pending" }],
  },
];
profile.possibleExpenses = [
  { id: "possible", concept: "Seguro de prueba", amount: 70000 },
];
profile.daily.incomes = [
  {
    id: "income",
    concept: "Ingreso de prueba",
    amount: 5000,
    status: "planned",
    includedInOpening: false,
  },
];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    locale: "es-ES",
  });
  page.setDefaultTimeout(15000);
  const errors = [];
  let writes = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      if (route.request().method() === "PUT") {
        profile = validateProfile(route.request().postDataJSON());
        writes++;
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({ json: profile });
    },
  );
  await page.goto("http://127.0.0.1:5187");
  const navigate = async (name) =>
    page
      .locator("#zentro-navigation")
      .getByRole("button", { name, exact: true })
      .click();
  await navigate("Deudas");
  await page
    .locator(".debt-summary-card")
    .filter({ hasText: "Dentista de prueba" })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Editar cuotas", exact: true })
      .count(),
    0,
  );
  await setCell(page, "Apartado 2027-01", "90");
  assert.deepEqual(installmentAmounts(profile.debts[0].installments[0]), {
    paid: 0,
    reserved: 9000,
    pending: 1540,
    remaining: 10540,
  });
  const row = page.locator(".debt-payment-history tbody tr").filter({
    has: page.getByRole("button", { name: "Cuota 2027-01", exact: true }),
  });
  assert.ok((await row.innerText()).includes("15,40"));
  assert.equal(
    await page.locator(".unplanned-debt, .debt-unassigned-note").count(),
    0,
  );
  await setCell(page, "Pagado 2027-01", "30");
  assert.deepEqual(installmentAmounts(profile.debts[0].installments[0]), {
    paid: 3000,
    reserved: 6000,
    pending: 1540,
    remaining: 7540,
  });
  const beforeInvalid = writes;
  await page
    .getByRole("button", { name: "Apartado 2027-01", exact: true })
    .click();
  await page.getByLabel("Apartado 2027-01", { exact: true }).fill("100");
  await page.getByLabel("Apartado 2027-01", { exact: true }).press("Enter");
  await page.getByRole("alert").waitFor();
  assert.equal(writes, beforeInvalid);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Apartado 2027-01", exact: true })
    .click();
  await page.getByLabel("Apartado 2027-01", { exact: true }).fill("59,99");
  await page
    .getByRole("heading", { name: "Calendario de pagos", exact: true })
    .click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  assert.equal(profile.debts[0].installments[0].reservedAmount, 5999);
  await page
    .locator(".external-debt-panel")
    .screenshot({ path: "../checks/inline-debt-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".external-debt-panel")
    .screenshot({ path: "../checks/inline-debt-mobile.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await navigate("Día a día");
  await setCell(page, "Importe Gasto de prueba", "41,23");
  await setCell(page, "Concepto Gasto de prueba", "Gasto actualizado");
  await setCell(page, "Importe Ingreso de prueba", "60");
  await setCell(page, "Importe posible gasto Seguro de prueba", "710");
  assert.equal(profile.daily.expenses[0].amount, 4123);
  assert.equal(profile.daily.opening, 30000);
  assert.equal(profile.possibleExpenses[0].amount, 71000);
  const beforeEscape = structuredClone(profile);
  await page
    .getByRole("button", { name: "Importe Gasto actualizado", exact: true })
    .click();
  await page
    .getByLabel("Importe Gasto actualizado", { exact: true })
    .fill("999");
  await page.keyboard.press("Escape");
  assert.deepEqual(profile, beforeEscape);
  await navigate("Ahorros");
  await page
    .getByLabel("Año del historial", { exact: true })
    .selectOption("all");
  await setCell(page, "Objetivo 2026-09", "1000");
  await setCell(page, "Ahorrado neto 2026-09", "600");
  assert.equal(profile.savings[0].actual, 60000);
  await page.getByRole("tab", { name: "Deuda interna", exact: true }).click();
  await setCell(
    page,
    "Concepto deuda interna Retirada histórica de prueba",
    "Viaje",
  );
  await setCell(page, "Retirado Viaje", "85");
  await setCell(page, "Fecha Viaje", "2026-09-30");
  await setCell(page, "Reposición 2026-10", "25");
  assert.equal(profile.internalDebt.items[0].amount, 8500);
  assert.equal(profile.savings[0].actual, 60000);
  assert.equal(profile.internalDebt.schedule[0].amount, 2500);
  await navigate("Inversión");
  await page
    .getByLabel("Año del historial", { exact: true })
    .selectOption("all");
  await setCell(page, "Invertido 2026-09", "210");
  assert.equal(profile.investment[0].actual, 21000);
  assert.equal(await page.getByRole("dialog").count(), 0);
  const saved = structuredClone(profile);
  await page.reload();
  await page.getByRole("heading", { name: "Inversión", exact: true }).waitFor();
  assert.deepEqual(profile, saved);
  await expect(page.locator(".app")).toBeVisible();
  assert.deepEqual(errors, []);
  console.log(
    "Edición directa OK: cuotas parciales, pagos desde lo apartado, validación, Enter/blur/Escape, todas las tablas editables, recarga y móvil; sin modos de edición ni confirmaciones al guardar.",
  );
} finally {
  await browser.close();
}
