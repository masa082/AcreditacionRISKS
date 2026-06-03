// FAQ accordion accesible y compatible con FAQPage JSON-LD.
// Recibe la lista en formato { q, a } y emite el schema markup automáticamente.
export interface FAQItem {
  q: string;
  a: string;
}

export function FAQList({ items }: { items: FAQItem[] }) {
  return (
    <>
      <div className="space-y-3">
        {items.map((it) => (
          <details
            key={it.q}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition open:shadow-md"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-semibold text-slate-900">
              <span>{it.q}</span>
              <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-800 transition group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="mt-3 text-sm leading-relaxed text-slate-600">{it.a}</div>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((it) => ({
              "@type": "Question",
              name: it.q,
              acceptedAnswer: { "@type": "Answer", text: it.a },
            })),
          }),
        }}
      />
    </>
  );
}
