"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { sendCertificateByEmail, buildCertificateWhatsappLink } from "@/lib/actions/certificate-share";
import type { ActionResult } from "@/lib/actions/schemes";

export function CertificateShareActions({
  certId,
  defaultEmail,
  defaultName,
  defaultPhone,
}: {
  certId: string;
  defaultEmail?: string;
  defaultName?: string;
  defaultPhone?: string;
}) {
  const [openEmail, setOpenEmail] = useState(false);
  const [openWa, setOpenWa] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Link
          href={`/certificado/${certId}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir certificado para ver o imprimir como PDF"
          className="rounded border border-brand-200 bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-800 hover:bg-brand-100"
        >
          👁 Ver / PDF
        </Link>
        <button
          type="button"
          onClick={() => setOpenEmail(true)}
          title="Enviar por correo"
          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
        >
          ✉ Email
        </button>
        <button
          type="button"
          onClick={() => setOpenWa(true)}
          title="Compartir por WhatsApp"
          className="rounded border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-800 hover:bg-green-100"
        >
          🟢 WhatsApp
        </button>
      </div>
      {openEmail ? <EmailDialog certId={certId} defaultEmail={defaultEmail} defaultName={defaultName} onClose={() => setOpenEmail(false)} /> : null}
      {openWa ? <WhatsAppDialog certId={certId} defaultPhone={defaultPhone} onClose={() => setOpenWa(false)} /> : null}
    </>
  );
}

function EmailDialog({ certId, defaultEmail, defaultName, onClose }: { certId: string; defaultEmail?: string; defaultName?: string; onClose: () => void }) {
  const bound = sendCertificateByEmail.bind(null, certId);
  const [state, action, pending] = useActionState<ActionResult, FormData>(bound, { ok: false });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <form action={action} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <h3 className="text-lg font-bold text-slate-900">Enviar certificado por correo</h3>
        <p className="mt-1 text-xs text-slate-500">Se envía un correo con el enlace al certificado público, su QR de verificación y datos clave.</p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs">
            <span className="font-semibold text-slate-700">Correo destinatario *</span>
            <input
              name="recipientEmail"
              type="email"
              required
              defaultValue={defaultEmail ?? ""}
              maxLength={160}
              placeholder="correo@empresa.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-slate-700">Nombre destinatario (opcional)</span>
            <input
              name="recipientName"
              defaultValue={defaultName ?? ""}
              maxLength={160}
              placeholder="Para el saludo"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-slate-700">Mensaje adicional (opcional)</span>
            <textarea
              name="message"
              rows={3}
              maxLength={2000}
              placeholder="Adjuntamos su certificado…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>
        {state.error ? <p className="mt-2 text-xs text-rose-600">{state.error}</p> : null}
        {state.ok ? <p className="mt-2 text-xs text-emerald-700">{state.message ?? "Enviado."}</p> : null}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Cerrar</button>
          <button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
            {pending ? "Enviando…" : "Enviar correo"}
          </button>
        </div>
      </form>
    </div>
  );
}

function WhatsAppDialog({ certId, defaultPhone, onClose }: { certId: string; defaultPhone?: string; onClose: () => void }) {
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function openWhatsApp() {
    setErr(null);
    startTransition(async () => {
      try {
        const link = await buildCertificateWhatsappLink(certId, phone, message);
        if (!link) {
          setErr("No se pudo generar el enlace. Verifique el teléfono.");
          return;
        }
        window.open(link, "_blank", "noopener,noreferrer");
        onClose();
      } catch {
        setErr("Ocurrió un error al preparar el enlace.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <h3 className="text-lg font-bold text-slate-900">Compartir por WhatsApp</h3>
        <p className="mt-1 text-xs text-slate-500">Se abrirá WhatsApp con el enlace de verificación pre-rellenado. Usted lo despacha desde su cuenta.</p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs">
            <span className="font-semibold text-slate-700">Teléfono con código de país *</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              required
              maxLength={20}
              placeholder="Ej. 573001234567"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
            <span className="mt-1 block text-[11px] text-slate-500">Solo dígitos. No incluya el signo +.</span>
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-slate-700">Mensaje adicional (opcional)</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Lo dejamos en blanco y usamos un mensaje estándar con datos del certificado."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </label>
        </div>
        {err ? <p className="mt-2 text-xs text-rose-600">{err}</p> : null}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Cerrar</button>
          <button type="button" onClick={openWhatsApp} disabled={pending || !phone.trim()} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60">
            {pending ? "Preparando…" : "Abrir WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  );
}
