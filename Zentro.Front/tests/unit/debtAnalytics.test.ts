import { test } from "node:test";
import assert from "node:assert/strict";
import { debtAnalytics, type ExternalDebt } from "../../src/domain/index.ts";

test("Las estadísticas distinguen lo pagado, apartado y sin calendario", () => {
  const debt: ExternalDebt = {
    id: "test",
    name: "Prueba",
    total: 12000,
    installments: [
      { month: "2026-12", amount: 4000, status: "pending" },
      { month: "2026-08", amount: 3000, status: "paid" },
      { month: "2026-09", amount: 2000, status: "reserved" },
    ],
  };
  const snapshot = structuredClone(debt);
  const stats = debtAnalytics(debt);
  assert.equal(stats.paidPercent, 25);
  assert.equal(stats.preparedPercent, (100 * 5000) / 12000);
  assert.equal(stats.totals.remaining, 9000);
  assert.equal(stats.outstandingCount, 2);
  assert.equal(stats.next?.month, "2026-09");
  assert.equal(stats.last?.month, "2026-12");
  assert.equal(stats.unassigned, 3000);
  assert.deepEqual(debt, snapshot);
});
test("Una deuda vacía o saldada no genera porcentajes inválidos ni cuotas falsas", () => {
  const empty = debtAnalytics({
    id: "empty",
    name: "Vacía",
    total: 0,
    installments: [],
  });
  assert.equal(empty.paidPercent, 0);
  assert.equal(empty.preparedPercent, 0);
  assert.equal(empty.next, undefined);
  const paid = debtAnalytics({
    id: "paid",
    name: "Saldada",
    total: 5000,
    installments: [{ month: "2026-01", amount: 5000, status: "paid" }],
  });
  assert.equal(paid.paidPercent, 100);
  assert.equal(paid.preparedPercent, 100);
  assert.equal(paid.outstandingCount, 0);
  assert.equal(paid.last, undefined);
  assert.equal(paid.totals.remaining, 0);
});
