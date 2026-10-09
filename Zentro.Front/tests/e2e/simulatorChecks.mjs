import assert from "node:assert/strict";
import path from "node:path";
export async function verifySimulator(page, state, root) {
  const before = await state();
  await page
    .locator("nav")
    .getByRole("button", { name: "Simulador", exact: true })
    .click();
  await page.getByRole("heading", { name: "Simulador", exact: true }).waitFor();
  await page.getByLabel("Periodo", { exact: true }).selectOption("6");
  await page.getByLabel("Ahorro mensual (€)", { exact: true }).fill("100");
  await page.getByLabel("Inversión mensual (€)", { exact: true }).fill("50");
  await page
    .getByLabel("Aportación extra a ahorro (€)", { exact: true })
    .fill("200");
  await page
    .getByLabel("Objetivo de patrimonio (€)", { exact: true })
    .fill("1400");
  const card = page.locator(".metric").filter({
    has: page.getByText("Patrimonio simulado al final", { exact: true }),
  });
  assert.ok((await card.innerText()).includes("1.814,00"));
  await page.getByText("Ver evolución mes a mes", { exact: true }).click();
  assert.equal(await page.locator(".simulator-details tbody tr").count(), 6);
  await page.getByLabel("Ahorro mensual (€)", { exact: true }).fill("-1");
  await page.getByRole("alert").waitFor();
  assert.equal(await card.count(), 0);
  await page.getByLabel("Ahorro mensual (€)", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: path.join(root, "checks/simulator-dark.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Modo claro", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page.waitForTimeout(400);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: path.join(root, "checks/simulator-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1512, height: 1100 });
  await page.waitForTimeout(450);
  await page
    .getByRole("button", { name: "Restablecer escenario", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Ahorro mensual (€)", { exact: true }).inputValue(),
    "120",
  );
  assert.equal(
    await page
      .getByLabel("Aportación extra a ahorro (€)", { exact: true })
      .inputValue(),
    "0",
  );
  assert.deepEqual(await state(), before);
  await page
    .locator("nav")
    .getByRole("button", { name: "Mi espacio", exact: true })
    .click();
}
