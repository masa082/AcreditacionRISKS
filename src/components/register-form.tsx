"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, Input, Select, FormError, SubmitButton } from "@/components/form";
import { registerCandidate, type RegisterState } from "@/lib/actions/registration";
import { ConsentBlock } from "@/components/consent-block";
import { LocationPicker } from "@/components/location-picker";
import { t, type Locale, DEFAULT_LOCALE } from "@/lib/i18n/locale";

interface Org {
  slug: string;
  name: string;
}

export interface CertOption {
  slug: string;
  name: string;
  available: boolean;
  status: "AVAILABLE" | "COMING_SOON" | "ON_REQUEST";
}

const initial: RegisterState = { ok: false };

export function RegisterForm({
  orgs,
  lockedOrg,
  certifications,
  preselectedCert,
  locale = DEFAULT_LOCALE,
}: {
  orgs: Org[];
  lockedOrg?: string;
  certifications?: CertOption[];
  preselectedCert?: string;
  /** Idioma activo, leído server-side desde la cookie y pasado como prop.
   *  El form traduce labels, hints y mensajes con la función `t()`. */
  locale?: Locale;
}) {
  // Helpers internos ligados al locale — evita pasar `locale` en cada `t()`.
  const tr = (k: string) => t(k, locale);
  const STATUS_BADGE: Record<CertOption["status"], { label: string; cls: string }> = {
    AVAILABLE: { label: tr("registro.status.available"), cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    COMING_SOON: { label: tr("registro.status.comingSoon"), cls: "bg-amber-50 text-amber-700 ring-amber-200" },
    ON_REQUEST: { label: tr("registro.status.onRequest"), cls: "bg-slate-100 text-slate-600 ring-slate-200" },
  };
  const [state, action] = useActionState(registerCandidate, initial);
  const certs = certifications ?? [];
  const availableCerts = certs.filter((c) => c.available);
  const initialCert = preselectedCert ?? availableCerts[0]?.slug ?? "";
  const [selectedCert, setSelectedCert] = useState(initialCert);

  if (state.ok) {
    const href = `/activar/${state.activationToken}`;
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✉️
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{tr("registro.success.title")}</h2>
        <p className="text-sm text-slate-500">{tr("registro.success.body")}</p>
        <Link
          href={href}
          className="inline-block rounded-lg btn-grad-navy px-5 py-2.5 text-sm font-semibold text-white"
        >
          {tr("registro.success.activate")}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {state.duplicate ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <span aria-hidden className="text-2xl leading-none">⚠️</span>
            <div className="space-y-2">
              <p className="font-semibold">
                {state.duplicate.kind === "document"
                  ? tr("registro.duplicate.title.doc")
                  : tr("registro.duplicate.title.email")}{" "}
                · {state.duplicate.subscriberName}.
              </p>
              {state.duplicate.hintedEmail ? (
                <p>
                  La cuenta existente está asociada al correo{" "}
                  <strong className="font-mono">{state.duplicate.hintedEmail}</strong>.
                </p>
              ) : null}
              <p>
                Si esa cuenta le pertenece, puede{" "}
                <strong>restablecer su contraseña</strong> e iniciar sesión. Si
                ya no tiene acceso a ese correo, solicite al{" "}
                <strong>administrador del organismo</strong> que actualice sus
                datos de contacto.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/forgot"
                  className="inline-flex items-center gap-1 rounded-lg btn-grad-navy px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {tr("registro.duplicate.cta.reset")}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 rounded-lg border border-brand-700 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-50"
                >
                  {tr("registro.duplicate.cta.login")}
                </Link>
                {state.duplicate.subscriberContact ? (
                  <a
                    href={`mailto:${state.duplicate.subscriberContact}?subject=Actualización de datos de mi cuenta`}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    {tr("registro.duplicate.cta.admin")}
                  </a>
                ) : (
                  <Link
                    href="/contacto"
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    {tr("registro.duplicate.cta.admin")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <FormError error={state.error} />
      )}

      {lockedOrg ? (
        <input type="hidden" name="org" value={lockedOrg} />
      ) : (
        <Field label={tr("registro.org")} htmlFor="org" required hint={tr("registro.org.hint")}>
          <Select id="org" name="org" required defaultValue={orgs[0]?.slug}>
            {orgs.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {certs.length > 0 ? (
        <Field
          label={tr("registro.cert")}
          htmlFor="certificationOfInterest"
          required
          hint={tr("registro.cert.hint")}
        >
          <input type="hidden" name="certificationOfInterest" value={selectedCert} />
          <div className="space-y-2">
            {certs.map((c) => {
              const badge = STATUS_BADGE[c.status];
              const isSelected = selectedCert === c.slug;
              return (
                <button
                  type="button"
                  key={c.slug}
                  disabled={!c.available}
                  onClick={() => c.available && setSelectedCert(c.slug)}
                  className={`group flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${
                    !c.available
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
                      : isSelected
                      ? "border-brand-700 bg-brand-50 ring-2 ring-brand-100"
                      : "border-slate-300 hover:border-brand-400 hover:bg-brand-50/40"
                  }`}
                >
                  <div>
                    <div className={`text-sm font-semibold ${isSelected ? "text-brand-900" : "text-slate-800"}`}>
                      {c.name}
                    </div>
                    {!c.available ? (
                      <p className="mt-0.5 text-[11px] text-slate-500">{tr("registro.cert.comingSoon")}</p>
                    ) : null}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${badge.cls}`}>
                    {badge.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
      ) : null}

      {/* ──────────── Sección 1: Identificación ──────────── */}
      <Section
        icon="👤"
        title={tr("registro.sec.personal")}
        description={tr("registro.sec.personal.desc")}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={tr("registro.firstName")} htmlFor="firstName" required>
            <Input id="firstName" name="firstName" required autoComplete="given-name" />
          </Field>
          <Field label={tr("registro.lastName")} htmlFor="lastName" required>
            <Input id="lastName" name="lastName" required autoComplete="family-name" />
          </Field>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label={tr("registro.documentType")} htmlFor="documentType" required>
            <Select id="documentType" name="documentType" required defaultValue="CC">
              <option value="CC">{tr("registro.doc.cc")}</option>
              <option value="CE">{tr("registro.doc.ce")}</option>
              <option value="PASAPORTE">{tr("registro.doc.passport")}</option>
              <option value="TI">{tr("registro.doc.ti")}</option>
              <option value="NIT">{tr("registro.doc.nit")}</option>
            </Select>
          </Field>
          <Field label={tr("registro.documentNumber")} htmlFor="documentNumber" required>
            <Input id="documentNumber" name="documentNumber" required inputMode="numeric" />
          </Field>
        </div>
      </Section>

      {/* ──────────── Sección 2: Ubicación ──────────── */}
      <Section
        icon="📍"
        title={tr("registro.sec.location")}
        description={tr("registro.sec.location.desc")}
      >
        <LocationPicker defaultCountry="CO" />
      </Section>

      {/* ──────────── Sección 3: Contacto ──────────── */}
      <Section
        icon="✉️"
        title={tr("registro.sec.contact")}
        description={tr("registro.sec.contact.desc")}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={tr("registro.email")} htmlFor="email" required>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label={tr("registro.phone")} htmlFor="phone">
            <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+57 300 000 0000" />
          </Field>
        </div>
      </Section>

      {/* ──────────── Sección 4: Credenciales ──────────── */}
      <Section
        icon="🔐"
        title={tr("registro.sec.account")}
        description={tr("registro.sec.account.desc")}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={tr("registro.password")} htmlFor="password" required hint={tr("registro.passwordHint")}>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label={tr("registro.passwordConfirm")} htmlFor="confirm" required>
            <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
        </div>
      </Section>

      <ConsentBlock />

      {/* Versión y snapshot van como campos ocultos para que el server los
          persista junto con la autorización en DataConsent (auditoría legal). */}
      <input type="hidden" name="consentPolicyVersion" value="v2026-06-05" />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <Link href="/login" className="text-sm font-medium text-brand-700 hover:underline">
          {tr("registro.haveAccount")}
        </Link>
        <SubmitButton pendingText={tr("registro.submit.pending")}>{tr("registro.submit")}</SubmitButton>
      </div>
    </form>
  );
}

/**
 * Sección visual del formulario. Encabezado con ícono + título +
 * descripción, contenido en card sutil. UX legal/forms: cada agrupación
 * por intención (quién, dónde, cómo lo contactamos, cómo se conecta)
 * reduce la carga cognitiva del candidato.
 */
function Section({
  icon, title, description, children,
}: {
  icon: string; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-start gap-3">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-brand-900 sm:text-base">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{description}</p>
          ) : null}
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
}
