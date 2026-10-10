import { chromium, devices } from "@playwright/test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { testProfile } from "../fixtures/profile.ts";

const front = fileURLToPath(new URL("../../", import.meta.url));
const root = path.resolve(front, "..");
const socket = createServer();
await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const preview = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  { cwd: front, windowsHide: true, stdio: "ignore" },
);
let browser;
let state = testProfile();
let offline = false;
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    if (i > 100 || preview.exitCode !== null)
      throw Error("El preview Android no arrancó");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    locale: "es-ES",
  });
  await context.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      if (offline) return route.abort("internetdisconnected");
      if (route.request().method() === "PUT") {
        state = route.request().postDataJSON();
        await route.fulfill({ status: 204 });
      } else await route.fulfill({ json: state });
    },
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin);
  await page
    .getByRole("heading", { name: "Mi espacio", exact: true })
    .waitFor();
  const manifest = await (await fetch(origin + "/manifest.webmanifest")).json();
  assert.equal(manifest.name, "Zentro");
  assert.equal(manifest.display, "standalone");
  assert.ok(
    manifest.icons.some(
      (icon) => icon.sizes === "512x512" && icon.purpose === "maskable",
    ),
  );
  for (const icon of manifest.icons)
    assert.equal((await fetch(origin + icon.src)).status, 200);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page
    .getByRole("heading", { name: "Mi espacio", exact: true })
    .waitFor();
  const snapshot = structuredClone(state);
  for (const name of [
    "Día a día",
    "Ahorros",
    "Inversión",
    "Deudas",
    "Mi espacio",
  ]) {
    await page
      .getByRole("navigation", { name: "Navegación móvil" })
      .getByRole("button", { name, exact: true })
      .click();
    await page.getByRole("heading", { name, exact: true }).waitFor();
    await page.waitForFunction(
      () => document.documentElement.scrollWidth <= innerWidth,
    );
  }
  // Comprueba que un cambio de fecha no esconde previsiones existentes.
  await page
    .getByRole("navigation", { name: "Navegación móvil" })
    .getByRole("button", { name: "Día a día", exact: true })
    .click();
  assert.ok(
    (await page.locator(".cash-panel").first().innerText()).includes(
      "Gasto de prueba",
    ),
  );
  await page.getByRole("button", { name: "Añadir gasto", exact: true }).click();
  assert.equal(
    await page.getByRole("dialog").locator('[name="month"]').count(),
    0,
  );
  const before = await page.locator(".app > main").first().boundingBox();
  await page.mouse.move(2, 250);
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(150);
  const after = await page.locator(".app > main").first().boundingBox();
  assert.equal(after.y, before.y);
  assert.equal(
    await page
      .locator(".app")
      .first()
      .evaluate((el) => el.inert),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await page.evaluate(() => document.body.style.position), "");
  assert.deepEqual(state, snapshot);
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  fs.mkdirSync(path.join(root, "checks"), { recursive: true });
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(root, "checks/android-daily-dark.png"),
  });
  await page.getByRole("button", { name: "Modo claro", exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(root, "checks/android-daily-light.png"),
  });
  const cached = await page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (name) =>
          (await (await caches.open(name)).keys()).map(
            (request) => request.url,
          ),
        ),
      )
    ).flat(),
  );
  assert.ok(cached.some((url) => url.includes("/assets/")));
  assert.equal(
    cached.some((url) => new URL(url).pathname.startsWith("/api/")),
    false,
  );
  offline = true;
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("heading", { name: "No se pudo cargar Zentro", exact: true })
    .waitFor();
  assert.deepEqual(state, snapshot);
  assert.deepEqual(errors, []);
  console.log(
    "Android/PWA: instalación, iconos, navegación táctil, modales, datos sin mes y caché sin información financiera correctos. Perfil privado intacto.",
  );
} finally {
  await browser?.close();
  if (preview.exitCode === null) {
    const exited = new Promise((resolve) => preview.once("exit", resolve));
    if (process.platform === "win32")
      spawnSync("taskkill", ["/PID", String(preview.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    else preview.kill("SIGTERM");
    await exited;
  }
}
