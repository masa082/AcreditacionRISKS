import type { Prisma } from "@prisma/client";

type Money = number | string | Prisma.Decimal;

/// Formatea un monto con su moneda (por defecto COP, sin decimales).
export function money(amount: Money, currency = "COP"): string {
  const value = typeof amount === "number" ? amount : Number(amount.toString());
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("es-CO")}`;
  }
}

export function dateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function dateOnly(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-CO", { dateStyle: "medium" });
}
