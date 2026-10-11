import assert from "node:assert/strict";
import path from "node:path";
import { expect } from "@playwright/test";
import { blankProfile, validateProfile } from "../../src/domain/index.ts";

export async function verifyResetProfile({ page, state, root }) {
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const original = await state();
  const settings = () =>
    page.getByRole("dialog", { name: "Configuración", exact: true });
  const confirmation = () =>
    page.getByRole("dialog", { name: "¿Borrar todos los datos?", exact: true });
  const open = async () => {
    await page
      .getByRole("button", { name: "Configuración", exact: true })
      .click();
    await settings()
      .getByRole("button", { name: "Borrar todos los datos", exact: true })
      .click();
    await confirmation().waitFor();
  };
  await open();
  const finalButton = () =>
    confirmation().getByRole("button", {
      name: "Borrar definitivamente",
      exact: true,
    });
  const phrase = () =>
    confirmation().getByLabel("Escribe BORRAR TODO para confirmar", {
      exact: true,
    });
  const accepted = () => confirmation().getByRole("checkbox");
  await expect(
    confirmation().getByRole("button", {
      name: "Cancelar borrado",
      exact: true,
    }),
  ).toBeFocused();
  await expect(finalButton()).toBeDisabled();
  await phrase().fill("borrar todo");
  await accepted().check();
  await expect(finalButton()).toBeDisabled();
  await phrase().fill("BORRAR TODO");
  await accepted().uncheck();
  await expect(finalButton()).toBeDisabled();
  await accepted().check();
  await expect(finalButton()).toBeEnabled();
  assert.deepEqual(await state(), original);
  const download = page.waitForEvent("download");
  await confirmation()
    .getByRole("button", {
      name: "Exportar copia antes de borrar",
      exact: true,
    })
    .click();
  const stream = await (await download).createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const backup = Buffer.concat(chunks);
  assert.deepEqual(JSON.parse(backup.toString("utf8")), original);
  await confirmation().screenshot({
    path: path.join(root, "checks/reset-profile-desktop.png"),
  });
  await page.setViewportSize({ width: 320, height: 844 });
  assert.equal(
    await confirmation().evaluate((el) => el.scrollWidth > el.clientWidth),
    false,
  );
  await confirmation().screenshot({
    path: path.join(root, "checks/reset-profile-mobile.png"),
  });
  await confirmation()
    .getByRole("button", { name: "Cancelar borrado", exact: true })
    .click();
  await settings().waitFor();
  assert.deepEqual(await state(), original);
  await settings()
    .getByRole("button", { name: "Borrar todos los datos", exact: true })
    .click();
  assert.equal(await phrase().inputValue(), "");
  await expect(accepted()).not.toBeChecked();
  await page.keyboard.press("Escape");
  await settings().waitFor();
  assert.deepEqual(await state(), original);
  await page.setViewportSize({ width: 1440, height: 1000 });

  const failed = async (route) => {
    if (route.request().method() === "PUT")
      return route.fulfill({ status: 503, body: "" });
    await route.fallback();
  };
  await page.route("**/api/state", failed);
  await settings()
    .getByRole("button", { name: "Borrar todos los datos", exact: true })
    .click();
  await phrase().fill("BORRAR TODO");
  await accepted().check();
  await finalButton().click();
  await confirmation().getByRole("alert").filter({ hasText: "503" }).waitFor();
  assert.deepEqual(await state(), original);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("zentro.v3.pending")),
    null,
  );
  await expect(finalButton()).toBeEnabled();
  await page.unroute("**/api/state", failed);
  let release;
  const waiting = new Promise((resolve) => {
    release = resolve;
  });
  let started = false;
  const delayed = async (route) => {
    if (route.request().method() === "PUT") {
      started = true;
      await waiting;
    }
    await route.fallback();
  };
  await page.route("**/api/state", delayed);
  await finalButton().click();
  await expect.poll(() => started).toBe(true);
  assert.equal(await confirmation().getAttribute("aria-busy"), "true");
  await expect(
    confirmation().getByRole("button", {
      name: "Cancelar borrado",
      exact: true,
    }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  assert.ok(await confirmation().isVisible());
  assert.deepEqual(await state(), original);
  release();
  await confirmation().waitFor({ state: "detached" });
  await page.unroute("**/api/state", delayed);
  assert.deepEqual(
    validateProfile(await state()),
    validateProfile(blankProfile()),
  );
  await page.reload();
  assert.deepEqual(
    validateProfile(await state()),
    validateProfile(blankProfile()),
  );
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await settings().getByLabel("Importar copia de seguridad").setInputFiles({
    name: "antes-de-borrar.json",
    mimeType: "application/json",
    buffer: backup,
  });
  await settings()
    .getByRole("heading", { name: "Revisar copia antes de importar" })
    .waitFor();
  await settings()
    .getByRole("button", {
      name: "Sustituir datos con esta copia",
      exact: true,
    })
    .click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  assert.deepEqual(await state(), original);
  await page.keyboard.press("Escape");
  await settings().waitFor({ state: "detached" });
  await page.reload();
  assert.deepEqual(await state(), original);
  console.log(
    "Borrado OK: frase y casilla, cancelar/Escape, exportación previa, móvil, API lenta y fallida, SQLite vacío tras recarga y restauración exacta de la copia. Datos privados intactos.",
  );
}
