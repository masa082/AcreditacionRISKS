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

/// Zona horaria fija para toda la aplicación. Server-side se ejecuta en
/// Vercel (UTC); al fijar America/Bogota garantizamos que el sello horario
/// que ve el operador siempre sea la hora legal colombiana (UTC-5), igual
/// al reloj de la barra lateral. Sin esto los `lastLoginAt` aparecían en
/// UTC y daban la impresión de un ingreso "futuro" de varias horas.
const TZ_CO = "America/Bogota";

export function dateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TZ_CO,
  });
}

export function dateOnly(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-CO", { dateStyle: "medium", timeZone: TZ_CO });
}
