import "server-only";
import { cache } from "react";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";

/**
 * Activos de marca del organismo certificador.
 *
 * Orden de resolución:
 *  1. logoUrl/signatureImageUrl cargados en BD por el admin del suscriptor
 *     RISKS desde /panel/organizacion (se sirven vía /api/brand/...).
 *  2. /public/risks-logo.png si el usuario lo coloca ahí directamente
 *     (escape hatch para no depender del panel).
 *  3. null → la UI cae a mostrar solo el wordmark de texto, sin imagen.
 *
 * Nunca devolvemos un logo "inventado": si no hay archivo oficial cargado,
 * la marca aparece sólo como texto.
 */
export interface BrandAssets {
  logoUrl: string | null;
  signatureImageUrl: string | null;
  tradeName: string;
  legalName: string;
}

const PUBLIC_LOGO_CANDIDATES = ["risks-logo.png", "risks-logo.svg", "risks-logo.jpg", "risks-logo.jpeg", "risks-logo.webp"];

function publicLogoFallback(): string | null {
  const publicDir = join(process.cwd(), "public");
  for (const name of PUBLIC_LOGO_CANDIDATES) {
    if (existsSync(join(publicDir, name))) return `/${name}`;
  }
  return null;
}

export const getBrandAssets = cache(async (): Promise<BrandAssets> => {
  const sub = await prisma.subscriber.findFirst({
    where: { slug: "risks" },
    select: { logoUrl: true, signatureImageUrl: true, tradeName: true, legalName: true },
  });
  const dbLogo = sub?.logoUrl ?? null;
  const dbSignature = sub?.signatureImageUrl ?? null;
  const fallback = publicLogoFallback();
  return {
    logoUrl: dbLogo ?? fallback,
    signatureImageUrl: dbSignature,
    tradeName: sub?.tradeName ?? "RISKS INTERNATIONAL — CIOC",
    legalName: sub?.legalName ?? "Risks International S.A.S.",
  };
});
