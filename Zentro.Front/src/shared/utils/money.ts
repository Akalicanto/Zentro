const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
});
export const euro = (n: number) => euroFormatter.format(n / 100);
export function cents(value: string) {
  if (!/^-?\d+(?:[.,]\d{1,2})?$/.test(value.trim()))
    throw Error("Introduce un importe con un máximo de dos decimales.");
  const amount = Math.round(Number(value.replace(",", ".")) * 100);
  if (!Number.isSafeInteger(amount)) throw Error("Importe demasiado grande.");
  return amount;
}
export const sum = (numbers: number[]) => numbers.reduce((a, b) => a + b, 0);
