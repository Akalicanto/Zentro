import { addMonth } from "../shared/utils/dates.ts";

export type Scenario = {
  start: string;
  months: number;
  saving: number;
  investment: number;
  extra: number;
  extraMonth: string;
  target: number;
};

export function projectScenario(
  opening: { savings: number; invested: number },
  scenario: Scenario,
  reference: { saving: number; investment: number },
) {
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(scenario.start) ||
    !Number.isInteger(scenario.months) ||
    scenario.months < 1 ||
    scenario.months > 120
  )
    throw Error("Selecciona entre 1 y 120 meses y una fecha válida.");
  if (
    [
      opening.savings,
      opening.invested,
      scenario.saving,
      scenario.investment,
      scenario.extra,
      scenario.target,
      reference.saving,
      reference.investment,
    ].some(
      (value) =>
        !Number.isSafeInteger(value) || value < 0 || value > 100_000_000_000,
    )
  )
    throw Error(
      "Usa importes positivos o cero, con un máximo de 1.000 millones de euros.",
    );
  const end = addMonth(scenario.start, scenario.months - 1);
  if (
    scenario.extra > 0 &&
    (!/^\d{4}-(0[1-9]|1[0-2])$/.test(scenario.extraMonth) ||
      scenario.extraMonth < scenario.start ||
      scenario.extraMonth > end)
  )
    throw Error("La aportación extra debe estar dentro del periodo simulado.");
  const initial = opening.savings + opening.invested;
  let savings = opening.savings;
  let invested = opening.invested;
  const rows = Array.from({ length: scenario.months }, (_, index) => {
    const month = addMonth(scenario.start, index);
    const extra = month === scenario.extraMonth ? scenario.extra : 0;
    savings += scenario.saving + extra;
    invested += scenario.investment;
    const baseline =
      initial + (reference.saving + reference.investment) * (index + 1);
    return {
      month,
      savings,
      invested,
      extra,
      total: savings + invested,
      baseline,
    };
  });
  const reached =
    initial >= scenario.target
      ? "already"
      : (rows.find((row) => row.total >= scenario.target)?.month ?? null);
  return {
    rows,
    initial,
    final: rows.at(-1)!,
    reached,
    contributed: rows.at(-1)!.total - initial,
    difference: rows.at(-1)!.total - rows.at(-1)!.baseline,
  };
}
