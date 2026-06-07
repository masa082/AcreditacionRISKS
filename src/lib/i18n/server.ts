import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, t, type Locale } from "./locale";

/**
 * Lee la cookie `app-locale` desde el request actual. Server-side.
 * Devuelve el locale persistido por el usuario o el default.
 */
export async function getServerLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get(LOCALE_COOKIE)?.value;
  return v && isLocale(v) ? v : DEFAULT_LOCALE;
}

/// Versión "ya pasé el locale" — útil para componentes que reciben el
/// locale como prop y necesitan la función `t` bindeada.
export function makeT(locale: Locale): (k: string) => string {
  return (k) => t(k, locale);
}
