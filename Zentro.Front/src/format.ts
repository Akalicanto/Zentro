const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
});
const monthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
});
export const euro = (n: number) => euroFormatter.format(n / 100);
export function cents(value: string) {
  if (!/^-?\d+(?:[.,]\d{1,2})?$/.test(value.trim()))
    throw Error("Introduce un importe con un máximo de dos decimales.");
  const amount = Math.round(Number(value.replace(",", ".")) * 100);
  if (!Number.isSafeInteger(amount)) throw Error("Importe demasiado grande.");
  return amount;
}
export const uid = () => crypto.randomUUID();
export const sum = (numbers: number[]) => numbers.reduce((a, b) => a + b, 0);
export function addMonth(month: string, n: number) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + n, 1)).toISOString().slice(0, 7);
}
export function monthName(month: string) {
  return monthFormatter.format(new Date(month + "-02T12:00:00"));
}
