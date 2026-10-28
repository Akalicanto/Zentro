import test from "node:test";
import assert from "node:assert/strict";
import {
  validateProfile,
  cashTotals,
  wealthTotals,
  debtTotals,
  monthlyPlanning,
} from "../../src/domain/index.ts";
import { testProfile } from "../fixtures/profile.ts";

test("El salario es una referencia independiente de saldos, patrimonio y planificación", () => {
  const original = testProfile();
  const profile = validateProfile({ ...original, monthlyNetSalary: 184567 });
  assert.equal(profile.monthlyNetSalary, 184567);
  assert.deepEqual(cashTotals(profile), cashTotals(original));
  assert.deepEqual(wealthTotals(profile), wealthTotals(original));
  assert.deepEqual(debtTotals(profile), debtTotals(original));
  assert.deepEqual(
    monthlyPlanning(profile, "2026-10", 6),
    monthlyPlanning(original, "2026-10", 6),
  );
  const { monthlyNetSalary: _, ...rest } = profile;
  assert.deepEqual(rest, original);
});
test("Las copias antiguas siguen siendo válidas y el salario admite cero pero no importes inválidos", () => {
  validateProfile(testProfile());
  validateProfile({ ...testProfile(), monthlyNetSalary: 0 });
  for (const value of [-1, 1.5, null, "123", Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() =>
      validateProfile({ ...testProfile(), monthlyNetSalary: value }),
    );
});
