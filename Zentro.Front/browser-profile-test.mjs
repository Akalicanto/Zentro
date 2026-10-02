import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { testProfile } from "./tests/profile.ts";
const root = fileURLToPath(new URL("../", import.meta.url));
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
  await context.route("**/api/**", async (route) => {
    const response = await route.fetch({
      url: api + new URL(route.request().url()).pathname,
    });
    await route.fulfill({ response });
  });
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
  await page
    .locator("nav")
    .getByRole("button", { name: "Día a día", exact: true })
    .click();
  await page.getByRole("button", { name: "Realizar Gasto de prueba" }).click();
  assert.ok(
    (await metric("Saldo actual · ING").innerText()).includes("260,00"),
  );
  assert.ok(
    (await metric("Saldo después de pendientes").innerText()).includes(
      "260,00",
    ),
  );
  await page.getByRole("button", { name: "Añadir ingreso" }).click();
  await page.getByLabel("Concepto", { exact: true }).fill("Ingreso de prueba");
  await page.getByLabel("Importe (€)", { exact: true }).fill("50");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  assert.ok(
    (await metric("Saldo actual · ING").innerText()).includes("260,00"),
  );
  assert.ok(
    (await metric("Saldo después de pendientes").innerText()).includes(
      "310,00",
    ),
  );
  await page
    .getByRole("button", { name: "Realizar Ingreso de prueba" })
    .click();
  assert.ok(
    (await metric("Saldo actual · ING").innerText()).includes("310,00"),
  );
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
    .getByRole("button", { name: "Editar gastos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar Gasto de prueba", exact: true })
    .click();
  await page.getByRole("dialog", { name: "Gasto", exact: true }).waitFor();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Terminar edición de gastos", exact: true })
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
  console.log(
    "OK: cuatro páginas, saldo/previsión, gastos/ingresos, retirada/reposición, intereses, inversión, SQLite, recarga y móvil. Base del usuario intacta.",
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
