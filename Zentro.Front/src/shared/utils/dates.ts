const monthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
});
export function addMonth(month: string, n: number) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + n, 1)).toISOString().slice(0, 7);
}
export function monthName(month: string) {
  return monthFormatter.format(new Date(month + "-02T12:00:00"));
}
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
export const currentMonth = () => today().slice(0, 7);
