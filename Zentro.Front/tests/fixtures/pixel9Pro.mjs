import { devices } from "@playwright/test";

// Referencia de Microsoft Playwright. La barra del navegador reduce la altura útil.
export const pixel9Pro = devices["Pixel 9 Pro"] ?? {
  ...devices["Pixel 7"],
  userAgent: devices["Pixel 7"].userAgent
    .replace("Pixel 7", "Pixel 9 Pro")
    .replace("Android 13", "Android 14"),
  viewport: { width: 427, height: 876 },
  screen: { width: 427, height: 952 },
  deviceScaleFactor: 3,
};
