import { chromium } from "@playwright/test";
import fs from "node:fs";
import { demo } from "./src/finance.ts";
const api = "http://127.0.0.1:5080/api/state";
const saved = await fetch(api);
if (!saved.ok) throw Error("La API debe estar arrancada para probar el navegador.");
const original = saved.status === 204 ? demo() : await saved.json();
async function restore(data) {
  const response = await fetch(api, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!response.ok) throw Error("No se pudieron guardar los datos de la prueba.");
}
fs.mkdirSync("checks", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
await restore(demo());
const page = await browser.newPage({
  viewport: { width: 1512, height: 1100 },
  locale: "es-ES",
});
page.setDefaultTimeout(10000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5187");
await page.getByRole("heading", { name: "Todo en su sitio." }).waitFor();
await page.waitForTimeout(1700);
await page.screenshot({ path: "checks/resumen-desktop.png", fullPage: true });
for (const name of [
  "Cuentas",
  "Movimientos",
  "Deuda externa",
  "Deuda interna",
  "Ahorros",
  "Inversiones",
  "Planificación",
  "Configuración",
]) {
  await page.locator("nav").getByRole("button", { name, exact: true }).click();
  await page.getByRole("heading", { name, exact: true }).waitFor();
}
await page
  .locator("nav")
  .getByRole("button", { name: "Movimientos", exact: true })
  .click();
await page.getByRole("button", { name: "Movimiento", exact: true }).click();
await page.getByLabel("Tipo de movimiento").selectOption("repayment");
await page.getByLabel("Concepto", { exact: true }).fill("Prueba devolución");
await page.getByLabel("Importe (€)", { exact: true }).fill("50");
await page.locator("select[name=status]").selectOption("done");
await page.getByLabel("Deuda relacionada").selectOption("trip");
await page.getByRole("button", { name: "Guardar cambios" }).click();
await page.getByText("Prueba devolución", { exact: true }).waitFor();
await page.reload();
await page
  .locator("nav")
  .getByRole("button", { name: "Ahorros", exact: true })
  .click();
await page.getByRole("heading", { name: "8.050,00 €", exact: true }).waitFor();
await page
  .locator("nav")
  .getByRole("button", { name: "Deuda interna", exact: true })
  .click();
await page
  .getByRole("heading", { name: "550,00 € pendiente", exact: true })
  .waitFor();
await page
  .getByRole("button", { name: "Editar Prueba devolución", exact: true })
  .click();
await page.getByLabel("Importe (€)", { exact: true }).fill("60");
await page.getByRole("button", { name: "Guardar cambios" }).click();
await page
  .getByRole("heading", { name: "540,00 € pendiente", exact: true })
  .waitFor();
page.on("dialog", (dialog) => dialog.accept());
await page
  .getByRole("button", { name: "Eliminar Prueba devolución", exact: true })
  .click();
await page
  .getByRole("heading", { name: "600,00 € pendiente", exact: true })
  .waitFor();
await page.getByRole("button", { name: "Generar calendario" }).nth(1).click();
await page.getByText("Fin previsto: marzo de 2027").waitFor();
await page
  .locator("nav")
  .getByRole("button", { name: "Resumen", exact: true })
  .click();
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(3700);
await page.screenshot({ path: "checks/resumen-mobile.png", fullPage: true });
if (
  await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
)
  throw Error("Desbordamiento horizontal en móvil");
await page.getByRole("button", { name: "Abrir menú" }).click();
await page
  .locator("nav")
  .getByRole("button", { name: "Cuentas", exact: true })
  .click();
await page.getByRole("heading", { name: "Cuentas", exact: true }).waitFor();
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "OK: 9 pantallas, alta/edición/borrado de devolución, saldos coherentes, persistencia, calendario y móvil. Sin errores JavaScript.",
);
} finally {
  await browser.close();
  await restore(original);
}
