const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
});
export const euro = (n: number) => euroFormatter.format(n / 100);
export function cents(value: string) {
  if (!/^-?\d+(?:[.,]\d{1,2})?$/.test(value.trim()))
    throw Error("Introduce un importe con un máximo de dos decimales.");
  const normalized = value.trim().replace(",", ".");
  const negative = normalized.startsWith("-");
  const [whole, fraction = ""] = normalized.replace(/^-/, "").split(".");
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (amount > BigInt(Number.MAX_SAFE_INTEGER))
    throw Error("Importe demasiado grande.");
  return Number(negative ? -amount : amount);
}
export function sum(numbers: number[]) {
  const total = numbers.reduce((value, amount) => value + BigInt(amount), 0n);
  if (
    total > BigInt(Number.MAX_SAFE_INTEGER) ||
    total < BigInt(Number.MIN_SAFE_INTEGER)
  )
    throw Error(
      "La suma de los importes supera el límite de precisión permitido.",
    );
  return Number(total);
}
