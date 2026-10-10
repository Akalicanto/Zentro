import test from "node:test";
import assert from "node:assert/strict";
import {
  blankProfile,
  validateProfile,
  monthSeries,
  cashTotals,
} from "../../src/domain/index.ts";
import { addMonth } from "../../src/shared/utils/dates.ts";

test("El saldo diario conserva céntimos exactos y rechaza previsiones fuera de rango", () => {
  const profile = blankProfile();
  profile.daily.opening = Number.MAX_SAFE_INTEGER;
  profile.daily.incomes = [
    {
      id: "income",
      concept: "Ingreso",
      amount: 2,
      status: "planned",
      includedInOpening: false,
    },
  ];
  assert.throws(() => validateProfile(profile), /precisión/);
  profile.daily.expenses = [
    {
      id: "expense",
      concept: "Gasto",
      amount: 2,
      status: "planned",
      includedInOpening: false,
    },
  ];
  assert.equal(
    cashTotals(validateProfile(profile)).forecast,
    Number.MAX_SAFE_INTEGER,
  );
});
test("Los planes largos se rechazan en vez de truncarse silenciosamente", () => {
  const profile = blankProfile();
  profile.plan.horizon = addMonth(profile.plan.start, 600);
  assert.throws(() => validateProfile(profile), /plan mensual/);
  profile.plan.horizon = addMonth(profile.plan.start, 599);
  assert.equal(monthSeries(validateProfile(profile), "savings").length, 600);
});
test("El último mes admitido no genera fechas inválidas ni bucles al completar el plan", () => {
  const profile = blankProfile();
  profile.plan.start = "9999-11";
  profile.plan.horizon = "9999-12";
  assert.equal(monthSeries(validateProfile(profile), "savings").length, 2);
  assert.throws(() => addMonth("9999-12", 1), /mes debe/);
});

test("Una copia con filas nulas o conceptos de otro tipo muestra un error de validación comprensible", () => {
  const profile = blankProfile();
  assert.throws(
    () => validateProfile({ ...profile, savings: [null] }),
    /Perfil no válido/,
  );
  assert.throws(
    () =>
      validateProfile({
        ...profile,
        daily: {
          ...profile.daily,
          expenses: [
            {
              id: "expense",
              concept: 123,
              amount: 100,
              status: "planned",
              includedInOpening: false,
            },
          ],
        },
      }),
    /Gasto o ingreso no válido/,
  );
  assert.throws(
    () =>
      validateProfile({
        ...profile,
        possibleExpenses: [{ id: "   ", concept: "Gasto", amount: 100 }],
      }),
    /posibles gastos/,
  );
});
