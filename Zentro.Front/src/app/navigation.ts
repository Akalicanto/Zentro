export const pages = [
  "Mi espacio",
  "Día a día",
  "Ahorros",
  "Inversión",
  "Deudas",
  "Simulador",
] as const;
export type Page = (typeof pages)[number];
