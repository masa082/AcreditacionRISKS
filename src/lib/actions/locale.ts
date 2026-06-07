"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/locale";

/// Persiste el idioma elegido por el usuario en una cookie con TTL de
/// 1 año. Server action: el cliente llama vía useTransition().
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const c = await cookies();
  c.set(LOCALE_COOKIE, locale, {
    httpOnly: false,        // El cliente puede leerla para hidratar React.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  // Revalida la raíz para que el siguiente render lea el locale nuevo.
  revalidatePath("/", "layout");
}
