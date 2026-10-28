import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { testProfile } from "../fixtures/profile.ts";
import { setCell } from "./inlineEditHelpers.mjs";

let profile = testProfile();
const original = structuredClone(profile);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    locale: "es-ES",
  });
  page.setDefaultTimeout(15000);
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
  await setCell(page, "Editar salario neto mensual", "1845,67");
  assert.equal(profile.monthlyNetSalary, 184567);
  const checkUnchanged = () => {
    const { monthlyNetSalary: _, ...rest } = profile;
    assert.deepEqual(rest, original);
  };
  checkUnchanged();
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Configuración",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Editar salario neto mensual", exact: true })
    .click();
  await dialog
    .getByLabel("Editar salario neto mensual", { exact: true })
    .fill("2099,50");
  await dialog
    .getByLabel("Editar salario neto mensual", { exact: true })
    .press("Enter");
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  assert.equal(profile.monthlyNetSalary, 209950);
  checkUnchanged();
  await dialog
    .getByRole("button", { name: "Editar salario neto mensual", exact: true })
    .click();
  await dialog
    .getByLabel("Editar salario neto mensual", { exact: true })
    .fill("-1");
  await dialog
    .getByLabel("Editar salario neto mensual", { exact: true })
    .press("Enter");
  await dialog.getByRole("alert").waitFor();
  assert.equal(profile.monthlyNetSalary, 209950);
  await page.keyboard.press("Escape");
  await dialog
    .getByRole("button", { name: "Editar salario neto mensual", exact: true })
    .click();
  await dialog
    .getByLabel("Editar salario neto mensual", { exact: true })
    .fill("2500");
  await page.keyboard.press("Escape");
  assert.equal(profile.monthlyNetSalary, 209950);
  const download = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Exportar copia", exact: true })
    .click();
  const stream = await (await download).createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString("utf8")), profile);
  await dialog
    .getByRole("button", { name: "Cerrar configuración", exact: true })
    .click();
  await dialog.waitFor({ state: "detached" });
  await page.reload();
  const card = page.getByRole("region", {
    name: "Salario neto mensual",
    exact: true,
  });
  // El section se localiza por su etiqueta accesible y conserva la cifra tras recargar.
  await card.waitFor();
  assert.ok(
    (await card.innerText()).includes("2099,50") ||
      (await card.innerText()).includes("2.099,50"),
  );
  await page.setViewportSize({ width: 320, height: 844 });
  assert.equal(
    await card.evaluate((el) => el.scrollWidth > el.clientWidth),
    false,
  );
  await card.screenshot({ path: "../checks/salary-reference-mobile.png" });
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await card.screenshot({ path: "../checks/salary-reference-dark.png" });
  checkUnchanged();
  assert.deepEqual(errors, []);
  console.log(
    "Salario OK: referencia independiente, edición en Mi espacio/configuración, cancelar/validar, exportar, recarga y móvil.",
  );
} finally {
  await browser.close();
}
