// Exporta el SVG propio a los tamaños exigidos por Android y los navegadores.
import { chromium } from "../Zentro.Front/node_modules/@playwright/test/index.mjs";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
const folder = fileURLToPath(
  new URL("../Zentro.Front/public/brand/", import.meta.url),
);
const svg = await fs.readFile(folder + "symbol.svg", "utf8");
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, size] of [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-touch-icon.png", 180],
    ["favicon-32.png", 32],
  ]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<style>body{margin:0;background:#eee3fa}svg{display:block;width:100vw;height:100vh}</style>${svg}`,
    );
    await page.screenshot({ path: folder + name });
    await page.close();
  }
} finally {
  await browser.close();
}
