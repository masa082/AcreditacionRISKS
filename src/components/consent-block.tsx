"use client";

import { useState } from "react";

/**
 * Bloque de **autorización previa, expresa e informada** para tratamiento
 * de datos personales conforme a la Ley 1581 de 2012, Decreto 1377 de
 * 2013 y la Constitución Política de Colombia (art. 15 — Habeas Data).
 *
 * Diseño basado en Legal Design:
 *  - Lenguaje claro (sin "legalese").
 *  - Jerarquía visual con iconos.
 *  - Información expandible (no muro de texto).
 *  - 2 checkboxes separados: general + sensibles.
 *  - Link al aviso completo de privacidad (risksint.com/habeas-data).
 *
 * Cumple con el principio de PREVIA (antes de capturar el dato),
 * EXPRESA (acto consciente: marcar dos checkboxes) e INFORMADA (la
 * información se entrega ANTES de pedir el consentimiento).
 *
 * El componente es controlado y emite dos campos al form:
 *  - acceptPolicy   (general)
 *  - acceptSensitive (datos sensibles)
 * Ambos son obligatorios para crear cuenta.
 */
export function ConsentBlock({
  responsibleName = "RISKS INTERNATIONAL S.A.S.",
  responsibleEmail = "habeasdata@risksint.com",
  responsiblePhone = "+57 601 794 1834",
  responsibleAddress = "Bogotá D.C., Colombia",
  policyUrlExternal = "https://www.risksint.com/habeas-data/",
  policyUrlInternal = "/privacidad",
}: {
  responsibleName?: string;
  responsibleEmail?: string;
  responsiblePhone?: string;
  responsibleAddress?: string;
  policyUrlExternal?: string;
  policyUrlInternal?: string;
} = {}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(k: string) {
    setExpanded((c) => (c === k ? null : k));
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/40 to-white p-5 shadow-sm">
      {/* Encabezado con marca legal clara */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-xl"
        >
          🛡️
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-brand-900">
            Autorización previa, expresa e informada
          </h3>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            Ley 1581 de 2012 · Decreto 1377 de 2013 · Habeas Data
          </p>
        </div>
        <a
          href={policyUrlInternal}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-md border border-brand-200 bg-white px-2 py-1 text-[10px] font-bold text-brand-800 hover:bg-brand-50"
          title="Abrir la política completa en nueva pestaña"
        >
          Ver política completa ↗
        </a>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-slate-700">
        Antes de continuar, lea con atención lo que viene a continuación.{" "}
        <strong className="text-brand-900">{responsibleName}</strong>, identificado como
        Responsable del Tratamiento, le solicita su autorización para recolectar y tratar
        sus datos personales con las finalidades de evaluación y certificación de
        competencias. Esta autorización es{" "}
        <strong>voluntaria, revocable y específica</strong>.
      </p>

      {/* Secciones expandibles (Legal Design: progressive disclosure) */}
      <div className="mt-4 space-y-2">
        <Card
          icon="📋"
          title="¿Para qué usaremos sus datos? — Finalidades del tratamiento"
          open={expanded === "purposes"}
          onToggle={() => toggle("purposes")}
        >
          <p className="mb-2 text-[13px] text-slate-700">
            Usaremos sus datos exclusivamente para las siguientes finalidades:
          </p>
          <ul className="space-y-1.5 text-[12.5px] text-slate-700">
            <PurposeItem>
              Crear y administrar su cuenta de candidato en la plataforma de certificación.
            </PurposeItem>
            <PurposeItem>
              Gestionar su inscripción a programas de certificación (registro, agenda,
              presentación y calificación de evaluaciones).
            </PurposeItem>
            <PurposeItem>
              Verificar su identidad, antecedentes laborales y documentación aportada para
              determinar su idoneidad como Profesional Certificado.
            </PurposeItem>
            <PurposeItem>
              Emitir, entregar y publicar (con QR de verificación pública) los certificados
              de competencia que apruebe.
            </PurposeItem>
            <PurposeItem>
              Notificarle por correo electrónico, WhatsApp o SMS sobre el estado de su
              proceso, vencimientos y oportunidades de recertificación.
            </PurposeItem>
            <PurposeItem>
              Atender solicitudes, consultas, quejas y reclamos relacionados con el
              servicio de certificación.
            </PurposeItem>
            <PurposeItem>
              Cumplir obligaciones legales, tributarias y reportes ante autoridades de
              vigilancia y control (ONAC, Superintendencias).
            </PurposeItem>
            <PurposeItem>
              Realizar estadísticas y analítica interna para mejorar el servicio (datos
              agregados y disociados).
            </PurposeItem>
          </ul>
        </Card>

        <Card
          icon="⚖️"
          title="Sus derechos como Titular de la información"
          open={expanded === "rights"}
          onToggle={() => toggle("rights")}
        >
          <p className="mb-2 text-[13px] text-slate-700">
            Como titular de los datos, usted tiene derecho a:
          </p>
          <ul className="grid gap-1.5 text-[12.5px] text-slate-700 sm:grid-cols-2">
            <RightItem>Conocer, actualizar y rectificar sus datos.</RightItem>
            <RightItem>Solicitar prueba de la autorización otorgada.</RightItem>
            <RightItem>
              Ser informado del uso que se le ha dado a sus datos.
            </RightItem>
            <RightItem>
              Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).
            </RightItem>
            <RightItem>
              Revocar la autorización y/o solicitar la supresión del dato.
            </RightItem>
            <RightItem>
              Acceder en forma gratuita a sus datos personales tratados.
            </RightItem>
          </ul>
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600 ring-1 ring-slate-200">
            <strong>¿Cómo ejercer estos derechos?</strong> Escríbanos a{" "}
            <a href={`mailto:${responsibleEmail}`} className="font-semibold text-brand-700 hover:underline">
              {responsibleEmail}
            </a>{" "}
            o llame al{" "}
            <a href={`tel:${responsiblePhone.replace(/\s/g, "")}`} className="font-semibold text-brand-700 hover:underline">
              {responsiblePhone}
            </a>
            . Tenemos hasta <strong>15 días hábiles</strong> para responderle conforme
            a la ley.
          </div>
        </Card>

        <Card
          icon="🔐"
          title="Datos sensibles — autorización especial"
          open={expanded === "sensitive"}
          onToggle={() => toggle("sensitive")}
          accent="amber"
        >
          <p className="text-[13px] text-slate-700">
            La Ley clasifica como <strong>sensibles</strong> los datos que afectan la
            intimidad o cuyo uso indebido puede generar discriminación. En el proceso de
            certificación necesitamos tratar los siguientes datos sensibles:
          </p>
          <ul className="mt-2 space-y-1.5 text-[12.5px] text-slate-700">
            <PurposeItem>
              <strong>Fotografía facial</strong> — para validar identidad en presentación
              del examen y emisión del certificado.
            </PurposeItem>
            <PurposeItem>
              <strong>Antecedentes disciplinarios, judiciales y fiscales</strong> —
              para evaluar idoneidad del Oficial de Cumplimiento.
            </PurposeItem>
            <PurposeItem>
              <strong>Datos biométricos del intento de evaluación</strong> (tiempo
              en pantalla, salidas de foco, eventos antifraude).
            </PurposeItem>
          </ul>
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-900 ring-1 ring-amber-200">
            <strong>Importante:</strong> usted{" "}
            <strong>no está obligado(a)</strong> a autorizar el tratamiento de datos
            sensibles. Sin embargo, si no lo autoriza, no podremos realizar el proceso
            de certificación.
          </p>
        </Card>

        <Card
          icon="🏢"
          title="Responsable del Tratamiento — datos de contacto"
          open={expanded === "responsible"}
          onToggle={() => toggle("responsible")}
        >
          <dl className="grid gap-2 text-[12.5px] text-slate-700 sm:grid-cols-2">
            <Row k="Razón social" v={responsibleName} />
            <Row k="Domicilio" v={responsibleAddress} />
            <Row k="Correo de habeas data" v={
              <a href={`mailto:${responsibleEmail}`} className="font-semibold text-brand-700 hover:underline">{responsibleEmail}</a>
            } />
            <Row k="Teléfono" v={
              <a href={`tel:${responsiblePhone.replace(/\s/g, "")}`} className="font-semibold text-brand-700 hover:underline">{responsiblePhone}</a>
            } />
            <Row k="Política completa" v={
              <a href={policyUrlExternal} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline">
                {policyUrlExternal} ↗
              </a>
            } wide />
          </dl>
        </Card>
      </div>

      {/* Los 2 checkboxes obligatorios, claramente separados */}
      <div className="mt-5 space-y-3 rounded-xl border border-brand-200 bg-white p-4">
        <label className="flex cursor-pointer items-start gap-3 text-[13px] text-slate-800">
          <input
            type="checkbox"
            name="acceptPolicy"
            value="on"
            required
            className="mt-0.5 h-4 w-4 rounded border-slate-400 accent-brand-700"
          />
          <span>
            <strong className="text-brand-900">Sí, autorizo</strong> a {responsibleName} a
            tratar mis <strong>datos personales generales</strong> para las finalidades
            descritas arriba. Declaro que la información que entrego es veraz y que he
            sido informado(a) previamente de mis derechos como titular.
            <span className="mt-1 block text-[11px] text-slate-500">
              Esta autorización es obligatoria para crear su cuenta y poder usar la
              plataforma de certificación.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 text-[13px] text-slate-800">
          <input
            type="checkbox"
            name="acceptSensitive"
            value="on"
            required
            className="mt-0.5 h-4 w-4 rounded border-slate-400 accent-amber-600"
          />
          <span>
            <strong className="text-amber-800">Sí, autorizo</strong> de manera{" "}
            <strong>libre y expresa</strong> el tratamiento de mis{" "}
            <strong>datos sensibles</strong> (fotografía facial, antecedentes y eventos
            antifraude de la evaluación) exclusivamente para el proceso de certificación.
            <span className="mt-1 block text-[11px] text-slate-500">
              Sin esta autorización no es posible adelantar el proceso de
              certificación (Art. 6 Decreto 1377/2013).
            </span>
          </span>
        </label>
      </div>

      <p className="mt-3 text-center text-[11px] text-slate-500">
        Al marcar las casillas y crear la cuenta, queda constancia digital de su
        autorización (fecha, hora e IP). Puede{" "}
        <strong>revocarla en cualquier momento</strong> escribiendo a{" "}
        <a href={`mailto:${responsibleEmail}`} className="font-semibold text-brand-700 hover:underline">
          {responsibleEmail}
        </a>
        .
      </p>
    </div>
  );
}

