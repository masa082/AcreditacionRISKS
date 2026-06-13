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
  const app = brand.appName || "CIOC";
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

/// Notificación al candidato cuando termina su examen: muestra el puntaje
/// obtenido (0–100), si superó el umbral, y le explica el siguiente paso
/// (revisión del comité evaluador cuando aplica).
export function examScoreEmail(
  brand: Brand,
  data: {
    holderName: string;
    examName: string;
    scorePercent: number;        // 0 a 100
    passingScore: number;        // 0 a 100
    passed: boolean | null;       // null = aún en calificación manual
    nextStep: "COMMITTEE" | "CERTIFIED" | "APPROVED" | "REJECTED" | "MANUAL_GRADING";
    portalUrl: string;
  },
): RenderedEmail {
  const color = brand.primaryColor || "#1e3a8a";
  const score = Math.round(data.scorePercent * 100) / 100;
  const passing = Math.round(data.passingScore * 100) / 100;

  // Estilo de resultado por estado.
  const palette =
    data.passed === true
      ? { fg: "#047857", bg: "#ecfdf5", border: "#10b981", label: "Aprobó la evaluación" }
      : data.passed === false
        ? { fg: "#b91c1c", bg: "#fef2f2", border: "#ef4444", label: "No alcanzó el umbral" }
        : { fg: "#92400e", bg: "#fffbeb", border: "#f59e0b", label: "En calificación" };

  const subjectVerb =
    data.nextStep === "REJECTED"
      ? "Resultado de su evaluación"
      : data.nextStep === "MANUAL_GRADING"
        ? "Recibimos su evaluación"
        : `Aprobó la evaluación — puntaje ${score}`;

  const nextStepBlock = (() => {
    switch (data.nextStep) {
      case "COMMITTEE":
        return `
          <p style="margin:16px 0 4px;font-size:14px;line-height:1.6">
            <b>Siguiente paso — Comité evaluador.</b> Su caso pasó automáticamente al
            comité para la revisión de su <b>historia laboral y documentos
            cargados</b>. El comité dejará constancia de su decisión (aprobar o
            no aprobar) y le notificaremos por este mismo medio.
          </p>`;
      case "CERTIFIED":
        return `
          <p style="margin:16px 0 4px;font-size:14px;line-height:1.6">
            <b>Siguiente paso — Emisión del certificado.</b> Su certificado se
            emitirá en las próximas horas y llegará a su portal con QR de
            verificación pública.
          </p>`;
      case "APPROVED":
        return `
          <p style="margin:16px 0 4px;font-size:14px;line-height:1.6">
            <b>Siguiente paso — Cierre administrativo.</b> El equipo del
            organismo finalizará la documentación y, en breve, le emitiremos
            su certificado.
          </p>`;
      case "MANUAL_GRADING":
        return `
          <p style="margin:16px 0 4px;font-size:14px;line-height:1.6">
            <b>Siguiente paso — Calificación manual.</b> Algunas respuestas
            requieren revisión humana (casos prácticos, abiertas o archivos).
            El equipo evaluador calificará y le enviaremos el puntaje final
            por este mismo medio.
          </p>`;
      case "REJECTED":
        return `
          <p style="margin:16px 0 4px;font-size:14px;line-height:1.6">
            <b>Siguiente paso — Reintento.</b> No alcanzó el umbral mínimo de
            <b>${passing}%</b>. Si su esquema permite reintento, podrá
            volver a presentar la evaluación desde su portal.
          </p>`;
      default:
        return "";
    }
  })();

  // Si está en calificación manual, ocultamos el valor numérico — todavía no
  // está consolidado.
  const showScore = data.nextStep !== "MANUAL_GRADING";

  const body = `
    <h1 style="margin:0 0 8px;font-size:20px">Resultado de su evaluación</h1>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6">
      ${escapeHtml(data.holderName)}, recibimos su evaluación
      <b>${escapeHtml(data.examName)}</b>. Estos son sus resultados:
    </p>

    ${showScore ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0;border-collapse:collapse">
      <tr>
        <td style="padding:18px;background:${palette.bg};border:1px solid ${palette.border};border-radius:10px;text-align:center">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:${palette.fg};font-weight:bold">Puntaje obtenido</div>
          <div style="font-size:48px;font-weight:800;color:${palette.fg};line-height:1.05;margin:6px 0">${score}<span style="font-size:22px"> / 100</span></div>
          <div style="font-size:13px;color:${palette.fg};font-weight:bold">${palette.label}</div>
          <div style="margin-top:8px;font-size:11px;color:#64748b">Umbral mínimo: ${passing}%</div>
        </td>
      </tr>
    </table>` : `
    <p style="margin:18px 0;padding:16px;background:${palette.bg};border:1px solid ${palette.border};border-radius:10px;font-size:14px;color:${palette.fg}">
      Su evaluación quedó <b>en calificación manual</b>. El puntaje definitivo se
      le notificará en este mismo medio.
    </p>`}

    ${nextStepBlock}

    ${button(data.portalUrl, "Ver mi inscripción en el portal", color)}

    <p style="margin:14px 0 0;font-size:11px;color:#94a3b8">
      Este correo es comprobante del envío de su evaluación. Conserve la
      copia para sus registros — el organismo mantiene trazabilidad completa
      del proceso (intento, respuestas, calificación y decisiones del comité).
    </p>`;

  const html = layout(brand, body);

  const text = showScore
    ? `${data.holderName}, su evaluación "${data.examName}" obtuvo ${score}/100 (umbral ${passing}). ` +
      `Estado: ${palette.label}. Siguiente paso: ${nextStepHuman(data.nextStep)}. ` +
      `Portal: ${data.portalUrl}`
    : `${data.holderName}, recibimos su evaluación "${data.examName}". Quedó en calificación manual. ` +
      `Le enviaremos el puntaje final cuando esté consolidado. Portal: ${data.portalUrl}`;

  return {
    subject: `${subjectVerb} — ${brand.orgName}`,
    html,
    text,
  };
}

function nextStepHuman(s: "COMMITTEE" | "CERTIFIED" | "APPROVED" | "REJECTED" | "MANUAL_GRADING"): string {
  switch (s) {
    case "COMMITTEE": return "revisión por comité evaluador (historia laboral + documentos)";
    case "CERTIFIED": return "emisión automática del certificado";
    case "APPROVED": return "cierre administrativo y emisión del certificado";
    case "REJECTED": return "reintento disponible según su esquema";
    case "MANUAL_GRADING": return "calificación manual de respuestas abiertas";
  }
}

/**
 * Recibo de la autorización Habeas Data — se manda al candidato (con
 * BCC obligatorio a gerencia/formación) llevando como adjunto el PDF
 * de la autorización con click-wrap firmado.
 */
export function habeasReceiptEmail(
  brand: Brand,
  data: {
    holderName: string;
    documentLabel: string;
    acceptedAt: Date;
    responsibleEmail: string;
    policyUrl: string;
    evidenceHash: string;
  },
): RenderedEmail {
  const color = brand.primaryColor || "#0b1d44";
  const localDate = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "full", timeStyle: "long", timeZone: "America/Bogota",
  }).format(data.acceptedAt);

  const body = `
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
      Hola <strong>${escapeHtml(data.holderName)}</strong>,
    </p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
      Confirmamos que el día <strong>${escapeHtml(localDate)}</strong> usted aceptó la
      <strong>Autorización de Tratamiento de Datos Personales</strong> en nuestra plataforma de
      certificación. Adjuntamos a este correo la copia oficial en PDF para que la conserve como
      constancia.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:14px 0;border-collapse:collapse">
      <tr><td style="padding:12px 14px;background:#f1f5f9;border-radius:10px">
        <div style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;color:${color}">Resumen del acto</div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;font-size:12.5px;color:#1f2937">
          <tr><td style="padding:2px 14px 2px 0"><b>Titular</b></td><td>${escapeHtml(data.holderName)}</td></tr>
          <tr><td style="padding:2px 14px 2px 0"><b>Identificación</b></td><td>${escapeHtml(data.documentLabel)}</td></tr>
          <tr><td style="padding:2px 14px 2px 0"><b>Aceptado en</b></td><td>${escapeHtml(localDate)}</td></tr>
          <tr><td style="padding:2px 14px 2px 0"><b>Base legal</b></td><td>Ley 1581/2012 · Decreto 1377/2013</td></tr>
          <tr><td style="padding:2px 14px 2px 0;vertical-align:top"><b>Hash de integridad</b></td>
              <td style="font-family:ui-monospace,Menlo,monospace;font-size:10px;word-break:break-all">${escapeHtml(data.evidenceHash)}</td></tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;line-height:1.6">
      El PDF adjunto contiene el detalle completo: las 5 declaraciones aceptadas, las finalidades del
      tratamiento, sus derechos como titular, la base legal citada y la evidencia electrónica de la
      aceptación (fecha, hora, IP y navegador).
    </p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6">
      Puede revocar esta autorización o ejercer cualquiera de sus derechos en cualquier momento
      escribiendo a
      <a href="mailto:${data.responsibleEmail}" style="color:${color};font-weight:bold">${escapeHtml(data.responsibleEmail)}</a>.
      Tenemos 15 días hábiles para responderle.
    </p>
    ${button(data.policyUrl, "Ver política completa", color)}
    <p style="margin:10px 0 0;font-size:11px;color:#94a3b8">
      Este correo es la prueba electrónica de su autorización conforme al art. 12 del Decreto
      1377/2013. Conserve esta copia y el PDF adjunto para sus registros.
    </p>`;
  const html = layout(brand, body);
  const text =
    `Hola ${data.holderName},\n\n` +
    `Confirmamos que el ${localDate} usted aceptó la Autorización de Tratamiento de Datos Personales.\n` +
    `Adjuntamos el PDF oficial con la evidencia electrónica completa.\n\n` +
    `Titular: ${data.holderName}\nIdentificación: ${data.documentLabel}\n` +
    `Hash de integridad: ${data.evidenceHash}\n\n` +
    `Para revocar o ejercer derechos: ${data.responsibleEmail}\nPolítica completa: ${data.policyUrl}\n\n` +
    `${brand.orgName} — Habeas Data, Ley 1581/2012.`;
  return {
    subject: `Su autorización de tratamiento de datos — ${brand.orgName}`,
    html,
    text,
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

/// Aviso al equipo evaluador (admin del suscriptor + comité) cuando un
/// candidato envía un examen que requiere calificación manual (caso
/// práctico, abiertas, archivos). El correo lleva el folio + un enlace
/// directo al panel de calificación.
export function manualGradingRequiredEmail(
  brand: Brand,
  data: { candidateName: string; examName: string; enrollmentCode: string; submittedAt: Date; panelUrl: string },
): RenderedEmail {
  const color = brand.primaryColor || "#1e3a8a";
  const html = layout(brand, `
    <h1 style="margin:0 0 8px;font-size:20px">Caso práctico por calificar</h1>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6">
      El candidato <b>${escapeHtml(data.candidateName)}</b> envió la evaluación
      <b>${escapeHtml(data.examName)}</b> (folio ${escapeHtml(data.enrollmentCode)}).
      El sistema lo dejó en estado <b>Por calificar</b> a la espera de la
      revisión del equipo evaluador.
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6">
      Por favor revise la respuesta, asigne la nota de 0 a 100 con sus
      comentarios, o solicite información adicional al candidato si lo
      considera necesario. Si se solicita información el intento quedará
      en espera hasta que el candidato responda.
    </p>
    ${button(data.panelUrl, "Abrir panel de calificación", color)}
    <p style="margin:8px 0 0;font-size:12px;color:#64748b">Recibido ${data.submittedAt.toISOString()}</p>`);
  return {
    subject: `Caso práctico por calificar — ${data.candidateName} (${data.enrollmentCode})`,
    html,
    text: `Caso práctico por calificar — ${data.candidateName} (${data.enrollmentCode}) en ${brand.orgName}. Panel: ${data.panelUrl}`,
  };
}

/// Aviso al candidato cuando el equipo evaluador le solicita información
/// adicional para poder culminar la calificación del caso práctico.
export function infoRequestToCandidateEmail(
  brand: Brand,
  data: { holderName: string; examName: string; message: string; portalUrl: string },
): RenderedEmail {
  const color = brand.primaryColor || "#1e3a8a";
  const html = layout(brand, `
    <h1 style="margin:0 0 8px;font-size:20px">Información adicional solicitada</h1>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6">
      ${escapeHtml(data.holderName)}, el equipo evaluador necesita información
      adicional para poder culminar la calificación de su examen
      <b>${escapeHtml(data.examName)}</b>:
    </p>
    <blockquote style="margin:14px 0;padding:14px 16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;font-size:14px;color:#92400e;white-space:pre-wrap">${escapeHtml(data.message)}</blockquote>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6">
      Su examen quedará <b>en espera</b> hasta que envíe su respuesta. Por
      favor ingrese al portal y responda lo antes posible para que el
      equipo pueda completar la calificación.
    </p>
    ${button(data.portalUrl, "Responder en el portal", color)}`);
  return {
    subject: `Necesitamos información adicional — ${brand.orgName}`,
    html,
    text: `${data.holderName}, el equipo evaluador le solicita información adicional. Responda en: ${data.portalUrl}`,
  };
}

/// Aviso al equipo evaluador cuando el candidato responde una solicitud
/// de información adicional. Reabre la calificación.
export function candidateAnsweredInfoRequestEmail(
  brand: Brand,
  data: { candidateName: string; examName: string; enrollmentCode: string; panelUrl: string },
): RenderedEmail {
  const color = brand.primaryColor || "#1e3a8a";
  const html = layout(brand, `
    <h1 style="margin:0 0 8px;font-size:20px">El candidato respondió</h1>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6">
      <b>${escapeHtml(data.candidateName)}</b> respondió la solicitud de
      información adicional sobre la evaluación
      <b>${escapeHtml(data.examName)}</b> (folio ${escapeHtml(data.enrollmentCode)}).
      Puede continuar con la calificación.
    </p>
    ${button(data.panelUrl, "Abrir panel de calificación", color)}`);
  return {
    subject: `Respuesta del candidato — ${data.candidateName} (${data.enrollmentCode})`,
    html,
    text: `${data.candidateName} respondió la solicitud de información. Panel: ${data.panelUrl}`,
  };
}
