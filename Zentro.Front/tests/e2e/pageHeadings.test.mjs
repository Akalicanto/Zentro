import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { testProfile } from "../fixtures/profile.ts";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    locale: "es-ES",
  });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let profile = testProfile();
  let allowSave;
  let failSave = false;
  let writes = 0;
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      if (route.request().method() === "PUT") {
        writes++;
        if (allowSave) await allowSave;
        if (failSave) return route.fulfill({ status: 503, body: "" });
        profile = JSON.parse(route.request().postData());
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(profile),
      });
    },
  );
  await page.goto("http://127.0.0.1:5187");
  await page
    .getByRole("heading", { name: "Mi espacio", exact: true })
    .waitFor();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const navigation = page.locator(
      width > 650 ? "#zentro-navigation" : ".mobile-navigation",
    );
    for (const title of [
      "Mi espacio",
      "Día a día",
      "Ahorros",
      "Inversión",
      "Deudas",
    ]) {
      await navigation
        .getByRole("button", { name: title, exact: true })
        .click();
      const heading = page.locator(".page-banner");
      await heading
        .getByRole("heading", { name: title, exact: true })
        .waitFor();
      assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1);
      if (title === "Ahorros") {
        await heading
          .getByRole("tab", { name: "Distribución de ahorros", exact: true })
          .click();
        await page
          .getByRole("heading", {
            name: "Destinos del ahorro",
            exact: true,
          })
          .waitFor();
        await heading
          .getByRole("tab", { name: "Historial", exact: true })
          .click();
      }
      if (title === "Inversión") {
        const selector = heading.getByLabel("Año del historial", {
          exact: true,
        });
        await selector.selectOption("all");
        assert.equal(
          await page.getByLabel("Año del historial", { exact: true }).count(),
          1,
        );
      }
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      assert.equal(
        await heading.evaluate((el) => el.scrollWidth > el.clientWidth),
        false,
        `${title} a ${width}px`,
      );
      if (width === 1440 || width === 390)
        await heading.screenshot({
          path: `../checks/heading-${title.replaceAll(" ", "-")}-${width}.png`,
        });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await page
    .locator("#zentro-navigation")
    .getByRole("button", { name: "Mi espacio", exact: true })
    .click();
  await page
    .locator(".page-banner")
    .screenshot({ path: "../checks/heading-dark-desktop.png" });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page
    .locator(".page-banner")
    .screenshot({ path: "../checks/heading-dark-mobile.png" });
  assert.equal(
    await page
      .locator(".page-banner")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
    false,
  );
  await page.getByRole("button", { name: "Modo claro", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .locator("#zentro-navigation")
    .getByRole("button", { name: "Día a día", exact: true })
    .click();
  let release;
  allowSave = new Promise((resolve) => {
    release = resolve;
  });
  await page
    .getByRole("button", { name: "Actualizar efectivo", exact: true })
    .click();
  await page.getByLabel("Efectivo (€)", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect.poll(() => writes).toBe(1);
  assert.equal(
    await page.getByText("Cambios guardados", { exact: true }).count(),
    0,
  );
  release();
  await page
    .getByRole("status")
    .filter({ hasText: "Cambios guardados" })
    .waitFor();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  assert.equal(profile.cash, 12300);
  await page.reload();
  await page.getByRole("heading", { name: "Día a día", exact: true }).waitFor();
  failSave = true;
  allowSave = null;
  await page
    .getByRole("button", { name: "Actualizar efectivo", exact: true })
    .click();
  await page.getByLabel("Efectivo (€)", { exact: true }).fill("456");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "503" }).waitFor();
  assert.equal(
    await page.getByText("Cambios guardados", { exact: true }).count(),
    0,
  );
  assert.equal(profile.cash, 12300);
  assert.notEqual(
    await page.evaluate(() => localStorage.getItem("zentro.v3.pending")),
    null,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Cabeceras OK: cinco páginas, pestañas y año integrados, móvil 320/390px; aviso solo tras guardar y nunca ante un error.",
  );
} finally {
  await browser.close();
}
