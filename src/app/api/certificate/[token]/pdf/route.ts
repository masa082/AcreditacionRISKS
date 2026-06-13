import { prisma } from "@/lib/prisma";
import { qrDataUrl } from "@/lib/certificate";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFileByKey, extFromName } from "@/lib/storage";
import { resolveTheme, hexToRgb01 } from "@/lib/theme";
import { safeText } from "@/lib/pdf-text";
import { buildPdfFilename } from "@/lib/pdf-filename";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Descarga pública del certificado en PDF.
 *
 * Por seguridad — y por la solicitud expresa de proteger los enlaces para
 * que NO se puedan adivinar cambiando un número — esta ruta acepta
 * únicamente el **verifyToken** del certificado, que es un token aleatorio
 * de 24 bytes (192 bits de entropía) generado con randomBytes. El
 * `code` legible (CERT-2026-…) NO sirve aquí, ni tampoco el id.
 *
 *   https://www.okacreditado.com/api/certificate/<verifyToken>/pdf
 *
 * El espacio de búsqueda es ~2^192, lo que vuelve estadísticamente
 * imposible enumerar certificados, manteniendo a la vez una URL pública
 * y compartible. El endpoint registra cada descarga en AuditLog para
 * trazabilidad ISO/IEC 17024.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return new Response("Token inválido", { status: 400 });
  }
  const cert = await prisma.certificate.findFirst({
    where: { verifyToken: token },
    include: {
      subscriber: {
        select: { tradeName: true, legalName: true, authorizedSigner: true, logoUrl: true, signatureImageUrl: true, taxId: true, themeConfig: true },
      },
      scheme: { select: { name: true, code: true, normReference: true, scope: true } },
    },
  });
  if (!cert) {
    return new Response("Certificado no encontrado", { status: 404 });
  }
  if (cert.status !== "VALID" && cert.status !== "EXPIRED") {
    return new Response("Este certificado no se puede descargar (estado: " + cert.status + ")", { status: 403 });
  }

  // Estado efectivo (recalcula vencimiento en caliente).
  const effectiveStatus = cert.expiresAt && cert.status === "VALID" && cert.expiresAt < new Date() ? "EXPIRED" : cert.status;

  // ── Construcción del PDF (formato horizontal A4) ──────────────────
  const pdf = await PDFDocument.create();
  const fontReg = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const W = 841.89, H = 595.28; // A4 landscape
  const page = pdf.addPage([W, H]);

  // Paleta del suscriptor (con fallback institucional).
  const theme = resolveTheme(cert.subscriber.themeConfig);
  const toRgb = (h: string) => { const c = hexToRgb01(h); return rgb(c.r, c.g, c.b); };
  const NAVY = toRgb(theme.primary);
  const GOLD = toRgb(theme.accent);
  const DARK = toRgb(theme.body);
  const GREY = toRgb(theme.muted);
  const LIGHT = toRgb(theme.sectionBg);
  const STATUS_COLOR = effectiveStatus === "VALID" ? rgb(0.04, 0.55, 0.34) : effectiveStatus === "EXPIRED" ? rgb(0.73, 0.43, 0.05) : rgb(0.73, 0.13, 0.20);

  // Marco doble dorado
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: GOLD, borderWidth: 2 });
  page.drawRectangle({ x: 32, y: 32, width: W - 64, height: H - 64, borderColor: GOLD, borderWidth: 0.8 });

  // Logo del suscriptor (si tenemos)
  if (cert.subscriber.logoUrl) {
    try {
      const key = cert.subscriber.logoUrl.startsWith("/api/brand/") ? cert.subscriber.logoUrl.replace("/api/brand/", "") : null;
      if (key) {
        const bytes = await readFileByKey(key);
        const ext = extFromName(key);
        const img = ext === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const ww = 110, hh = (img.height / img.width) * ww;
        page.drawImage(img, { x: 60, y: H - 70 - hh, width: ww, height: hh });
      }
    } catch { /* ignore */ }
  }

  // Encabezado: organismo
  const orgName = (cert.subscriber.tradeName ?? cert.subscriber.legalName).toUpperCase();
  page.drawText(safeText("ORGANISMO CERTIFICADOR"), { x: W / 2 - 80, y: H - 60, size: 9, font: fontBold, color: GREY });
  page.drawText(safeText(orgName), { x: W / 2 - fontBold.widthOfTextAtSize(orgName, 16) / 2, y: H - 80, size: 16, font: fontBold, color: NAVY });
  if (cert.subscriber.legalName !== (cert.subscriber.tradeName ?? cert.subscriber.legalName)) {
    page.drawText(safeText(cert.subscriber.legalName), { x: W / 2 - fontReg.widthOfTextAtSize(cert.subscriber.legalName, 9) / 2, y: H - 95, size: 9, font: fontItalic, color: GREY });
  }

  // Cinta de estado
  page.drawRectangle({ x: 60, y: H - 130, width: W - 120, height: 24, color: LIGHT });
  page.drawText(safeText(`ESTADO DEL CERTIFICADO: ${effectiveStatus === "VALID" ? "VIGENTE" : effectiveStatus === "EXPIRED" ? "VENCIDO" : effectiveStatus}`),
    { x: W / 2 - 110, y: H - 122, size: 11, font: fontBold, color: STATUS_COLOR });

  // Cuerpo del diploma
  page.drawText(safeText("CERTIFICA QUE"), { x: W / 2 - 50, y: H - 175, size: 11, font: fontReg, color: GREY });
  const holder = cert.holderName.toUpperCase();
  page.drawText(safeText(holder), {
    x: W / 2 - fontBold.widthOfTextAtSize(holder, 28) / 2, y: H - 220, size: 28, font: fontBold, color: NAVY,
  });
  if (cert.documentNumber) {
    const docLine = `Identificado(a) con documento Nº ${cert.documentNumber}`;
    page.drawText(safeText(docLine), { x: W / 2 - fontReg.widthOfTextAtSize(docLine, 11) / 2, y: H - 240, size: 11, font: fontReg, color: DARK });
  }
  page.drawText(safeText("Ha cumplido satisfactoriamente con los requisitos para obtener la siguiente certificación de competencias:"), {
    x: 110, y: H - 270, size: 10, font: fontItalic, color: GREY,
  });
  page.drawText(safeText(cert.title), {
    x: W / 2 - fontBold.widthOfTextAtSize(cert.title, 16) / 2, y: H - 295, size: 16, font: fontBold, color: GOLD,
  });
  if (cert.scope ?? cert.scheme?.scope) {
    const scope = (cert.scope ?? cert.scheme?.scope ?? "");
    // Word wrap simple
    const max = W - 220;
    const words = scope.split(/\s+/);
    let line = "", y = H - 320;
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (fontReg.widthOfTextAtSize(trial, 9) > max) {
        page.drawText(safeText(line), { x: 110, y, size: 9, font: fontReg, color: DARK });
        line = w; y -= 12;
      } else line = trial;
    }
    if (line) page.drawText(safeText(line), { x: 110, y, size: 9, font: fontReg, color: DARK });
  }

  // Datos formales (izquierda)
  const dataY = 170;
  page.drawText(safeText("Código:"), { x: 60, y: dataY + 60, size: 9, font: fontBold, color: GREY });
  page.drawText(safeText(cert.code), { x: 100, y: dataY + 60, size: 10, font: fontBold, color: NAVY });
  page.drawText(safeText("Fecha de emisión:"), { x: 60, y: dataY + 45, size: 9, font: fontBold, color: GREY });
  page.drawText(safeText(new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(cert.issuedAt)), { x: 165, y: dataY + 45, size: 10, font: fontReg, color: DARK });
  if (cert.expiresAt) {
    page.drawText(safeText("Fecha de vencimiento:"), { x: 60, y: dataY + 30, size: 9, font: fontBold, color: GREY });
    page.drawText(safeText(new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(cert.expiresAt)), { x: 185, y: dataY + 30, size: 10, font: fontReg, color: DARK });
  }
  if (cert.scheme?.normReference) {
    page.drawText(safeText("Norma de referencia:"), { x: 60, y: dataY + 15, size: 9, font: fontBold, color: GREY });
    page.drawText(safeText(cert.scheme.normReference), { x: 175, y: dataY + 15, size: 10, font: fontReg, color: DARK });
  }
  if (cert.subscriber.taxId) {
    page.drawText(safeText(`NIT ${cert.subscriber.taxId}`), { x: 60, y: dataY, size: 8, font: fontItalic, color: GREY });
  }

  // Firma (derecha)
  if (cert.subscriber.signatureImageUrl) {
    try {
      const key = cert.subscriber.signatureImageUrl.startsWith("/api/brand/") ? cert.subscriber.signatureImageUrl.replace("/api/brand/", "") : null;
      if (key) {
        const bytes = await readFileByKey(key);
        const ext = extFromName(key);
        const img = ext === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const ww = 140, hh = (img.height / img.width) * ww;
        page.drawImage(img, { x: W - 230, y: dataY + 30, width: ww, height: Math.min(hh, 80) });
      }
    } catch { /* ignore */ }
  }
  page.drawLine({ start: { x: W - 250, y: dataY + 30 }, end: { x: W - 90, y: dataY + 30 }, thickness: 0.6, color: GREY });
  if (cert.subscriber.authorizedSigner) {
    page.drawText(safeText(cert.subscriber.authorizedSigner), { x: W - 250, y: dataY + 18, size: 9, font: fontBold, color: NAVY });
  }
  page.drawText(safeText("Firma autorizada del organismo de certificación"), { x: W - 250, y: dataY + 6, size: 8, font: fontItalic, color: GREY });

  // QR de verificación (esquina inferior izquierda del cuerpo)
  try {
    const qrDataURL = await qrDataUrl(cert.code);
    const base64 = qrDataURL.split(",")[1];
    if (base64) {
      const qrBytes = Buffer.from(base64, "base64");
      const qrImg = await pdf.embedPng(qrBytes);
      page.drawImage(qrImg, { x: 60, y: 60, width: 90, height: 90 });
      page.drawText(safeText("Verifique este certificado escaneando el QR"), { x: 60, y: 50, size: 8, font: fontItalic, color: GREY });
      page.drawText(safeText(`okacreditado.com/verificar/${cert.code}`), { x: 60, y: 38, size: 7, font: fontReg, color: GREY });
    }
  } catch { /* ignore */ }

  // Pie con token de seguridad truncado (no se expone el token completo)
  const tokenPreview = `${token.slice(0, 8)}…${token.slice(-8)}`;
  page.drawText(safeText(`Documento emitido digitalmente · token de verificación: ${tokenPreview}`), {
    x: W / 2 - 200, y: 44, size: 7, font: fontItalic, color: GREY,
  });

  // Registrar descarga (audit). No requiere usuario logueado: actor = null.
  try {
    await prisma.auditLog.create({
      data: {
        action: "certificate.download",
        entity: "Certificate",
        entityId: cert.id,
        subscriberId: cert.subscriberId,
        after: { code: cert.code, token: tokenPreview },
      },
    });
  } catch { /* tolerante */ }

  const bytes = await pdf.save();
  // Nombre del archivo dinámico — incluye titular, identificación y
  // estado efectivo (VIGENTE/VENCIDO/...) para que el archivo en disco
  // sea autodescriptivo. Mantiene el código del certificado al final
  // como referencia única para verificación.
  // Ej: Certificado_PEDRO-MUJICA_CC-79924561_VIGENTE_PRES-2026-BC128BA1.pdf
  const certType = cert.type === "CERTIFICATION" ? "Certificado" : "Constancia";
  const fileName = buildPdfFilename({
    prefix: certType,
    holderName: cert.holderName,
    documentType: "DOC",
    documentNumber: cert.documentNumber ?? undefined,
    status: effectiveStatus, // VALID → VIGENTE, EXPIRED → VENCIDO, etc.
    suffix: cert.code,
  });
  // Content-Disposition: inline — permite que el PDF se vea embebido en
  // <iframe> en la pantalla "Mis certificados" del candidato. El botón
  // "Descargar" del cliente usa el atributo HTML download="" para forzar
  // la descarga cuando el usuario lo pide explícitamente.
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      // Indicamos a los buscadores que no indexen este recurso
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
