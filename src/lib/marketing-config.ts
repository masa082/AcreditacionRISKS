import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";

export interface MarketingConfig {
  whatsapp: { number: string; message: string };
  socialProof: {
    professionalsCertified: string;
    companiesTrust: string;
    avgScore: string;
    daysToIssue: string;
  };
  urgency: { enabled: boolean; text: string; ctaLabel: string; ctaHref: string };
  guarantees: Array<{ icon: string; title: string; desc: string }>;
  bankingInfo: string;
  slogan: string;
}

const DEFAULTS: MarketingConfig = {
  whatsapp: { number: BRAND.whatsapp.number, message: BRAND.whatsapp.message },
  socialProof: {
    professionalsCertified: BRAND.socialProof.professionalsCertified,
    companiesTrust: BRAND.socialProof.companiesTrust,
    avgScore: BRAND.socialProof.avgScore,
    daysToIssue: BRAND.socialProof.daysToIssue,
  },
  urgency: {
    enabled: !!BRAND.urgency?.text,
    text: BRAND.urgency?.text ?? "",
    ctaLabel: BRAND.urgency?.cta?.label ?? "",
    ctaHref: BRAND.urgency?.cta?.href ?? "/registro?cert=sarlaft",
  },
  guarantees: BRAND.guarantees,
  bankingInfo: "",
  slogan: BRAND.slogan,
};

function mergeWithDefaults(stored: Partial<MarketingConfig> | null | undefined): MarketingConfig {
  if (!stored || typeof stored !== "object") return DEFAULTS;
  const s = stored as Record<string, unknown>;
  return {
    whatsapp: {
      number: (s.whatsapp as { number?: string } | undefined)?.number ?? DEFAULTS.whatsapp.number,
      message: (s.whatsapp as { message?: string } | undefined)?.message ?? DEFAULTS.whatsapp.message,
    },
    socialProof: {
      professionalsCertified:
        (s.socialProof as Partial<MarketingConfig["socialProof"]> | undefined)?.professionalsCertified ?? DEFAULTS.socialProof.professionalsCertified,
      companiesTrust:
        (s.socialProof as Partial<MarketingConfig["socialProof"]> | undefined)?.companiesTrust ?? DEFAULTS.socialProof.companiesTrust,
      avgScore:
        (s.socialProof as Partial<MarketingConfig["socialProof"]> | undefined)?.avgScore ?? DEFAULTS.socialProof.avgScore,
      daysToIssue:
        (s.socialProof as Partial<MarketingConfig["socialProof"]> | undefined)?.daysToIssue ?? DEFAULTS.socialProof.daysToIssue,
    },
    urgency: {
      enabled:
        (s.urgency as Partial<MarketingConfig["urgency"]> | undefined)?.enabled ?? DEFAULTS.urgency.enabled,
      text:
        (s.urgency as Partial<MarketingConfig["urgency"]> | undefined)?.text ?? DEFAULTS.urgency.text,
      ctaLabel:
        (s.urgency as Partial<MarketingConfig["urgency"]> | undefined)?.ctaLabel ?? DEFAULTS.urgency.ctaLabel,
      ctaHref:
        (s.urgency as Partial<MarketingConfig["urgency"]> | undefined)?.ctaHref ?? DEFAULTS.urgency.ctaHref,
    },
    guarantees: Array.isArray(s.guarantees) && (s.guarantees as unknown[]).length > 0
      ? (s.guarantees as Array<{ icon: string; title: string; desc: string }>)
      : DEFAULTS.guarantees,
    bankingInfo: typeof s.bankingInfo === "string" ? (s.bankingInfo as string) : DEFAULTS.bankingInfo,
    slogan: typeof s.slogan === "string" && s.slogan ? (s.slogan as string) : DEFAULTS.slogan,
  };
}

/// Lee la configuración del suscriptor RISKS (único activo) y la mezcla con
/// los defaults estáticos. Memoizado por request usando React.cache para
/// evitar múltiples consultas en la misma renderización.
export const getMarketingConfig = cache(async (): Promise<MarketingConfig> => {
  try {
    const sub = await prisma.subscriber.findFirst({
      where: { slug: "risks", status: "ACTIVE" },
      select: { marketingConfig: true },
    });
    return mergeWithDefaults(sub?.marketingConfig as Partial<MarketingConfig> | null);
  } catch {
    return DEFAULTS;
  }
});