// ─── Subcomponentes ────────────────────────────────────────────────

function Card({
  icon, title, open, onToggle, children, accent = "brand",
}: {
  icon: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  accent?: "brand" | "amber";
}) {
  const accentBg = accent === "amber" ? "bg-amber-50/40" : "bg-white";
  const accentRing = accent === "amber" ? "ring-amber-200" : "ring-slate-200";
  return (
    <div className={`rounded-xl ${accentBg} ring-1 ${accentRing}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5">
          <span className="text-base" aria-hidden>{icon}</span>
          <span className="text-[13px] font-bold text-slate-900">{title}</span>
        </span>
        <span
          aria-hidden
          className={`grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-xs transition ${
            open ? "rotate-180 bg-brand-100 text-brand-800" : "text-slate-500"
          }`}
        >
          ▾
        </span>
      </button>
      {open ? <div className="border-t border-slate-100 px-4 py-3">{children}</div> : null}
    </div>
  );
}

function PurposeItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden className="mt-1 text-[8px] text-brand-700">●</span>
      <span>{children}</span>
    </li>
  );
}

function RightItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden className="mt-0.5 text-emerald-600">✓</span>
      <span>{children}</span>
    </li>
  );
}

function Row({ k, v, wide }: { k: string; v: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k}</dt>
      <dd className="mt-0.5 text-slate-800">{v}</dd>
    </div>
  );
}

/**
 * Snapshot canónico de las finalidades aceptadas — se persiste en
 * `DataConsent.purposes` para auditoría legal. Si en el futuro se
 * agregan finalidades, este array crece y la versión de política sube.
 */
export const CONSENT_PURPOSES_SNAPSHOT = [
  "Crear y administrar cuenta de candidato",
  "Gestionar inscripción y presentación de evaluaciones",
  "Verificar identidad, antecedentes y documentación",
  "Emitir y publicar certificados verificables",
  "Notificar por correo, WhatsApp o SMS",
  "Atender solicitudes, quejas y reclamos",
  "Cumplir obligaciones legales y reportes a autoridades",
  "Realizar estadísticas internas (datos agregados)",
  "Tratamiento de datos sensibles (foto, antecedentes, antifraude)",
] as const;

export const CONSENT_POLICY_VERSION = "v2026-06-05";
