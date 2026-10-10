import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { blankProfile } from "../../src/domain/index.ts";

const profile = blankProfile();
const row = (month, status) => ({ month, amount: 5000, status });
profile.debts = [
  {
    id: "early",
    name: "Pago adelantado de prueba",
    total: 10000,
    dueDay: 4,
    installments: [row("2026-10", "paid"), row("2026-11", "paid")],
  },
  {
    id: "late",
    name: "Vencimiento de prueba",
    total: 10000,
    dueDay: 4,
    installments: [row("2026-10", "pending"), row("2026-11", "reserved")],
  },
  {
    id: "today",
    name: "Cobro de hoy de prueba",
    total: 5000,
    dueDay: 10,
    installments: [row("2026-10", "pending")],
  },
  {
    id: "upcoming",
    name: "Cobro futuro de prueba",
    total: 5000,
    dueDay: 31,
    installments: [row("2026-10", "pending")],
  },
];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    locale: "es-ES",
  });
  await page.clock.setFixedTime(new Date("2026-10-10T12:00:00+02:00"));
  let writes = 0;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      if (route.request().method() !== "GET") writes++;
      await route.fulfill({
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
  const watch = page.locator(".payment-watch");
  await watch.screenshot({ path: "../checks/payment-watch-desktop.png" });
  for (const label of [
    "Pagada",
    "Pagada por adelantado",
    "Con retraso",
    "Dinero apartado",
    "Vence hoy",
    "Próxima",
  ])
    assert.ok(await watch.getByText(label, { exact: true }).isVisible(), label);
  await page
    .locator("#zentro-navigation")
    .getByRole("button", { name: "Deudas", exact: true })
    .click();
  await watch.getByText("Pagada por adelantado", { exact: true }).waitFor();
  const activeFilter = page.getByRole("tab", { name: /^Activas/ });
  await activeFilter.click();
  await page
    .locator(".debt-filters .MuiTouchRipple-root")
    .waitFor({ state: "attached" });
  await page
    .locator(".debts-list-panel")
    .screenshot({ path: "../checks/active-debts.png" });
  assert.equal(
    await activeFilter
      .locator(".MuiTouchRipple-root")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgba(0, 0, 0, 0)",
    "El contador no debe aplicar su fondo a la capa de animación del botón",
  );
  await watch
    .getByRole("button", {
      name: "Ver deuda Pago adelantado de prueba",
      exact: true,
    })
    .click();
  assert.equal(
    await page
      .locator(".debt-navigation-header > button.active")
      .evaluate((el) => getComputedStyle(el).boxShadow),
    "none",
  );
  await page.getByRole("button", { name: "Editar deuda", exact: true }).click();
  await page.waitForFunction(
    () =>
      Number(
        getComputedStyle(document.querySelector(".modal-backdrop")).opacity,
      ) >= 0.999,
  );
  await page
    .getByRole("dialog")
    .screenshot({ path: "../checks/payment-editor.png" });
  const day = page.getByLabel("Día de cobro de cada mes", { exact: true });
  assert.equal(await day.inputValue(), "4");
  await day.selectOption("31");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.ok(
    await watch
      .getByText("Cobro el día 4 de cada mes", { exact: true })
      .isVisible(),
  );
  for (const width of [427, 320]) {
    await page.setViewportSize({ width, height: 876 });
    // Recharts ajusta su SVG mediante ResizeObserver en el siguiente frame.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      JSON.stringify({
        width,
        overflow: await page.evaluate(() =>
          [...document.querySelectorAll(".content *")]
            .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
            .slice(0, 12)
            .map((el) => ({
              tag: el.tagName,
              class: el.className,
              right: el.getBoundingClientRect().right,
            })),
        ),
      }),
    );
    const navigation = page.locator(".mobile-navigation");
    assert.deepEqual(await navigation.getByRole("button").allTextContents(), [
      "",
      "",
      "",
      "",
      "",
    ]);
    for (const button of await navigation.getByRole("button").all()) {
      const bounds = await button.boundingBox();
      assert.ok(bounds.width >= 44 && bounds.height >= 44);
    }
    if (width === 427) {
      await watch.scrollIntoViewIfNeeded();
      await page.screenshot({ path: "../checks/payment-watch-mobile.png" });
    }
  }
  assert.equal(writes, 0);
  assert.deepEqual(errors, []);
  console.log(
    "Cobros OK: estados compartidos en Mi espacio y Deudas, día editable, cancelar sin cambios, sidebar integrado y menú móvil accesible de iconos.",
  );
} finally {
  await browser.close();
}
