import Link from "next/link";
import { BRAND } from "@/lib/brand";

/** Banner navy/dorado en la parte superior. Comunica urgencia o promoción.
 *  Ajusta el texto en lib/brand.ts → urgency. Pasa null/"" para ocultarlo. */
export function UrgencyBanner() {
  const u = BRAND.urgency;
  if (!u?.text) return null;
  return (
    <div className="relative isolate bg-brand-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-6 py-2 text-center text-xs sm:text-sm">
        <span className="font-medium">{u.text}</span>
        {u.cta ? (
          <Link
            href={u.cta.href}
            className="inline-flex items-center gap-1 rounded-full bg-gold-500 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-900 transition hover:bg-gold-400"
          >
            {u.cta.label} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
