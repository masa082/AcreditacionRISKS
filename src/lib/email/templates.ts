// Plantillas de correo (HTML + texto) con marca del suscriptor.
// No dependen de servidor; se renderizan a strings.

export interface Brand {
  orgName: string;
  primaryColor?: string | null;
  appName?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function layout(brand: Brand, bodyHtml: string): string {
  const color = brand.primaryColor || "#1e3a8a";
  const app = brand.appName || "AcreditaPro";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:${color};padding:18px 28px;color:#ffffff;font-weight:bold;font-size:16px">${escapeHtml(brand.orgName)}</td></tr>
        <tr><td style="padding:28px">${bodyHtml}</td></tr>
        <tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
          ${escapeHtml(brand.orgName)} · Certificación de personas bajo ISO/IEC 17024 · Enviado por ${escapeHtml(app)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(url: string, label: string, color: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0"><tr><td style="border-radius:8px;background:${color}">
    <a href="${url}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

export function verificationEmail(brand: Brand, data: { firstName: string; actionUrl: string }): RenderedEmail {
  const color = brand.primaryColor || "#1e3a8a";
  const html = layout(brand, `
    <h1 style="margin:0 0 12px;font-size:20px">Confirme su correo</h1>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6">Hola ${escapeHtml(data.firstName)}, gracias por registrarse en el proceso de certificación de ${escapeHtml(brand.orgName)}.</p>
    <p style="margin:0;font-size:14px;line-height:1.6">Active su cuenta con el siguiente botón:</p>
    ${button(data.actionUrl, "Activar mi cuenta", color)}
    <p style="margin:8px 0 0;font-size:12px;color:#64748b">Si el botón no funciona, copie este enlace: ${escapeHtml(data.actionUrl)}</p>`);
  return {
    subject: `Active su cuenta — ${brand.orgName}`,
    html,
    text: `Hola ${data.firstName}, active su cuenta en ${brand.orgName}: ${data.actionUrl}`,
  };
}

export function passwordResetEmail(brand: Brand, data: { actionUrl: string }): RenderedEmail {
  const color = brand.primaryColor || "#1e3a8a";
  const html = layout(brand, `
    <h1 style="margin:0 0 12px;font-size:20px">Restablecer contraseña</h1>
    <p style="margin:0;font-size:14px;line-height:1.6">Recibimos una solicitud para restablecer su contraseña. Si fue usted, continúe con el botón. El enlace vence en 1 hora.</p>
    ${button(data.actionUrl, "Restablecer contraseña", color)}
    <p style="margin:8px 0 0;font-size:12px;color:#64748b">Si usted no lo solicitó, ignore este correo. Enlace: ${escapeHtml(data.actionUrl)}</p>`);
  return {
    subject: `Restablecer su contraseña — ${brand.orgName}`,
    html,
    text: `Restablezca su contraseña en ${brand.orgName}: ${data.actionUrl} (vence en 1 hora)`,
  };
}

export function certificateIssuedEmail(brand: Brand, data: { holderName: string; title: string; code: string; verifyUrl: string }): RenderedEmail {
  const color = brand.primaryColor || "#1e3a8a";
  const html = layout(brand, `
    <h1 style="margin:0 0 12px;font-size:20px">¡Su certificado fue emitido! 🎉</h1>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6">${escapeHtml(data.holderName)}, ${escapeHtml(brand.orgName)} ha emitido su certificado:</p>
    <p style="margin:0;font-size:15px;font-weight:bold">${escapeHtml(data.title)}</p>
    <p style="margin:6px 0 0;font-size:13px;color:#64748b">Código: ${escapeHtml(data.code)}</p>
    ${button(data.verifyUrl, "Verificar certificado", color)}
    <p style="margin:8px 0 0;font-size:12px;color:#64748b">Puede descargarlo desde su portal en cualquier momento.</p>`);
  return {
    subject: `Certificado emitido — ${brand.orgName}`,
    html,
    text: `${data.holderName}, su certificado "${data.title}" (código ${data.code}) fue emitido por ${brand.orgName}. Verifíquelo: ${data.verifyUrl}`,
  };
}
