export const pages = [
  "Mi espacio",
  "Día a día",
  "Ahorros",
  "Inversión",
  "Deudas",
] as const;
export type Page = (typeof pages)[number];
