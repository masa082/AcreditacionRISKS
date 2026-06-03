"use server";

import { cookies } from "next/headers";

/// Setea la cookie de referido (30 días) cuando el visitante aterriza con
/// un código activo. Es invocada desde server pages al detectar ?ref= o
/// desde /r/[code].
export async function setReferralCookie(code: string): Promise<void> {
  const clean = code.trim().toUpperCase().slice(0, 12);
  if (!clean) return;
  const jar = await cookies();
  jar.set("ref_code", clean, {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
}

export async function readReferralCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get("ref_code")?.value ?? null;
}

export async function clearReferralCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete("ref_code");
}
