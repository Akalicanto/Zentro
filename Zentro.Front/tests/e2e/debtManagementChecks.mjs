import assert from "node:assert/strict";
import path from "node:path";
export async function verifyDebtManagement({ page, state, root }) {
  const original = await state();
  await page.setViewportSize({ width: 1512, height: 1100 });
  await page
    .locator("#zentro-navigation")
    .getByRole("button", { name: "Deudas", exact: true })
    .click();
  await page.getByRole("button", { name: "Añadir deuda", exact: true }).click();
  await page
    .getByLabel("Nombre de la deuda", { exact: true })
    .fill("Préstamo de prueba");
  await page.getByLabel("Deuda total (€)", { exact: true }).fill("100,01");
  await page.getByLabel("Crear un calendario de cuotas").check();
  await page.getByLabel("Primer mes", { exact: true }).fill("2027-02");
  await page.getByLabel("Número de cuotas", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  let data = await state();
  let loan = data.debts.find((d) => d.name === "Préstamo de prueba");
  assert.equal(data.debts.length, original.debts.length + 1);
  assert.deepEqual(
    loan.installments.map((r) => r.amount),
    [3333, 3333, 3335],
  );
  await page.getByRole("button", { name: "Añadir deuda", exact: true }).click();
  await page
    .getByLabel("Nombre de la deuda", { exact: true })
    .fill("Compra de prueba");
  await page.getByLabel("Deuda total (€)", { exact: true }).fill("50");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  data = await state();
  assert.equal(data.debts.length, original.debts.length + 2);
  assert.equal(data.debts.find((d) => d.id === loan.id).total, 10001);
  await page
    .locator(".debt-sidebar-tree summary")
    .filter({ hasText: "Préstamo de prueba" })
    .click();
  await page.getByRole("button", { name: "Editar deuda", exact: true }).click();
  await page.getByLabel("Deuda total (€)", { exact: true }).fill("130,01");
  await page.getByLabel("Notas", { exact: true }).fill("Condiciones de prueba");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page
    .getByRole("button", { name: "Planificar cuotas", exact: true })
    .click();
  await page.getByLabel("Primer mes", { exact: true }).fill("2027-06");
  await page.getByLabel("Número de cuotas", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page
    .getByRole("button", { name: "Completar deuda", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.equal(
    (await state()).debts.find((d) => d.id === loan.id).completedOn,
    undefined,
  );
  await page
    .getByRole("button", { name: "Completar deuda", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar deuda completada", exact: true })
    .click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  loan = (await state()).debts.find((d) => d.id === loan.id);
  assert.ok(loan.completedOn);
  assert.ok(loan.installments.every((r) => r.status === "paid"));
  assert.equal(
    loan.installments.reduce((n, r) => n + r.amount, 0),
    13001,
  );
  await page
    .getByRole("tab", { name: "Historial de cambios", exact: true })
    .click();
  assert.ok(
    await page
      .getByText(
        "Deuda completada. Todo el importe queda registrado como pagado.",
        { exact: true },
      )
      .isVisible(),
  );
  await page
    .getByRole("button", { name: "Todas las deudas", exact: true })
    .click();
  await page.getByRole("tab", { name: /^Completadas/ }).click();
  await page
    .locator(".debt-summary-card")
    .filter({ hasText: "Préstamo de prueba" })
    .click();
  await page
    .getByRole("button", { name: "Reabrir deuda", exact: true })
    .click();
  await page.getByRole("button", { name: "Editar deuda", exact: true }).click();
  await page.getByLabel("Deuda total (€)", { exact: true }).fill("150,01");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page
    .getByRole("button", { name: "Eliminar deuda", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Eliminar y conservar historial",
      exact: true,
    })
    .click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  assert.ok((await state()).debts.find((d) => d.id === loan.id).archivedOn);
  assert.equal(
    await page
      .locator(".debt-sidebar-tree summary")
      .filter({ hasText: "Préstamo de prueba" })
      .count(),
    0,
  );
  await page
    .getByRole("button", { name: "Todas las deudas", exact: true })
    .click();
  await page.getByRole("tab", { name: /^Eliminadas/ }).click();
  await page
    .locator(".debt-summary-card")
    .filter({ hasText: "Préstamo de prueba" })
    .click();
  await page
    .getByRole("button", { name: "Recuperar deuda", exact: true })
    .click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  const saved = await state();
  loan = saved.debts.find((d) => d.id === loan.id);
  assert.equal(loan.archivedOn, undefined);
  assert.equal(loan.completedOn, undefined);
  assert.equal(loan.notes, "Condiciones de prueba");
  assert.ok(loan.activity.length >= 8);
  assert.deepEqual({ ...saved, debts: original.debts }, original);
  await page.reload();
  await page.getByRole("heading", { name: /^Préstamo de prueba/ }).waitFor();
  assert.deepEqual(await state(), saved);
  await page
    .getByRole("button", { name: "Todas las deudas", exact: true })
    .click();
  await page.getByRole("tab", { name: /^Activas/ }).click();
  await page.screenshot({
    path: path.join(root, "checks/debts-overview-light.png"),
  });
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await page.waitForTimeout(450);
  await page.screenshot({
    path: path.join(root, "checks/debts-overview-dark.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(450);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: path.join(root, "checks/debts-overview-mobile.png"),
  });
  await page
    .locator(".debt-summary-card")
    .filter({ hasText: "Préstamo de prueba" })
    .click();
  await page
    .getByRole("tab", { name: "Historial de cambios", exact: true })
    .click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  console.log(
    "Gestión de deudas OK: múltiples fichas, cuotas exactas, notas, cerrar/reabrir, eliminar/recuperar, historial, SQLite, recarga y móvil; otros saldos intactos.",
  );
}
