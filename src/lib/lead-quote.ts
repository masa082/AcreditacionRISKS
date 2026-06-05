import { BRAND, CERTIFICATIONS, formatCOP, type PublicCertification } from "@/lib/brand";

/**
 * Cotización automática: arma el correo HTML + texto plano con el
 * detalle del programa de interés del lead. Si no podemos identificar
 * el programa concreto, mandamos un correo de "panorama general" con
 * los 2 programas más solicitados.
 *
 * Reglas de matching del interés del lead → certificación:
 *  - busca un match por slug, por shortName en lower, por categoría o
 *    por substring en el nombre. Lo suficientemente tolerante para que
 *    "SARLAFT" o "Compliance LA/FT" caigan al mismo programa.
 */
function matchCertification(interest: string | null | undefined): PublicCertification | null {
  if (!interest) return null;
  const q = interest.toLowerCase().trim();
  if (!q) return null;
  // 1) match exacto por slug
  const exact = CERTIFICATIONS.find((c) => c.slug === q || c.shortName.toLowerCase() === q);
  if (exact) return exact;
  // 2) substring (manejo robusto de "Oficial de Cumplimiento SARLAFT" etc.)
  const partial = CERTIFICATIONS.find(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q) ||
      q.includes(c.shortName.toLowerCase()) ||
      q.includes(c.category.toLowerCase()),
  );
  return partial ?? null;
}

function html(cert: PublicCertification | null, fullName: string): string {
  const color = "#0b1d44";
  const gold = "#c89a35";
  const greet = `Hola ${escapeHtml(fullName)},`;
  if (!cert) {
    // Fallback: panorama general
    const top = CERTIFICATIONS.filter((c) => c.status === "AVAILABLE" && c.priceCOP != null).slice(0, 3);
    return wrap(color, gold,
      `<p>${greet}</p>
       <p>Gracias por su interés en certificarse con <strong>${BRAND.shortName}</strong>.
       Aquí va el panorama de nuestros programas más solicitados:</p>` +
      top.map((c) => programBlock(c)).join("") +
      `<p style="margin-top:18px">Si nos comparte cuál es de su interés podemos enviarle el detalle puntual,
       agenda y forma de pago.</p>
       <p>Cordialmente,<br/><strong>Equipo Comercial · ${BRAND.shortName}</strong></p>`,
    );
  }
  return wrap(color, gold,
    `<p>${greet}</p>
     <p>Gracias por su interés en la <strong>${escapeHtml(cert.shortName)}</strong>.
     Le compartimos el detalle:</p>` +
    programBlock(cert) +
    `<h3 style="margin:18px 0 6px;color:${color}">Cómo es el proceso</h3>
     <ol style="margin:0;padding-left:18px;color:#334155;font-size:13px">
       <li>Crea tu cuenta y selecciona la certificación.</li>
       <li>Realiza el pago en línea (tarjeta, PSE o transferencia con confirmación).</li>
       <li>Carga tus documentos (hoja de vida, cédula y foto).</li>
       <li>Agenda tu prueba y preséntala en línea con monitoreo.</li>
       <li>Si apruebas (≥80%), pasa al comité para revisión documental.</li>
       <li>Recibes tu diploma con QR de verificación pública.</li>
     </ol>
     <p style="margin-top:14px"><a href="${BRAND.appUrl}/registro?cert=${cert.slug}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;font-size:13px">Iniciar mi inscripción</a></p>
     <p>Si prefiere coordinar por teléfono o WhatsApp, respondemos a este mismo correo.</p>
     <p>Cordialmente,<br/><strong>Equipo Comercial · ${BRAND.shortName}</strong></p>`,
  );
}

function programBlock(c: PublicCertification): string {
  const color = "#0b1d44";
  const gold = "#c89a35";
  const price = c.priceCOP ? `${formatCOP(c.priceCOP)} <span style="font-size:11px;color:#64748b">+ IVA</span>` : "Solicitar información";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff">
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;background:#fdfbf4">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:${gold};font-weight:bold">${escapeHtml(c.category)}</div>
          <div style="font-size:15px;font-weight:bold;color:${color};margin-top:4px">${escapeHtml(c.shortName)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 16px">
          <p style="margin:0 0 10px;font-size:13px;color:#334155">${escapeHtml(c.description)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:12px;color:#475569">
            <tr><td style="padding:2px 14px 2px 0"><b>Duración</b></td><td>${c.durationMin} min · ${Math.round(c.validityMonths / 12)} años de vigencia</td></tr>
            <tr><td style="padding:2px 14px 2px 0"><b>Modalidad</b></td><td>100 % online, con monitoreo</td></tr>
            <tr><td style="padding:2px 14px 2px 0"><b>Inversión</b></td><td>${price}</td></tr>
            <tr><td style="padding:2px 14px 2px 0"><b>Norma</b></td><td>${BRAND.isoNorm}</td></tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function wrap(navy: string, gold: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
          <tr><td style="background:${navy};padding:18px 28px;color:#ffffff;font-weight:bold;font-size:15px">${BRAND.shortName} — Cotización CIOC</td></tr>
          <tr><td style="padding:28px;font-size:14px;line-height:1.55;color:#1f2937">${body}</td></tr>
          <tr><td style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px">
            ${BRAND.shortName} S.A.S. · Certificación de personas bajo ${BRAND.isoNorm} · ${BRAND.contactEmail}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

/** Texto plano (fallback para clientes que no renderizan HTML). */
function text(cert: PublicCertification | null, fullName: string): string {
  if (!cert) {
    return `Hola ${fullName},

Gracias por su interés en certificarse con ${BRAND.shortName}.

Si nos confirma cuál programa es de su interés podemos enviarle el detalle
puntual con precio, agenda y forma de pago.

Catálogo: ${BRAND.appUrl}/certificaciones

Cordialmente,
Equipo Comercial — ${BRAND.shortName}`;
  }
  const price = cert.priceCOP ? `${formatCOP(cert.priceCOP)} + IVA` : "Solicitar información";
  return `Hola ${fullName},

Gracias por su interés en la ${cert.shortName}.

${cert.description}

· Duración: ${cert.durationMin} min · ${Math.round(cert.validityMonths / 12)} años de vigencia
· Modalidad: 100 % online, con monitoreo
· Inversión: ${price}
· Norma: ${BRAND.isoNorm}

Cómo es el proceso:
1. Crea tu cuenta y selecciona la certificación.
2. Realiza el pago en línea.
3. Carga tus documentos.
4. Agenda la prueba.
5. Si apruebas (≥80%), pasa al comité para revisión documental.
6. Recibes tu diploma con QR de verificación.

Inicie su inscripción: ${BRAND.appUrl}/registro?cert=${cert.slug}

Cordialmente,
Equipo Comercial — ${BRAND.shortName}`;
}

export function buildQuoteEmail(args: {
  fullName: string;
  company: string | null;
  jobTitle: string | null;
  interest: string | null;
}): { subject: string; html: string; text: string } {
  const cert = matchCertification(args.interest);
  const subject = cert
    ? `Cotización ${cert.shortName} · ${BRAND.shortName}`
    : `Cotización CIOC · ${BRAND.shortName}`;
  return { subject, html: html(cert, args.fullName), text: text(cert, args.fullName) };
}
