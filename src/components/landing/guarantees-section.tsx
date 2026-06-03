import { BRAND } from "@/lib/brand";

/** Sección de garantías / reaseguros. Reduce la fricción al pagar mostrando
 *  política de reintento, soporte humano y seguridad del pago. */
export function GuaranteesSection() {
  const items = BRAND.guarantees;
  if (!items?.length) return null;
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-700">
            Sin riesgo · 100 % confiable
          </span>
          <h2 className="mt-3 text-2xl font-bold text-brand-900 sm:text-3xl">
            Tu inversión está respaldada
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Construimos el proceso para que inscribirte sea una decisión segura. Estas son nuestras garantías.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((g) => (
            <div key={g.title} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm transition hover:shadow-premium">
              <div className="text-3xl">{g.icon}</div>
              <h3 className="mt-3 font-bold text-brand-900">{g.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
