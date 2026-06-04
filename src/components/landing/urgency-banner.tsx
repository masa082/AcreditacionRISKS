import Link from "next/link";
import { getMarketingConfig } from "@/lib/marketing-config";

/** Banner navy/dorado en la parte superior. Comunica urgencia o promoción.
 *  Editable desde /panel/organizacion → sección Marketing. */
export async function UrgencyBanner() {
  const m = await getMarketingConfig();
  if (!m.urgency.enabled || !m.urgency.text) return null;
  return (
    <div className="relative isolate bg-brand-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-6 py-2 text-center text-xs sm:text-sm">
        <span className="font-medium">{m.urgency.text}</span>
        {m.urgency.ctaLabel ? (
          <Link
            href={m.urgency.ctaHref || "/registro?cert=sarlaft"}
            className="inline-flex items-center gap-1 rounded-full bg-gold-500 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-900 transition hover:bg-gold-400"
          >
            {m.urgency.ctaLabel} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
