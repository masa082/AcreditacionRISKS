"use client";

/// Botones de compartir el certificado en LinkedIn (y copiar enlace).
///
/// Tres acciones:
///
/// 1. **Agregar al perfil de LinkedIn** — usa el flujo oficial
///    "Add to Profile" de LinkedIn que crea una entrada en la sección
///    "Licencias y certificaciones" del perfil profesional con un
///    enlace verificable al certificado. URL base:
///    https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME
///    + parámetros (name, organizationName, issueYear/Month, certUrl, certId).
///
/// 2. **Compartir publicación** — `sharing/share-offsite/?url=...`. El
///    contenido del post lo genera LinkedIn a partir del Open Graph
///    de la página de verificación, donde ya pusimos la imagen 1200×630
///    con la insignia. El candidato puede editar el copy antes de
///    publicar — pero el ancla visual (imagen + título + descripción)
///    es la insignia que diseñamos.
///
/// 3. **Copiar enlace público** — para que el candidato lo pegue en
///    cualquier red (WhatsApp, X, su firma de correo, etc.).
///
/// El texto del CTA que se invita a otros a certificarse va en el
/// preview de OG image y en la `description` que LinkedIn renderiza.

import { useState } from "react";

export interface LinkedInShareProps {
  /** Nombre del certificado (esquema). */
  title: string;
  /** Código legible — irá como certId en LinkedIn. */
  code: string;
  /** Razón social del organismo emisor. */
  organizationName: string;
  /** Año de emisión (YYYY). */
  issueYear: number;
  /** Mes de emisión (1–12). */
  issueMonth: number;
  /** Año de vencimiento (YYYY) — opcional. */
  expirationYear?: number;
  /** Mes de vencimiento — opcional. */
  expirationMonth?: number;
  /** URL pública del verificador (ej. https://www.okacreditado.com/verificar/CIOC-2026-XXXX). */
  publicUrl: string;
}

export function LinkedInShare(props: LinkedInShareProps) {
  const [copied, setCopied] = useState(false);

  function buildAddToProfileUrl(): string {
    const q = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: props.title,
      organizationName: props.organizationName,
      issueYear: String(props.issueYear),
      issueMonth: String(props.issueMonth),
      certUrl: props.publicUrl,
      certId: props.code,
    });
    if (props.expirationYear && props.expirationMonth) {
      q.set("expirationYear", String(props.expirationYear));
      q.set("expirationMonth", String(props.expirationMonth));
    }
    return `https://www.linkedin.com/profile/add?${q.toString()}`;
  }

  function buildShareUrl(): string {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(props.publicUrl)}`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(props.publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback: seleccionar y prompt
      window.prompt("Copie este enlace de verificación pública:", props.publicUrl);
    }
  }

  return (
    <div className="rounded-xl border border-[#0a66c2]/20 bg-gradient-to-br from-[#eff6ff] via-white to-white p-4">
      <div className="flex items-center gap-2">
        <LinkedInLogo />
        <div>
          <h3 className="text-sm font-bold text-[#0a66c2]">Comparta su logro en LinkedIn</h3>
          <p className="text-[11px] text-slate-600">
            Agregue la certificación a su perfil profesional con verificación pública
            o publique el logro en su muro. El enlace lleva incluida la insignia digital.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <a
          href={buildAddToProfileUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0a66c2] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0958a8]"
          title="Abre el flujo oficial de LinkedIn para agregar esta certificación a su perfil"
        >
          🎖️ Agregar a mi perfil de LinkedIn
        </a>
        <a
          href={buildShareUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#0a66c2] bg-white px-3 py-2 text-xs font-bold text-[#0a66c2] shadow-sm transition hover:bg-[#eff6ff]"
          title="Publica este logro como una actualización en LinkedIn con preview de la insignia"
        >
          📣 Compartir como publicación
        </a>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
        <span className="break-all font-mono text-[10px] text-slate-500">{props.publicUrl}</span>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          {copied ? "✓ Copiado" : "Copiar enlace"}
        </button>
      </div>

      <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 Al compartir, su red profesional ve la <strong>insignia digital verificada</strong> con el
        sello del organismo y un enlace público para verificar la autenticidad. La insignia
        invita a otros profesionales a certificarse con nosotros.
      </p>
    </div>
  );
}

function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden>
      <rect width="24" height="24" rx="4" fill="#0a66c2" />
      <path
        fill="#fff"
        d="M7.06 9.34h2.49v8.05H7.06zM8.3 5.6a1.45 1.45 0 1 1 0 2.9 1.45 1.45 0 0 1 0-2.9zM11.2 9.34h2.39v1.1h.03c.33-.63 1.14-1.3 2.35-1.3 2.52 0 2.98 1.66 2.98 3.81v4.44h-2.49V13.5c0-.94-.02-2.16-1.32-2.16-1.32 0-1.52 1.03-1.52 2.1v3.95H11.2z"
      />
    </svg>
  );
}
