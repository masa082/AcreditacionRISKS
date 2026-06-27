import { t, type Locale, DEFAULT_LOCALE } from "@/lib/i18n/locale";

export function VideoTestimonialSection({ locale }: { locale?: Locale }) {
  const tr = (k: string) => t(k, locale ?? DEFAULT_LOCALE);

  return (
    <section className="border-b border-slate-100 bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
            {tr("video.eyebrow")}
          </p>
          <h2 className="mt-3 text-2xl font-bold text-brand-900 sm:text-3xl">
            {tr("video.title")}
          </h2>
        </div>

        {/* Video Embed - Placeholder con fondo degradado */}
        <div className="relative w-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl overflow-hidden shadow-lg" style={{ paddingBottom: "56.25%" }}>
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="text-white text-center">
              <div className="text-5xl mb-2">▶️</div>
              <p className="text-sm font-medium">Video testimonial — Carolina M. (60s)</p>
              <p className="text-xs mt-1 opacity-75">Disponible próximamente</p>
            </div>
          </div>
        </div>

        {/* Quote bajo el video */}
        <div className="mt-8 text-center max-w-2xl mx-auto">
          <p className="text-lg italic text-slate-700">
            "{tr("video.quote")}"
          </p>
          <p className="mt-3 text-sm text-slate-500">
            {tr("video.author")}
          </p>
        </div>
      </div>
    </section>
  );
}
