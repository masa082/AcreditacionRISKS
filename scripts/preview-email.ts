/**
 * Preview standalone de la plantilla de correo. Duplica la función
 * `wrapEmailHtml` de src/lib/email/bulk.ts para evitar el `server-only`
 * y poder ejecutarse fuera de Next.js.
 *
 * Ejecutar:   npx tsx scripts/preview-email.ts
 * Salida:     /tmp/email-preview.html
 *
 * Si cambia la plantilla en bulk.ts, actualizar también aquí.
 */
import fs from "fs";

interface BrandCtx {
  name: string;
  legalName: string;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

function wrapEmailHtml({
  innerHtml,
  subject,
  preheader,
  brand,
}: {
  innerHtml: string;
  subject: string;
  preheader: string;
  brand: BrandCtx;
}): string {
  const safeOrg = escapeHtml(brand.name);
  const safeSubject = escapeHtml(subject);
  const safePreheader = escapeHtml(preheader);
  const initials = (brand.name || "?").split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const isPublicLogo = brand.logoUrl && /^https?:\/\//i.test(brand.logoUrl);
  const logoBlock = isPublicLogo
    ? `<img src="${brand.logoUrl}" alt="${safeOrg}" width="44" height="44" style="display:block;border:0;border-radius:8px;background:#ffffff;object-fit:contain;padding:4px;border:1px solid #e2e8f0;">`
    : `<div style="width:44px;height:44px;border-radius:8px;background:#0b1f3a;color:#ffffff;font-weight:800;font-size:16px;text-align:center;line-height:44px;font-family:Inter,Arial,sans-serif;letter-spacing:-0.3px;">${escapeHtml(initials || "?")}</div>`;
  const contactBits: string[] = [];
  if (brand.contactEmail) contactBits.push(`<a href="mailto:${brand.contactEmail}" style="color:#64748b;text-decoration:none;">${escapeHtml(brand.contactEmail)}</a>`);
  if (brand.contactPhone) contactBits.push(escapeHtml(brand.contactPhone));
  const contactLine = contactBits.join(" · ");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeSubject}</title>
<style>
  body, table, td, p, a, li, blockquote { -webkit-text-size-adjust:100%; }
  img { -ms-interpolation-mode:bicubic; border:0; }
  @media only screen and (max-width: 480px) {
    .container { width:100% !important; }
    .px-md { padding-left:20px !important; padding-right:20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#eef2f7;color:#0f172a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
  ${safePreheader}
</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eef2f7;">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06),0 8px 24px rgba(15,23,42,0.08);">
      <tr><td style="background:#0b1f3a;height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td class="px-md" style="padding:24px 32px 18px 32px;background:#ffffff;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="44" valign="middle" style="padding-right:14px;">${logoBlock}</td>
            <td valign="middle">
              <div style="color:#0b1f3a;font-weight:800;font-size:15px;letter-spacing:-0.2px;line-height:1.2;">${safeOrg}</div>
              <div style="color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;margin-top:2px;">Organismo de Certificación · ISO/IEC 17024</div>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 32px;border-bottom:1px solid #eef2f7;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td class="px-md" style="padding:28px 32px 8px 32px;color:#0f172a;font-size:15px;line-height:1.65;">${innerHtml}</td></tr>
      <tr><td class="px-md" style="padding:8px 32px 28px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding-top:14px;border-top:1px dashed #cbd5e1;">
            <p style="margin:0;color:#0f172a;font-size:13.5px;line-height:1.5;font-weight:600;">${safeOrg}</p>
            <p style="margin:2px 0 0 0;color:#64748b;font-size:12px;line-height:1.5;">Equipo de Certificación · okacreditado.com</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:22px 32px 26px 32px;background:#f8fafc;border-top:1px solid #eef2f7;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td align="left" style="padding-bottom:8px;">
            <span style="display:inline-block;background:#eaf0f6;color:#0b1f3a;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;padding:4px 8px;border-radius:6px;">En proceso de acreditación · ONAC</span>
          </td></tr>
          <tr><td style="color:#64748b;font-size:11.5px;line-height:1.6;padding-bottom:6px;">
            ${contactLine ? `Contacto: ${contactLine}<br>` : ""}
            ${brand.address ? `${escapeHtml(brand.address)}<br>` : ""}
            Mensaje enviado por <strong style="color:#0b1f3a;">${safeOrg}</strong> a través de la plataforma <a href="https://www.okacreditado.com" style="color:#0b1f3a;font-weight:600;">okacreditado.com</a>.
          </td></tr>
          <tr><td style="color:#94a3b8;font-size:10.5px;line-height:1.6;padding-top:6px;border-top:1px solid #e2e8f0;">
            Recibió este correo porque está vinculado al proceso de certificación. Si no era para usted, por favor ignórelo. Para gestionar sus datos personales o ejercer sus derechos de habeas data, consulte la <a href="https://www.okacreditado.com/documentacion" style="color:#64748b;font-weight:600;">Política de Tratamiento de Datos</a>.
          </td></tr>
        </table>
      </td></tr>
    </table>
    <p style="margin:18px 0 0 0;font-size:10.5px;color:#94a3b8;">© ${new Date().getFullYear()} ${safeOrg} · Todos los derechos reservados.</p>
  </td></tr>
</table>
</body>
</html>`;
}

const html = wrapEmailHtml({
  subject: "Pendiente de documentos",
  preheader: "Recuerda completar tu inscripción en CIOC para continuar.",
  brand: {
    name: "RISKS INTERNATIONAL",
    legalName: "RISKS INTERNATIONAL S.A.S.",
    logoUrl: "https://www.risksint.com/wp-content/uploads/2024/02/risks-international-logo.png",
    contactEmail: "gerencia@risksint.com",
    contactPhone: "+57 (601) 555-1234",
    address: "Bogotá D.C., Colombia",
  },
  innerHtml: `
    <p>Hola <strong>Manuel</strong>,</p>
    <p>Te escribimos para recordarte que aún tienes documentos pendientes en tu inscripción al programa <strong>CIOC SARLAFT</strong>.</p>
    <ul>
      <li>Hoja de vida actualizada</li>
      <li>Copia del documento de identidad</li>
      <li>Fotografía a color</li>
    </ul>
    <p>Puedes subir los archivos directamente desde tu portal en <a href="https://www.okacreditado.com/portal">okacreditado.com/portal</a>.</p>
    <p>Es un gusto poder avanzar contigo en el proceso. Cualquier duda, responde este correo y te ayudamos.</p>
  `,
});

fs.writeFileSync("/tmp/email-preview.html", html);
console.log(`✓ Preview escrito en /tmp/email-preview.html (${(html.length / 1024).toFixed(1)} KB)`);
