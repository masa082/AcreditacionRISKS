import { t, type Locale, DEFAULT_LOCALE } from "@/lib/i18n/locale";

/**
 * Visualización de los 4 pasos del proceso de certificación CIOC.
 *
 * UX/UI:
 *  - Versión "stepper" horizontal con icono + número + título + descripción.
 *  - En mobile: cae a vertical, conector entre pasos.
 *  - Resalta el paso actual con anillo brand + halo dorado.
 *  - Estados de paso: completed (verde), current (brand), upcoming (slate).
 *
 * Se usa en 3 sitios:
 *  - /registro       → step 0 (current = "Registro")
 *  - /portal         → muestra step según inscripción del candidato
 *  - /portal/evaluaciones → step 1 (current = "Documentos + pago")
 *
 * Las cadenas se traducen vía `t()` con el locale del usuario.
 */
export interface ProcessStep {
  n: number;
  icon: string;
  titleKey: string;
  descKey: string;
}

export const PROCESS_STEPS: ProcessStep[] = [
  { n: 1, icon: "✍️", titleKey: "process.s1.title", descKey: "process.s1.desc" },
  { n: 2, icon: "📂", titleKey: "process.s2.title", descKey: "process.s2.desc" },
  { n: 3, icon: "🧪", titleKey: "process.s3.title", descKey: "process.s3.desc" },
  { n: 4, icon: "🏅", titleKey: "process.s4.title", descKey: "process.s4.desc" },
];

/**
 * Render principal. `currentStep` define el paso activo (1..4) y los
 * anteriores se marcan como completados. `variant="compact"` quita la
 * descripción para layouts apretados.
 */
export function ProcessSteps({
  currentStep = 1,
  title,
  subtitle,
  variant = "default",
  locale = DEFAULT_LOCALE,
}: {
  currentStep?: 1 | 2 | 3 | 4;
  title?: string;
  subtitle?: string;
  variant?: "default" | "compact";
  locale?: Locale;
}) {
  const tr = (k: string) => t(k, locale);
  const compact = variant === "compact";
  const resolvedTitle = title ?? tr("process.title");
  const resolvedSubtitle = subtitle ?? tr("process.subtitle");
  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm sm:p-7">
      <header className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-600">
          {tr("process.eyebrow")}
        </p>
        <h3 className="mt-1 text-base font-bold text-brand-900 sm:text-lg">{resolvedTitle}</h3>
        {!compact && resolvedSubtitle ? (
          <p className="mt-1 text-[12.5px] text-slate-500">{resolvedSubtitle}</p>
        ) : null}
      </header>

      <ol className="mt-6 grid gap-3 sm:grid-cols-4 sm:gap-2 lg:gap-3">
        {PROCESS_STEPS.map((step, i) => {
          const status: "completed" | "current" | "upcoming" =
            step.n < currentStep ? "completed" : step.n === currentStep ? "current" : "upcoming";
          const isLast = i === PROCESS_STEPS.length - 1;
          return (
            <li key={step.n} className="relative">
              {/* Conector horizontal (desktop) */}
              {!isLast ? (
                <span
                  aria-hidden
                  className={`pointer-events-none absolute left-[calc(50%+22px)] top-5 hidden h-px w-[calc(100%-44px)] sm:block ${
                    step.n < currentStep ? "bg-emerald-300" : "bg-slate-200"
                  }`}
                />
              ) : null}

              <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <span
                  className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg shadow-sm ring-1 transition ${
                    status === "completed"
                      ? "bg-emerald-100 text-emerald-700 ring-emerald-300"
                      : status === "current"
                      ? "bg-brand-800 text-white ring-brand-300 shadow-brand-300/40"
                      : "bg-slate-100 text-slate-400 ring-slate-200"
                  }`}
                >
                  {status === "completed" ? "✓" : step.icon}
                  {status === "current" ? (
                    <span aria-hidden className="absolute -inset-1 animate-pulse rounded-full ring-2 ring-gold-400/60" />
                  ) : null}
                </span>
                <div className="mt-2 sm:mt-3">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      status === "completed"
                        ? "text-emerald-700"
                        : status === "current"
                        ? "text-brand-800"
                        : "text-slate-400"
                    }`}
                  >
                    {tr("process.step")} {step.n}
                  </p>
                  <h4 className={`mt-0.5 text-[13px] font-bold leading-tight ${
                    status === "upcoming" ? "text-slate-500" : "text-brand-900"
                  }`}>
                    {tr(step.titleKey)}
                  </h4>
                  {!compact ? (
                    <p className="mt-1 text-[11.5px] leading-snug text-slate-500">{tr(step.descKey)}</p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {currentStep === 1 && !compact ? (
        <p className="mt-5 rounded-lg bg-brand-50 px-3 py-2 text-center text-[12px] text-brand-900 ring-1 ring-brand-100">
          💡 {tr("process.estimate")}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Wizard inicial para el candidato recién registrado.
 * Aparece en /portal cuando aún no tiene inscripciones, guiándolo al
 * primer paso accionable: ver evaluaciones disponibles.
 */
export function WelcomeWizard({
  candidateFirstName,
  enrollmentsCount,
  locale = DEFAULT_LOCALE,
}: {
  candidateFirstName?: string;
  enrollmentsCount: number;
  locale?: Locale;
}) {
  const tr = (k: string) => t(k, locale);
  const greeting = candidateFirstName ? `, ${candidateFirstName}` : "";
  const currentStep: 1 | 2 | 3 | 4 = enrollmentsCount === 0 ? 1 : 2;
  return (
    <section className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-600">
            👋 {tr("portal.wizard.welcome")}{greeting}
          </p>
          <h2 className="mt-1 text-lg font-bold text-brand-900 sm:text-xl">
            {tr("portal.wizard.title")}
          </h2>
          <p className="mt-1 max-w-xl text-[13px] text-slate-600">
            {tr("portal.wizard.subtitle")}
          </p>
        </div>
        <a
          href="/portal/evaluaciones"
          className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-bold text-white"
        >
          {enrollmentsCount === 0 ? tr("portal.wizard.cta.start") : tr("portal.wizard.cta.continue")}
        </a>
      </div>

      <div className="mt-5">
        <ProcessSteps
          currentStep={currentStep}
          title=" "
          subtitle=" "
          locale={locale}
        />
      </div>
    </section>
  );
}
