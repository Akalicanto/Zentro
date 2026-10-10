import test from "node:test";
import assert from "node:assert/strict";
import { cents, sum } from "../../src/shared/utils/money.ts";

test("Los céntimos se convierten exactamente, incluso junto al límite de precisión", () => {
  assert.equal(cents("90071992547409.91"), Number.MAX_SAFE_INTEGER);
  assert.equal(cents("-90071992547409,91"), -Number.MAX_SAFE_INTEGER);
  assert.equal(cents(" 0,01 "), 1);
  assert.equal(cents("-1.15"), -115);
  assert.throws(() => cents("90071992547409.92"), /demasiado grande/);
  assert.throws(() => cents("1.001"), /dos decimales/);
});

test("Las sumas no redondean céntimos por el orden de los importes ni aceptan desbordamientos", () => {
  assert.equal(sum([Number.MAX_SAFE_INTEGER, 2, -2]), Number.MAX_SAFE_INTEGER);
  assert.throws(() => sum([Number.MAX_SAFE_INTEGER, 1]), /precisión/);
});
