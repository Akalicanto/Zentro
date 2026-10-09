import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { testProfile } from "../fixtures/profile.ts";
import { verifySettings } from "./settingsChecks.mjs";
import { verifySimulator } from "./simulatorChecks.mjs";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const folder = fs.mkdtempSync(
  path.join(os.tmpdir(), "zentro-profile-browser-"),
);
const socket = createServer();
await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const api = `http://127.0.0.1:${port}`;
const dotnet =
  process.platform === "win32"
    ? path.join(
        process.env.ProgramFiles || "C:/Program Files",
        "dotnet/dotnet.exe",
      )
    : "dotnet";
const child = spawn(
  dotnet,
  [path.join(root, "Zentro.Api/bin/Debug/net10.0/Zentro.Api.dll")],
  {
    cwd: path.join(root, "Zentro.Api"),
    windowsHide: true,
    env: {
      ...process.env,
      ASPNETCORE_ENVIRONMENT: "Development",
      ASPNETCORE_URLS: api,
      Zentro__DatabasePath: path.join(folder, "test.db"),
    },
    stdio: "ignore",
  },
);
let browser;
const state = async () => (await fetch(`${api}/api/state`)).json();
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`${api}/api/health`)).ok) break;
    } catch {}
    if (i >= 100 || child.exitCode !== null)
      throw Error("API de pruebas no arrancó");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1512, height: 1100 },
    locale: "es-ES",
  });
  await context.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const response = await route.fetch({
        url: api + new URL(route.request().url()).pathname,
      });
      await route.fulfill({ response });
    },
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5187");
  await page.getByRole("heading", { name: "Mi espacio", level: 1 }).waitFor();
  assert.equal((await fetch(`${api}/api/state`)).status, 204);
  assert.deepEqual(await page.locator("nav button").allTextContents(), [
    "Mi espacio",
    "Día a día",
    "Ahorros",
    "Inversión",
    "Deudas",
    "Simulador",
  ]);
  assert.equal(await page.getByText("Cuentas", { exact: true }).count(), 0);
  assert.equal(
    (
      await fetch(`${api}/api/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testProfile()),
      })
    ).status,
    204,
  );
  await page.reload();
  await page.getByRole("heading", { name: "Mi espacio", level: 1 }).waitFor();
  const metric = (label) =>
    page
      .locator(".metric")
      .filter({ has: page.getByText(label, { exact: true }) });
  assert.ok((await metric("Patrimonio neto").innerText()).includes("714,00"));
  const planning = page.locator(".monthly-planning");
  fs.mkdirSync(path.join(root, "checks"), { recursive: true });
  await planning
    .getByRole("heading", { name: "Tu calendario financiero" })
    .waitFor();
  assert.equal(await planning.locator("tbody tr").count(), 6);
  await planning.getByRole("button", { name: "12 meses", exact: true }).click();
  assert.equal(await planning.locator("tbody tr").count(), 12);
  assert.equal(
    await planning.locator(".planning-chart .recharts-bar").count(),
    4,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await planning.scrollIntoViewIfNeeded();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  await planning.screenshot({
    path: path.join(root, "checks/planning-mobile.png"),
  });
  await page.setViewportSize({ width: 1512, height: 1100 });
  await page.waitForTimeout(450);
  await page.evaluate(() => window.scrollTo(0, 0));
  await planning.getByRole("button", { name: "6 meses", exact: true }).click();
  await planning.screenshot({
    path: path.join(root, "checks/planning-desktop.png"),
  });
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await planning.screenshot({
    path: path.join(root, "checks/planning-dark.png"),
  });
  await page.getByRole("button", { name: "Modo claro", exact: true }).click();
  await verifySimulator(page, state, root);
  const beforeMortgage = await state();
  await page
    .getByRole("button", { name: "Actualizar oferta", exact: true })
    .click();
  await page.getByLabel("Hipoteca ofrecida (€)", { exact: true }).fill("90000");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  assert.deepEqual(await state(), {
    ...beforeMortgage,
    mortgageOffer: 9000000,
  });
  await page.reload();
  await page.getByRole("heading", { name: "Mi espacio", level: 1 }).waitFor();
  assert.ok(
    (await metric("Hipoteca ofrecida").innerText()).includes("90.000,00"),
  );
  assert.ok((await metric("Patrimonio neto").innerText()).includes("714,00"));
  assert.equal(await page.title(), "Zentro");
  await page
    .locator("nav")
    .getByRole("button", { name: "Ahorros", exact: true })
    .click();
  assert.equal(
    await page.locator(".monthly-history .current-month-row").count(),
    1,
  );
  await page
    .getByRole("tab", { name: "Distribución de ahorros", exact: true })
    .click();
  const beforeAllocation = await state();
  await page
    .getByRole("button", { name: "Añadir destino", exact: true })
    .click();
  await page
    .getByLabel("Nombre del destino", { exact: true })
    .fill("Depósito de prueba");
  await page.getByLabel("Capital (€)", { exact: true }).fill("400");
  await page.getByLabel("Interés anual (%)", { exact: true }).fill("4");
  await page.getByLabel("Fecha de inicio", { exact: true }).fill("2026-01-31");
  await page.getByLabel("Duración (meses)", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page
    .getByRole("button", { name: "Añadir destino", exact: true })
    .click();
  await page
    .getByLabel("Nombre del destino", { exact: true })
    .fill("Cuenta de prueba");
  await page.getByLabel("Tipo", { exact: true }).selectOption("remunerated");
  await page
    .getByLabel("Asignar aquí el resto del ahorro automáticamente", {
      exact: true,
    })
    .check();
  await page.getByLabel("Interés anual (%)", { exact: true }).fill("2");
  await page
    .getByLabel("Cálculo mensual", { exact: true })
    .selectOption("actual360");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  assert.equal(await page.locator(".placement-card").count(), 2);
  assert.ok(
    (await page.locator(".placement-card").last().innerText()).includes(
      "114,00",
    ),
  );
  assert.ok(
    (await metric("Depósitos · neto al vencimiento").innerText()).includes(
      "12,96",
    ),
  );
  await page
    .getByRole("button", { name: "Editar distribución", exact: true })
    .click();
  await page.evaluate(() => {
    window.allocationChartMutations = 0;
    window.allocationObserver = new MutationObserver((changes) => {
      window.allocationChartMutations += changes.length;
    });
    window.allocationObserver.observe(
      document.querySelector(".allocation-charts"),
      {
        subtree: true,
        childList: true,
        attributes: true,
      },
    );
  });
  await page
    .getByRole("button", {
      name: "Editar destino Depósito de prueba",
      exact: true,
    })
    .click();
  assert.equal(await page.evaluate(() => window.allocationChartMutations), 0);
  await page.evaluate(() => window.allocationObserver.disconnect());
  await page.getByLabel("Interés anual (%)", { exact: true }).fill("5");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  assert.ok(
    (await metric("Depósitos · neto al vencimiento").innerText()).includes(
      "16,20",
    ),
  );
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  const afterAllocation = await state();
  assert.deepEqual(
    afterAllocation.savingsPlacements.map((r) => r.name),
    ["Depósito de prueba", "Cuenta de prueba"],
  );
  assert.deepEqual(
    {
      ...afterAllocation,
      savingsPlacements: beforeAllocation.savingsPlacements,
    },
    beforeAllocation,
  );
  await page.reload();
  await page.getByRole("heading", { name: "Ahorros", level: 1 }).waitFor();
  await page
    .getByRole("tab", { name: "Distribución de ahorros", exact: true })
    .click();
  assert.ok(
    (await metric("Depósitos · neto al vencimiento").innerText()).includes(
      "16,20",
    ),
  );
  const beforeDental = await state();
  await page
    .locator("nav")
    .getByRole("button", { name: "Deudas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Indicar deuda", exact: true })
    .click();
  await page.getByLabel("Deuda total (€)", { exact: true }).fill("250");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  for (const row of [
    { month: "10", amount: "100", status: "Pagado" },
    { month: "11", amount: "50", status: "Apartado" },
    { month: "12", amount: "100", status: "Pendiente" },
  ]) {
    await page.getByRole("button", { name: "Añadir mes", exact: true }).click();
    await page
      .getByLabel("Mes de la cuota", { exact: true })
      .selectOption(row.month);
    await page
      .getByLabel("Año de la cuota", { exact: true })
      .selectOption("2026");
    await page
      .getByLabel("Importe de la cuota (€)", { exact: true })
      .fill(row.amount);
    await page
      .getByRole("dialog")
      .getByText(row.status, { exact: true })
      .click();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
  }
  assert.ok((await metric("Ya pagado").innerText()).includes("100,00"));
  assert.ok((await metric("Falta por pagar").innerText()).includes("150,00"));
  assert.ok((await metric("Falta por pagar").innerText()).includes("50,00"));
  await page
    .getByRole("heading", { name: "Así va tu deuda", exact: true })
    .waitFor();
  assert.ok(
    (await page.locator(".debt-donut .donut-total").innerText()).includes(
      "40 %",
    ),
  );
  assert.ok(
    (await page.locator(".debt-prepared-progress").innerText()).includes(
      "60 %",
    ),
  );
  assert.equal(await page.locator(".debt-stat").count(), 3);
  assert.ok(
    (await page.locator(".debt-stat").first().innerText()).includes("2"),
  );
  await page
    .getByLabel("Año del gráfico de deuda", { exact: true })
    .selectOption("2026");
  assert.ok(
    await page.locator(".debt-monthly-chart .recharts-bar-rectangle").count(),
  );
  await page
    .getByLabel("Año del gráfico de deuda", { exact: true })
    .selectOption("all");
  fs.mkdirSync(path.join(root, "checks"), { recursive: true });
  await page.locator(".debt-analytics").screenshot({
    path: path.join(root, "checks", "debt-analytics-light.png"),
  });
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await page
    .locator(".debt-analytics")
    .screenshot({ path: path.join(root, "checks", "debt-analytics-dark.png") });
  await page.getByRole("button", { name: "Modo claro", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page
      .locator(".debt-analytics")
      .evaluate((element) => element.scrollWidth > element.clientWidth),
    false,
  );
  await page.locator(".debt-analytics").screenshot({
    path: path.join(root, "checks", "debt-analytics-mobile.png"),
  });
  await page.setViewportSize({ width: 1512, height: 1100 });
  await page
    .getByRole("button", { name: "Editar cuotas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar cuota 2026-11", exact: true })
    .click();
  await page.getByRole("dialog").getByText("Pagado", { exact: true }).click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  assert.ok((await metric("Ya pagado").innerText()).includes("150,00"));
  assert.ok((await metric("Falta por pagar").innerText()).includes("100,00"));
  assert.ok(
    (await page.locator(".debt-donut .donut-total").innerText()).includes(
      "60 %",
    ),
  );
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  const afterDental = await state();
  assert.deepEqual({ ...afterDental, debts: beforeDental.debts }, beforeDental);
  await page.reload();
  await page.getByRole("heading", { name: "Deudas", level: 1 }).waitFor();
  assert.ok((await metric("Ya pagado").innerText()).includes("150,00"));
  await page
    .getByLabel("Información de Calendario de pagos", { exact: true })
    .click();
  assert.ok(await page.getByRole("note").isVisible());
  await page.keyboard.press("Escape");
  await page
    .locator("nav")
    .getByRole("button", { name: "Día a día", exact: true })
    .click();
  assert.equal(
    await page
      .locator(".cash-panel")
      .getByRole("columnheader", { name: "Estado", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: /^Realizar / }).count(),
    0,
  );
  assert.ok(
    (await metric("Saldo actual · ING").innerText()).includes("300,00"),
  );
  assert.ok(
    (await metric("Saldo después de pendientes").innerText()).includes(
      "260,00",
    ),
  );
  await page.getByRole("button", { name: "Añadir ingreso" }).click();
  assert.equal(await page.getByLabel("Estado", { exact: true }).count(), 0);
  await page.getByLabel("Concepto", { exact: true }).fill("Ingreso de prueba");
  await page.getByLabel("Importe (€)", { exact: true }).fill("50");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  assert.ok(
    (await metric("Saldo actual · ING").innerText()).includes("300,00"),
  );
  assert.ok(
    (await metric("Saldo después de pendientes").innerText()).includes(
      "310,00",
    ),
  );
  await page
    .getByRole("button", { name: "Editar gastos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar Gasto de prueba", exact: true })
    .click();
  assert.equal(await page.getByLabel("Estado", { exact: true }).count(), 0);
  await page.getByLabel("Importe (€)", { exact: true }).fill("60");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  assert.ok(
    (await metric("Saldo actual · ING").innerText()).includes("300,00"),
  );
  assert.ok(
    (await metric("Saldo después de pendientes").innerText()).includes(
      "290,00",
    ),
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Eliminar Gasto de prueba", exact: true })
    .click();
  assert.ok(
    (await metric("Saldo actual · ING").innerText()).includes("300,00"),
  );
  assert.ok(
    (await metric("Saldo después de pendientes").innerText()).includes(
      "350,00",
    ),
  );
  await page
    .getByRole("button", { name: "Terminar edición de gastos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Actualizar saldo", exact: true })
    .click();
  await page.getByLabel("Saldo actual (€)").fill("100");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  assert.ok(
    (await metric("Saldo actual · ING").innerText()).includes("100,00"),
  );
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  const beforeIndependent = await state();
  assert.ok(
    (await metric("Saldo después de pendientes").innerText()).includes(
      "150,00",
    ),
  );
  await page
    .getByRole("button", { name: "Actualizar efectivo", exact: true })
    .click();
  await page.getByLabel("Efectivo (€)", { exact: true }).fill("45");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page
    .getByRole("button", { name: "Añadir posible gasto", exact: true })
    .click();
  await page
    .getByLabel("Concepto", { exact: true })
    .fill("Posible gasto de prueba");
  await page.getByLabel("Importe estimado (€)", { exact: true }).fill("80");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar posibles gastos", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Editar posible gasto Posible gasto de prueba",
      exact: true,
    })
    .click();
  await page.getByLabel("Importe estimado (€)", { exact: true }).fill("90");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Terminar edición de posibles gastos",
      exact: true,
    })
    .click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  const independent = await state();
  assert.equal(independent.cash, 4500);
  assert.equal(independent.possibleExpenses[0].amount, 9000);
  for (const key of [
    "daily",
    "savings",
    "investment",
    "interest",
    "internalDebt",
  ])
    assert.deepEqual(independent[key], beforeIndependent[key]);
  await page
    .getByRole("button", { name: "Editar ingresos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar Ingreso de prueba", exact: true })
    .click();
  await page.getByRole("dialog", { name: "Ingreso", exact: true }).waitFor();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Terminar edición de ingresos", exact: true })
    .click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Ahorros", exact: true })
    .click();
  await page.getByRole("tab", { name: "Deuda interna", exact: true }).click();
  assert.equal(
    await page.getByRole("tab", { name: "Intereses", exact: true }).count(),
    0,
  );
  assert.equal(await page.getByText("Ya repuesto", { exact: true }).count(), 0);
  assert.equal(await page.locator(".savings-secondary .metric").count(), 2);
  const beforeDebt = await state();
  await page
    .getByRole("button", { name: "Devolver deuda", exact: true })
    .click();
  await page.getByLabel("Importe (€)", { exact: true }).fill("30");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  assert.ok(
    (await metric("Deuda interna pendiente").innerText()).includes("30,00"),
  );
  assert.ok(
    (await metric("Ahorro por trabajo").innerText()).includes("530,00"),
  );
  await page.getByRole("button", { name: "Añadir deuda", exact: true }).click();
  await page.getByLabel("Concepto", { exact: true }).fill("Retirada de prueba");
  await page.getByLabel("Importe (€)", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  assert.ok(
    (await metric("Deuda interna pendiente").innerText()).includes("40,00"),
  );
  assert.ok(
    (await metric("Ahorro por trabajo").innerText()).includes("520,00"),
  );
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  const afterDebt = await state();
  for (const key of ["daily", "investment", "interest", "commitments"])
    assert.deepEqual(afterDebt[key], beforeDebt[key]);
  await page.getByRole("tab", { name: "Historial", exact: true }).click();
  const debtMonth = page
    .locator(".monthly-history tbody tr")
    .filter({ hasText: "octubre" });
  assert.ok(
    (await debtMonth.locator(".history-actual").innerText()).includes("20,00"),
  );
  assert.equal(
    await page.getByRole("button", { name: "Registrar interés" }).count(),
    0,
  );
  await page
    .getByRole("button", { name: "Actualizar intereses", exact: true })
    .click();
  await page.getByLabel("Intereses acumulados (€)", { exact: true }).fill("19");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  assert.ok(
    (await metric("Generado por intereses").innerText()).includes("19,00"),
  );
  await page
    .locator("nav")
    .getByRole("button", { name: "Inversión", exact: true })
    .click();
  await page.getByRole("button", { name: "Añadir mes" }).click();
  await page.getByLabel("Invertido (€)").fill("90");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  assert.ok((await metric("Capital aportado").innerText()).includes("290,00"));
  await page.getByRole("tab", { name: "Mensual", exact: true }).click();
  assert.ok(await page.locator(".recharts-bar-rectangle").count());
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  const saved = await state();
  assert.equal(saved.version, 2);
  assert.equal(saved.accounts, undefined);
  assert.equal(saved.internalDebt.payments.length, 2);
  assert.equal(saved.daily.opening, 10000);
  await verifySettings({ page, state, api, root, original: saved });
  await page.reload();
  await page.getByRole("heading", { name: "Inversión", level: 1 }).waitFor();
  assert.ok((await metric("Capital aportado").innerText()).includes("290,00"));
  await page.getByRole("button", { name: "Modo oscuro" }).click();
  assert.equal(await page.locator(".app.dark").count(), 1);
  await page.getByRole("button", { name: "Modo claro" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Día a día", exact: true })
    .click();
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(await state(), saved);
  await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Deudas", exact: true })
    .click();
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page
    .getByLabel("Información de Calendario de pagos", { exact: true })
    .click();
  const dentalHelp = await page.getByRole("note").boundingBox();
  assert.ok(dentalHelp.x >= 0 && dentalHelp.x + dentalHelp.width <= 390);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Editar cuotas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar cuota 2026-11", exact: true })
    .click();
  assert.ok(await page.getByRole("dialog").isVisible());
  assert.ok(
    await page
      .getByRole("dialog")
      .getByRole("radio", { name: "Pagado", exact: true })
      .isChecked(),
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.deepEqual(await state(), saved);
  await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Ahorros", exact: true })
    .click();
  await page
    .getByRole("tab", { name: "Distribución de ahorros", exact: true })
    .click();
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page
    .getByLabel("Información de Distribución del ahorro", { exact: true })
    .click();
  const allocationHelp = await page.getByRole("note").boundingBox();
  assert.ok(
    allocationHelp.x >= 0 && allocationHelp.x + allocationHelp.width <= 390,
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Editar distribución", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Editar destino Cuenta de prueba",
      exact: true,
    })
    .click();
  assert.ok(await page.getByRole("dialog").isVisible());
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.deepEqual(await state(), saved);
  assert.deepEqual(errors, []);
  console.log(
    "OK: seis páginas, calendario, simulador sin modificar datos, saldo/previsión, gastos/ingresos, retirada/reposición, intereses, inversión, distribución editable sin redibujar gráficos al abrir modal, cuotas del dentista, SQLite, recarga y móvil. Base del usuario intacta.",
  );
} finally {
  await browser?.close();
  if (child.exitCode === null) {
    const stopped = new Promise((resolve) => child.once("exit", resolve));
    if (process.platform === "win32")
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    else child.kill("SIGTERM");
    await stopped;
  }
  for (const file of fs.readdirSync(folder))
    fs.unlinkSync(path.join(folder, file));
  fs.rmdirSync(folder);
}
