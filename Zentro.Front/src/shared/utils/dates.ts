const monthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
});
export function addMonth(month: string, n: number) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + n, 1));
  if (
    !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month) ||
    !Number.isInteger(n) ||
    date.getUTCFullYear() < 1000 ||
    date.getUTCFullYear() > 9999
  )
    throw Error("El mes debe estar entre los años 1000 y 9999.");
  return date.toISOString().slice(0, 7);
}
export function monthDistance(start: string, end: string) {
  const index = (month: string) =>
    Number(month.slice(0, 4)) * 12 + Number(month.slice(5));
  return index(end) - index(start);
}
export function monthName(month: string) {
  return monthFormatter.format(new Date(month + "-02T12:00:00"));
}
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
export const currentMonth = () => today().slice(0, 7);
