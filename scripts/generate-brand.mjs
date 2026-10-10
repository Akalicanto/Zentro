// Exporta las dos marcas originales sin cambiar su diseño.
import { chromium } from "../Zentro.Front/node_modules/@playwright/test/index.mjs";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
const folder = fileURLToPath(
  new URL("../Zentro.Front/public/brand/", import.meta.url),
);
const original = await fs.readFile(
  new URL("../docs/brand/symbol-source.png", import.meta.url),
);
const symbol = `data:image/png;base64,${original.toString("base64")}`;
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, size] of [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["icon-maskable-512.png", 512],
    ["apple-touch-icon.png", 180],
    ["favicon-32.png", 32],
  ]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    const maskable = name.includes("maskable");
    await page.setContent(
      `<style>body{margin:0;display:grid;place-items:center;width:100vw;height:100vh;background:${maskable ? "#fff8ed" : "transparent"}}img{display:block;width:${maskable ? "88" : "100"}vw;height:${maskable ? "88" : "100"}vh;object-fit:contain}</style><img src="${symbol}" alt="">`,
    );
    await page.locator("img").evaluate((img) => img.decode());
    await page.screenshot({ path: folder + name, omitBackground: !maskable });
    await page.close();
  }
  const fullLogo = await fs.readFile(
    new URL("../docs/brand/wordmark-source.png", import.meta.url),
  );
  const wordmark = await browser.newPage({
    viewport: { width: 720, height: 240 },
    deviceScaleFactor: 1,
  });
  await wordmark.setContent(
    `<style>body{margin:0;background:transparent}img{display:block;width:720px;height:240px;object-fit:contain}</style><img src="data:image/png;base64,${fullLogo.toString("base64")}" alt="Zentro">`,
  );
  await wordmark.locator("img").evaluate((img) => img.decode());
  await wordmark.screenshot({
    path: folder + "logo-full.png",
    omitBackground: true,
  });
  await wordmark.evaluate(() => {
    document.body.style.background = "#fff8ed";
  });
  await wordmark.screenshot({
    path: fileURLToPath(new URL("../docs/brand/wordmark.png", import.meta.url)),
  });
  await wordmark.close();
} finally {
  await browser.close();
}
