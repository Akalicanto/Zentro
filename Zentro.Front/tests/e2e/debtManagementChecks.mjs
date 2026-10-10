import assert from "node:assert/strict";
import path from "node:path";
export async function verifyDebtManagement({ page, state, root }) {
  const original = await state();
  const debtNavigation = page
    .locator("#zentro-navigation")
    .getByRole("button", { name: "Deudas", exact: true });
  await page.setViewportSize({ width: 1512, height: 1100 });
  await page
    .locator("#zentro-navigation")
    .getByRole("button", { name: "Deudas", exact: true })
    .click();
  const disclosure = page.locator(".debt-navigation-disclosure");
  assert.equal(await disclosure.getAttribute("aria-expanded"), "true");
  const overviewUrl = page.url();
  await disclosure.click();
  assert.equal(await disclosure.getAttribute("aria-expanded"), "false");
  assert.equal(page.url(), overviewUrl);
  await disclosure.click();
  await page.getByRole("button", { name: "Añadir deuda", exact: true }).click();
  await page
    .getByLabel("Nombre de la deuda", { exact: true })
    .fill("Préstamo de prueba");
  await page.getByLabel("Deuda total (€)", { exact: true }).fill("100,01");
  await page
    .getByLabel("Día de cobro de cada mes", { exact: true })
    .selectOption("31");
  await page.getByLabel("Crear un calendario de cuotas").check();
  await page.getByLabel("Primer mes", { exact: true }).fill("2027-02");
  await page.getByLabel("Número de cuotas", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  const detailUrl = page.url();
  await disclosure.click();
  assert.equal(page.url(), detailUrl);
  await page.getByRole("heading", { name: /^Préstamo de prueba/ }).waitFor();
  await disclosure.click();
  assert.equal(page.url(), detailUrl);
  let data = await state();
  let loan = data.debts.find((d) => d.name === "Préstamo de prueba");
  assert.equal(data.debts.length, original.debts.length + 1);
  assert.equal(loan.dueDay, 31);
  assert.deepEqual(
    loan.installments.map((r) => r.amount),
    [3333, 3333, 3335],
  );
  await page
    .getByRole("button", { name: "Todas las deudas", exact: true })
    .click();
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
    .locator(".debt-sidebar-tree button")
    .filter({ hasText: "Préstamo de prueba" })
    .click();
  await page.getByRole("button", { name: "Editar deuda", exact: true }).click();
  assert.equal(
    await page
      .getByLabel("Día de cobro de cada mes", { exact: true })
      .inputValue(),
    "31",
  );
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
  assert.equal(
    await page
      .getByRole("tab", { name: "Historial de cambios", exact: true })
      .count(),
    0,
  );
  assert.ok(await page.locator(".debt-state-completed.debt-state").isVisible());
  assert.equal(
    await page
      .locator(".debt-sidebar-tree button")
      .filter({ hasText: "Préstamo de prueba" })
      .count(),
    0,
  );
  await page
    .getByRole("button", { name: "Todas las deudas", exact: true })
    .click();
  await page.getByRole("tab", { name: /^Completadas/ }).click();
  await page
    .getByRole("heading", { name: "Historial de deudas completadas" })
    .waitFor();
  assert.ok(await page.locator(".debt-completed-date").isVisible());
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
      .locator(".debt-sidebar-tree button")
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
  await page.waitForTimeout(850);
  await page.screenshot({
    path: path.join(root, "checks/debt-detail-light.png"),
  });
  await page
    .locator(".debt-sidebar-tree button")
    .filter({ hasText: "Compra de prueba" })
    .click();
  await page.getByRole("button", { name: "Añadir mes", exact: true }).click();
  await page.getByLabel("Mes de la cuota", { exact: true }).selectOption("10");
  await page
    .getByLabel("Año de la cuota", { exact: true })
    .selectOption("2026");
  await page.getByLabel("Importe de la cuota (€)", { exact: true }).fill("50");
  await page.getByRole("dialog").getByText("Apartado", { exact: true }).click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page
    .getByRole("button", { name: "Editar cuotas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar cuota 2026-10", exact: true })
    .click();
  await page.getByRole("dialog").getByText("Pagado", { exact: true }).click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page
    .getByRole("dialog", { name: "¿Completar esta deuda?", exact: true })
    .waitFor();
  await page.waitForTimeout(850);
  await page.screenshot({
    path: path.join(root, "checks/debt-complete-confirm.png"),
  });
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  let purchase = (await state()).debts.find(
    (d) => d.name === "Compra de prueba",
  );
  assert.equal(purchase.completedOn, undefined);
  assert.equal(purchase.installments[0].status, "paid");
  assert.ok(await page.locator(".debt-state-active.debt-state").isVisible());
  await page
    .getByRole("button", { name: "Completar deuda", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar deuda completada", exact: true })
    .click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  purchase = (await state()).debts.find((d) => d.id === purchase.id);
  assert.ok(purchase.completedOn);
  assert.equal(purchase.installments[0].amount, 5000);
  await page
    .locator(".debt-sidebar-tree button")
    .filter({ hasText: "Préstamo de prueba" })
    .click();
  await page
    .getByRole("button", { name: "Todas las deudas", exact: true })
    .click();
  await page.getByRole("button", { name: "Añadir deuda", exact: true }).click();
  await page
    .getByLabel("Nombre de la deuda", { exact: true })
    .fill("Simulador de prueba");
  await page.getByLabel("Deuda total (€)", { exact: true }).fill("100,01");
  await page.getByLabel("Crear un calendario de cuotas").check();
  await page.getByLabel("Primer mes", { exact: true }).fill("2027-02");
  await page.getByLabel("Número de cuotas", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  const beforeSimulation = await state();
  await page
    .getByRole("button", { name: "Valorar adelanto", exact: true })
    .click();
  await page
    .getByLabel("¿Cuánto quieres adelantar? (€)", { exact: true })
    .fill("3000");
  assert.ok(
    await page
      .getByRole("button", {
        name: "Aceptar y registrar adelanto",
        exact: true,
      })
      .isDisabled(),
  );
  await page
    .getByLabel("¿Cuánto quieres adelantar? (€)", { exact: true })
    .fill("30");
  await page.getByRole("button", { name: /Reducir importe/ }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.deepEqual(await state(), beforeSimulation);
  await page
    .getByRole("button", { name: "Valorar adelanto", exact: true })
    .click();
  await page
    .getByLabel("¿Cuánto quieres adelantar? (€)", { exact: true })
    .fill("30");
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(root, "checks/debt-advance-light.png"),
  });
  await page
    .getByRole("button", { name: "Aceptar y registrar adelanto", exact: true })
    .click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  let simulationDebt = (await state()).debts.find(
    (d) => d.name === "Simulador de prueba",
  );
  assert.equal(simulationDebt.total, 10001);
  assert.equal(simulationDebt.advances[0].amount, 3000);
  assert.equal(simulationDebt.installments.length, 3);
  assert.deepEqual(
    simulationDebt.installments.map((r) => r.amount),
    [2500, 2500, 2001],
  );
  await page
    .getByRole("heading", { name: "Adelantos realizados", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Valorar adelanto", exact: true })
    .click();
  await page
    .getByLabel("¿Cuánto quieres adelantar? (€)", { exact: true })
    .fill("10");
  await page.getByRole("button", { name: /Reducir importe/ }).click();
  await page
    .getByRole("button", { name: "Aceptar y registrar adelanto", exact: true })
    .click();
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
  simulationDebt = (await state()).debts.find(
    (d) => d.id === simulationDebt.id,
  );
  assert.deepEqual(
    simulationDebt.installments.map((r) => r.amount),
    [2001, 2000, 2000],
  );
  assert.equal(simulationDebt.advances.length, 2);
  assert.deepEqual(
    { ...(await state()), debts: beforeSimulation.debts },
    beforeSimulation,
  );
  await page.reload();
  await page.getByRole("heading", { name: /^Simulador de prueba/ }).waitFor();
  assert.deepEqual(
    (await state()).debts.find((d) => d.id === simulationDebt.id),
    simulationDebt,
  );
  await page
    .locator(".debt-sidebar-tree button")
    .filter({ hasText: "Préstamo de prueba" })
    .click();
  const saved = await state();
  loan = saved.debts.find((d) => d.id === loan.id);
  assert.equal(loan.archivedOn, undefined);
  assert.equal(loan.completedOn, undefined);
  assert.equal(loan.notes, "Condiciones de prueba");
  assert.ok(loan.activity.length >= 8);
  assert.deepEqual({ ...saved, debts: original.debts }, original);
  await page.reload();
  await page.getByRole("heading", { name: /^Préstamo de prueba/ }).waitFor();
  assert.ok(await page.locator(".debt-state-active.debt-state").isVisible());
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
  await page.setViewportSize({ width: 427, height: 876 });
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
  assert.equal(
    await page
      .getByRole("tab", { name: "Historial de cambios", exact: true })
      .count(),
    0,
  );
  await page.waitForTimeout(850);
  await page.screenshot({
    path: path.join(root, "checks/debt-detail-mobile.png"),
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page
    .getByRole("button", { name: "Completar deuda", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "¿Completar esta deuda?", exact: true })
    .waitFor();
  await page.waitForTimeout(300);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(
    await page
      .getByRole("dialog")
      .evaluate((element) => element.scrollWidth > element.clientWidth),
    false,
  );
  await page.screenshot({
    path: path.join(root, "checks/debt-confirm-mobile.png"),
  });
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Todas las deudas", exact: true })
    .click();
  await page
    .locator(".debt-summary-card")
    .filter({ hasText: "Simulador de prueba" })
    .click();
  await page
    .getByRole("button", { name: "Valorar adelanto", exact: true })
    .click();
  await page
    .getByLabel("¿Cuánto quieres adelantar? (€)", { exact: true })
    .fill("20");
  await page.waitForTimeout(300);
  assert.equal(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
    false,
  );
  await page.screenshot({
    path: path.join(root, "checks/debt-advance-mobile.png"),
  });
  await page.setViewportSize({ width: 320, height: 700 });
  const backgroundScroll = await page.evaluate(() => window.scrollY);
  await page.getByRole("dialog").hover();
  await page.mouse.wheel(0, 1800);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.scrollY), backgroundScroll);
  assert.equal(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
    false,
  );
  await page
    .getByRole("button", { name: "Cancelar", exact: true })
    .scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.deepEqual(await state(), saved);
  console.log(
    "Gestión de deudas OK: múltiples fichas, cuotas exactas, notas, cerrar/reabrir, eliminar/recuperar, historial, SQLite, recarga y móvil; otros saldos intactos.",
  );
}
