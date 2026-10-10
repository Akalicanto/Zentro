// Exporta el logo original sin cambiar su diseño y compone la marca Z + entro.
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
  const wordmark = await browser.newPage({
    viewport: { width: 680, height: 200 },
    deviceScaleFactor: 2,
  });
  await wordmark.setContent(
    `<style>body{margin:0;width:680px;height:200px;background:#fff8ed;display:flex;align-items:center;justify-content:center;border-radius:32px;gap:0}img{width:138px;height:138px;margin-right:-6px}span{font:750 96px/1 system-ui,sans-serif;letter-spacing:-5px;color:#62428e}</style><img src="${symbol}" alt=""><span>entro</span>`,
  );
  await wordmark.locator("img").evaluate((img) => img.decode());
  await wordmark.screenshot({
    path: fileURLToPath(new URL("../docs/brand/wordmark.png", import.meta.url)),
  });
  await wordmark.close();
} finally {
  await browser.close();
}
