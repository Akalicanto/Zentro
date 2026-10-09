import { test } from "node:test";
import assert from "node:assert/strict";
import { projectScenario, type Scenario } from "../../src/domain/index.ts";
const scenario: Scenario = {
  start: "2026-11",
  months: 6,
  saving: 10000,
  investment: 5000,
  extra: 20000,
  extraMonth: "2026-12",
  target: 140000,
};
test("El escenario suma la aportación extra una vez y compara el mismo periodo", () => {
  const opening = { savings: 50000, invested: 20000 };
  const copy = structuredClone(scenario);
  const result = projectScenario(opening, scenario, {
    saving: 12000,
    investment: 9000,
  });
  assert.equal(result.final.total, 180000);
  assert.equal(result.final.baseline, 196000);
  assert.equal(result.difference, -16000);
  assert.equal(result.contributed, 110000);
  assert.equal(result.reached, "2027-02");
  assert.equal(result.rows.filter((row) => row.extra > 0).length, 1);
  assert.deepEqual(scenario, copy);
  assert.deepEqual(opening, { savings: 50000, invested: 20000 });
});
test("Objetivos alcanzados, inalcanzables y escenarios sin aportaciones", () => {
  const base = { ...scenario, saving: 0, investment: 0, extra: 0 };
  assert.equal(
    projectScenario({ savings: 0, invested: 0 }, base, {
      saving: 0,
      investment: 0,
    }).reached,
    null,
  );
  const achieved = projectScenario({ savings: 140000, invested: 0 }, base, {
    saving: 0,
    investment: 0,
  });
  assert.equal(achieved.reached, "already");
  assert.equal(achieved.contributed, 0);
  assert.equal(achieved.difference, 0);
});
test("Rechaza importes inválidos, periodos fuera de rango y extras fuera de plazo", () => {
  const run = (changes: Partial<Scenario>) =>
    projectScenario(
      { savings: 0, invested: 0 },
      { ...scenario, ...changes },
      { saving: 0, investment: 0 },
    );
  assert.throws(() => run({ months: 121 }));
  assert.throws(() => run({ saving: -1 }));
  assert.throws(() => run({ investment: 0.5 }));
  assert.throws(() => run({ extraMonth: "2027-05" }));
  assert.throws(() => run({ extraMonth: "2026-13" }));
  assert.throws(() => run({ start: "2026-13" }));
});
