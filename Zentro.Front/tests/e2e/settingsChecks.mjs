import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { cashTotals, wealthTotals } from "../../src/domain/index.ts";

export async function verifySettings({ page, state, root, original }) {
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  const settings = () =>
    page.getByRole("dialog", { name: "Configuración", exact: true });
  await settings().waitFor();
  assert.equal(
    await settings().getByRole("button", { name: "Añadir mes" }).count(),
    0,
  );
  fs.mkdirSync(path.join(root, "checks"), { recursive: true });
  await settings().screenshot({
    path: path.join(root, "checks", "settings-light.png"),
  });
  for (const [title, label, value, read] of [
    [
      "Saldo actual de ING",
      "Saldo actual (€)",
      cashTotals(original).current + 100,
      (p) => cashTotals(p).current,
    ],
    ["Efectivo", "Efectivo (€)", (original.cash ?? 0) + 100, (p) => p.cash],
    [
      "Intereses acumulados",
      "Intereses acumulados (€)",
      wealthTotals(original).interest + 100,
      (p) => wealthTotals(p).interest,
    ],
    [
      "Hipoteca ofrecida",
      "Hipoteca ofrecida (€)",
      (original.mortgageOffer ?? 0) + 100,
      (p) => p.mortgageOffer,
    ],
  ]) {
    await settings()
      .getByRole("button", { name: `Editar ${title}`, exact: true })
      .click();
    await page.getByLabel(label, { exact: true }).fill(String(value / 100));
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await settings().waitFor();
    await page.waitForFunction(
      () => localStorage.getItem("zentro.v3.pending") === null,
    );
    const saved = await state();
    assert.equal(read(saved), value);
    assert.deepEqual(saved.savings, original.savings);
    assert.deepEqual(saved.investment, original.investment);
    assert.deepEqual(saved.internalDebt, original.internalDebt);
    assert.deepEqual(saved.debts, original.debts);
  }
  const beforeCancel = await state();
  await settings()
    .getByRole("button", { name: "Editar Efectivo", exact: true })
    .click();
  await page.getByLabel("Efectivo (€)", { exact: true }).fill("9999");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await settings().waitFor();
  assert.deepEqual(await state(), beforeCancel);

  await settings()
    .getByRole("button", { name: "Editar plan mensual", exact: true })
    .click();
  await page
    .getByLabel("Inversión mensual (€)", { exact: true })
    .fill(String((original.plan.investment + 100) / 100));
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await settings().waitFor();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  assert.equal((await state()).plan.investment, original.plan.investment + 100);
  assert.deepEqual(
    (await state()).investment.filter((row) => row.actual !== null),
    original.investment.filter((row) => row.actual !== null),
  );

  const placement = original.savingsPlacements.find(
    (row) => row.kind === "remunerated",
  );
  await settings()
    .getByRole("button", { name: `Configurar ${placement.name}`, exact: true })
    .click();
  await page.getByLabel("Interés anual (%)", { exact: true }).fill("2,3");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await settings().waitFor();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  assert.equal(
    (await state()).savingsPlacements.find((row) => row.id === placement.id)
      .annualRateBps,
    230,
  );

  await settings().getByText("Copias de seguridad", { exact: true }).click();
  const downloading = page.waitForEvent("download");
  await settings()
    .getByRole("button", { name: "Exportar copia", exact: true })
    .click();
  const stream = await (await downloading).createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.deepEqual(
    JSON.parse(Buffer.concat(chunks).toString("utf8")),
    await state(),
  );
  page.once("dialog", (dialog) => dialog.accept());
  const imported = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/state" &&
      response.request().method() === "PUT" &&
      response.status() === 204,
  );
  await settings()
    .getByLabel("Importar copia de seguridad")
    .setInputFiles({
      name: "copia-ficticia.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(original)),
    });
  await imported;
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  assert.deepEqual(await state(), original);
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await settings().screenshot({
    path: path.join(root, "checks", "settings-dark.png"),
  });
  await page
    .getByRole("button", { name: "Cerrar configuración", exact: true })
    .click();
  await page.getByRole("button", { name: "Modo claro", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await settings().waitFor();
  const overflow = await settings().evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  assert.equal(overflow, false);
  await settings().screenshot({
    path: path.join(root, "checks", "settings-mobile.png"),
  });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1512, height: 1100 });
  await page.reload();
  assert.deepEqual(await state(), original);
  console.log(
    "Configuración OK: saldos manuales, plan, condiciones, regreso al panel, cancelar, copias, recarga, oscuro y móvil.",
  );
}
