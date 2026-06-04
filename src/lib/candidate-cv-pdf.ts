import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { readFileByKey, extFromName } from "@/lib/storage";
import { appBaseUrl } from "@/lib/app-url";

/// Zona horaria fija para todo el informe: hora legal colombiana.
/// La plataforma puede ser visitada desde cualquier país, pero el informe
/// como acto formal de certificación se sella siempre con la hora legal
/// del país de origen del organismo (Colombia · UTC-5).
const TZ_CO = "America/Bogota";

/**
 * Generador del informe profesional "Hoja de Vida del Candidato" en PDF.
 *
 * Estructura:
 *   1. Portada con marca del organismo (logo) y datos del titular.
 *   2. Datos personales y de contacto.
 *   3. Inscripciones, resultados de exámenes y estado del proceso.
 *   4. Pagos con su estado, referencia y soporte (si existe).
 *   5. Anexo: documentos del candidato — los PDF se concatenan al final
 *      con un separador por cada uno, y las imágenes (PNG/JPG) se
 *      embeben como página de tamaño A4.
 *
 * Implementación con pdf-lib (puro JS, sin nativos): compatible con
 * Vercel/Edge. Para archivos faltantes en storage se inserta una página
 * de "archivo no disponible" y se continúa.
 */

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 50;

const COLOR_NAVY = rgb(0.043, 0.114, 0.267);  // #0b1d44 — solo para texto
const COLOR_GOLD = rgb(0.784, 0.604, 0.208);  // #c89a35
const COLOR_GREY = rgb(0.40, 0.45, 0.52);
const COLOR_DARK = rgb(0.06, 0.09, 0.16);
const COLOR_LIGHT_BG = rgb(0.95, 0.97, 1);
const COLOR_RULE = rgb(0.85, 0.88, 0.94);
const COLOR_HEADER_BG = rgb(0.992, 0.984, 0.957); // #fdfbf4 crema MUY claro
const COLOR_HEADER_LINE = rgb(0.784, 0.604, 0.208); // dorada
const COLOR_AMBER = rgb(0.85, 0.50, 0.05);

interface Cursor { page: PDFPage; y: number }

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "long", year: "numeric", timeZone: TZ_CO }).format(d);
}
function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: TZ_CO }).format(d);
}
function fmtDateTimeFull(d: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "full", timeStyle: "long", timeZone: TZ_CO,
  }).format(d);
}
function fmtCOP(n: number | string): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n ?? 0));
}

/// Contexto compartido entre páginas: identifica el informe (token único)
/// para el QR del pie y mantiene el momento de generación constante.
interface ReportCtx {
  reportId: string;            // 32 chars hex (128 bits)
  generatedAt: Date;
  candidateName: string;
  orgShort: string;            // suscriptor
  qrPng: import("pdf-lib").PDFImage | null;  // PNG pre-embebido del QR
  onacBadge: import("pdf-lib").PDFImage | null;
  fonts: Fonts;
}

function newPage(pdf: PDFDocument, ctx?: ReportCtx): PDFPage {
  const p = pdf.addPage([PAGE_W, PAGE_H]);
  if (ctx) drawFooter(p, ctx.fonts, pdf.getPageCount(), ctx);
  return p;
}

function ensureSpace(pdf: PDFDocument, cursor: Cursor, needed: number, fonts: Fonts, ctx?: ReportCtx): Cursor {
  if (cursor.y - needed < MARGIN + 50) {
    const page = newPage(pdf, ctx);
    return { page, y: PAGE_H - MARGIN };
  }
  return cursor;
}

function _drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  opts: { font: PDFFont; size: number; color?: ReturnType<typeof rgb> } & { maxWidth?: number },
): number {
  // Word wrap simple: respeta saltos de línea explícitos y corta por palabra.
  const lines: string[] = [];
  const raw = String(text ?? "").replace(/\r/g, "");
  for (const block of raw.split("\n")) {
    if (!opts.maxWidth) {
      lines.push(block);
      continue;
    }
    let current = "";
    for (const w of block.split(/\s+/)) {
      if (!w) continue;
      const trial = current ? `${current} ${w}` : w;
      const width = opts.font.widthOfTextAtSize(trial, opts.size);
      if (width > opts.maxWidth) {
        if (current) lines.push(current);
        current = w;
      } else {
        current = trial;
      }
    }
    if (current) lines.push(current);
    if (!block) lines.push("");
  }
  let cy = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cy, size: opts.size, font: opts.font, color: opts.color ?? COLOR_DARK });
    cy -= opts.size * 1.3;
  }
  return cy + opts.size * 1.3 - opts.size * 1.3 * lines.length; // not strictly used by callers; return final y consumed
}

/// Encabezado claro y limpio para la portada: fondo crema, franja dorada
/// inferior, logo del suscriptor a la izquierda, título centrado, badge
/// ONAC a la derecha. Mantenido en tonos claros para que se vea
/// correctamente cualquier logotipo (incluido el de RISKS, que es oscuro).
function drawHeader(
  page: PDFPage,
  fonts: Fonts,
  opts: { orgName: string; subscriberLogoImg: import("pdf-lib").PDFImage | null; title: string; subtitle?: string },
): void {
  const headerH = 110;
  page.drawRectangle({ x: 0, y: PAGE_H - headerH, width: PAGE_W, height: headerH, color: COLOR_HEADER_BG });
  page.drawRectangle({ x: 0, y: PAGE_H - headerH - 3, width: PAGE_W, height: 3, color: COLOR_HEADER_LINE });

  // Logo del suscriptor (izquierda)
  let leftCursor = MARGIN;
  if (opts.subscriberLogoImg) {
    const W = 84;
    const H = Math.min(70, (opts.subscriberLogoImg.height / opts.subscriberLogoImg.width) * W);
    page.drawImage(opts.subscriberLogoImg, { x: MARGIN, y: PAGE_H - 22 - H, width: W, height: H });
    leftCursor = MARGIN + W + 18;
  }
  // Texto principal
  page.drawText(opts.title.toUpperCase(), { x: leftCursor, y: PAGE_H - 50, size: 18, font: fonts.bold, color: COLOR_NAVY });
  page.drawText(opts.orgName, { x: leftCursor, y: PAGE_H - 68, size: 10, font: fonts.bold, color: COLOR_GOLD });
  if (opts.subtitle) {
    page.drawText(opts.subtitle, { x: leftCursor, y: PAGE_H - 82, size: 8.5, font: fonts.italic, color: COLOR_GREY });
  }

  // Badge ONAC a la derecha
  drawOnacBadge(page, fonts, { x: PAGE_W - MARGIN - 150, y: PAGE_H - 90, w: 150, h: 70 });
}

/// Badge ONAC dibujado con primitivas (sin SVG): círculo azul + media luna
/// turquesa que evoca el logo + leyenda "EN PROCESO DE ACREDITACIÓN ONAC".
/// Hecho con primitivas para garantizar nitidez en cualquier resolución y
/// no depender de assets en runtime.
function drawOnacBadge(
  page: PDFPage,
  fonts: Fonts,
  box: { x: number; y: number; w: number; h: number },
): void {
  page.drawRectangle({
    x: box.x, y: box.y, width: box.w, height: box.h,
    color: rgb(1, 1, 1),
    borderColor: COLOR_AMBER, borderWidth: 1,
  });
  // Círculo azul ONAC con anillo turquesa (estilizado)
  const cx = box.x + 22, cy = box.y + box.h / 2, r = 14;
  page.drawCircle({ x: cx, y: cy, size: r, color: rgb(1, 1, 1), borderColor: rgb(0.07, 0.39, 0.69), borderWidth: 3 });
  page.drawCircle({ x: cx + 6, y: cy + 2, size: r * 0.65, color: rgb(0.07, 0.69, 0.68) });
  page.drawCircle({ x: cx + 6, y: cy + 2, size: r * 0.50, color: rgb(1, 1, 1) });
  page.drawText("ONAC", { x: cx - 11, y: cy - 3, size: 7, font: fonts.bold, color: rgb(0.07, 0.39, 0.69) });

  // Leyenda
  const tx = box.x + 44;
  page.drawText("EN PROCESO DE", { x: tx, y: box.y + box.h - 18, size: 8, font: fonts.bold, color: COLOR_AMBER });
  page.drawText("ACREDITACIÓN", { x: tx, y: box.y + box.h - 28, size: 8, font: fonts.bold, color: COLOR_AMBER });
  page.drawRectangle({ x: tx, y: box.y + 22, width: box.w - 48, height: 1, color: COLOR_AMBER });
  page.drawText("ORGANISMO NACIONAL DE", { x: tx, y: box.y + 13, size: 5, font: fonts.bold, color: COLOR_GREY });
  page.drawText("ACREDITACIÓN DE COLOMBIA", { x: tx, y: box.y + 6, size: 5, font: fonts.bold, color: COLOR_GREY });
}

function sectionTitle(cursor: Cursor, title: string, fonts: Fonts): Cursor {
  cursor.page.drawRectangle({ x: MARGIN, y: cursor.y - 18, width: PAGE_W - MARGIN * 2, height: 22, color: COLOR_LIGHT_BG });
  cursor.page.drawRectangle({ x: MARGIN, y: cursor.y - 18, width: 4, height: 22, color: COLOR_NAVY });
  cursor.page.drawText(title.toUpperCase(), { x: MARGIN + 10, y: cursor.y - 12, size: 10, font: fonts.bold, color: COLOR_NAVY });
  return { page: cursor.page, y: cursor.y - 30 };
}

function _rule(cursor: Cursor): Cursor {
  cursor.page.drawLine({
    start: { x: MARGIN, y: cursor.y },
    end:   { x: PAGE_W - MARGIN, y: cursor.y },
    thickness: 0.5,
    color: COLOR_RULE,
  });
  return { page: cursor.page, y: cursor.y - 8 };
}

function row(cursor: Cursor, label: string, value: string, fonts: Fonts): Cursor {
  const labelW = 140;
  cursor.page.drawText(label, { x: MARGIN, y: cursor.y, size: 9, font: fonts.bold, color: COLOR_GREY });
  // Word-wrap del valor con maxWidth
  const lines: string[] = [];
  const max = PAGE_W - MARGIN * 2 - labelW;
  let current = "";
  for (const w of String(value ?? "—").split(/\s+/)) {
    if (!w) continue;
    const trial = current ? `${current} ${w}` : w;
    if (fonts.regular.widthOfTextAtSize(trial, 10) > max) {
      if (current) lines.push(current);
      current = w;
    } else current = trial;
  }
  if (current) lines.push(current);
  if (!lines.length) lines.push("—");
  let cy = cursor.y;
  for (const ln of lines) {
    cursor.page.drawText(ln, { x: MARGIN + labelW, y: cy, size: 10, font: fonts.regular, color: COLOR_DARK });
    cy -= 13;
  }
  return { page: cursor.page, y: Math.min(cursor.y - 13, cy) };
}

/// Pie de página unificado: QR del informe a la izquierda, identificación
/// del candidato + sello de seguridad al centro y paginación a la derecha.
/// Toda fecha incluye explícitamente "Hora legal colombiana" + UTC-5 para
/// dejar claro el sello temporal del documento de certificación.
function drawFooter(page: PDFPage, fonts: Fonts, pageIdx: number, ctx: ReportCtx): void {
  const footerY = 60;
  // Franja dorada superior + línea sutil
  page.drawRectangle({ x: 0, y: footerY, width: PAGE_W, height: 2, color: COLOR_HEADER_LINE });
  page.drawLine({ start: { x: MARGIN, y: footerY - 8 }, end: { x: PAGE_W - MARGIN, y: footerY - 8 }, thickness: 0.4, color: COLOR_RULE });

  // QR pequeño esquina inferior izquierda
  if (ctx.qrPng) {
    page.drawImage(ctx.qrPng, { x: MARGIN, y: 12, width: 38, height: 38 });
  }

  // Bloque de identificación del informe (centro-izquierda)
  const tx = MARGIN + 48;
  page.drawText("HOJA DE VIDA DEL CANDIDATO · CIOC", { x: tx, y: 46, size: 7, font: fonts.bold, color: COLOR_NAVY });
  page.drawText(`Titular: ${ctx.candidateName} · Organismo: ${ctx.orgShort}`, {
    x: tx, y: 36, size: 6.5, font: fonts.regular, color: COLOR_DARK,
  });
  page.drawText(`Sellado: ${fmtDateTime(ctx.generatedAt)} · Hora legal colombiana (UTC-5) · Ref ${ctx.reportId.slice(0, 8).toUpperCase()}-${ctx.reportId.slice(-4).toUpperCase()}`, {
    x: tx, y: 26, size: 6.5, font: fonts.italic, color: COLOR_GREY,
  });
  page.drawText("Documento confidencial. Verifique autenticidad escaneando el QR.", {
    x: tx, y: 16, size: 6, font: fonts.italic, color: COLOR_GREY,
  });

  // Paginación a la derecha
  page.drawText(`Pág. ${pageIdx}`, {
    x: PAGE_W - MARGIN - 30, y: 36, size: 8, font: fonts.bold, color: COLOR_NAVY,
  });
}

/// Punto de entrada principal: devuelve los bytes del PDF.
export async function buildCandidateCV(
  candidateId: string,
  subscriberId: string,
): Promise<{ bytes: Uint8Array; reportId: string }> {
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, subscriberId },
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: {
          exam: { select: { name: true, passingScore: true } },
          scheme: { select: { name: true, code: true, scope: true, normReference: true, validityMonths: true } },
          documents: {
            include: { requiredDocument: { select: { name: true, description: true, code: true } } },
            orderBy: { uploadedAt: "asc" },
          },
          payments: { orderBy: { createdAt: "desc" } },
          attempts: {
            orderBy: { attemptNumber: "desc" },
            select: {
              id: true, attemptNumber: true, status: true, scorePercent: true, passed: true,
              submittedAt: true, startedAt: true,
            },
          },
          bookings: { where: { status: { in: ["BOOKED", "CONFIRMED"] } }, include: { session: { select: { startsAt: true, location: true, modality: true } } } },
        },
      },
      consents: { orderBy: { acceptedAt: "desc" }, take: 5 },
      certificates: { orderBy: { issuedAt: "desc" }, include: { scheme: { select: { name: true } } } },
      user: {
        select: {
          id: true, email: true, lastLoginAt: true, lastLoginIp: true,
          status: true, additionalEmails: true, createdAt: true,
        },
      },
    },
  });
  if (!candidate) throw new Error("Candidato no encontrado");

  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { tradeName: true, legalName: true, logoUrl: true, contactEmail: true, contactPhone: true, address: true, taxId: true },
  });
  const orgName = subscriber?.tradeName ?? subscriber?.legalName ?? "Organismo Certificador";

  // Foto: tomamos el primer documento que sea "fotografía/foto/photo" y sea
  // imagen. (El modelo Candidate no tiene un campo de foto dedicado.)
  const photoDoc = candidate.enrollments.flatMap((e) => e.documents).find((d) => /(foto|photo|fotograf)/i.test(d.requiredDocument?.name ?? "") && /\.(png|jpe?g)$/i.test(d.fileName ?? ""));
  const photoKey = photoDoc?.fileUrl ?? null;

  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold:    await pdf.embedFont(StandardFonts.HelveticaBold),
    italic:  await pdf.embedFont(StandardFonts.HelveticaOblique),
  };

  // ─── Pre-construcción del contexto del informe (QR + reportId) ───
  // El reportId es un token aleatorio que identifica este informe en
  // particular; queda en el pie como referencia y va al QR. El QR
  // codifica una URL de verificación pública del informe.
  const reportId = randomBytes(16).toString("hex");
  const generatedAt = new Date();
  let qrPng: import("pdf-lib").PDFImage | null = null;
  try {
    const verifyUrl = `${appBaseUrl()}/verificar/informe/${reportId}`;
    const dataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200, errorCorrectionLevel: "M" });
    const base64 = dataUrl.split(",")[1];
    if (base64) qrPng = await pdf.embedPng(Buffer.from(base64, "base64"));
  } catch { /* ignore */ }

  // Logo del suscriptor: si existe lo pre-embebemos para usar tanto en
  // portada como en el encabezado.
  let subscriberLogoImg: import("pdf-lib").PDFImage | null = null;
  if (subscriber?.logoUrl) {
    try {
      const key = subscriber.logoUrl.startsWith("/api/brand/") ? subscriber.logoUrl.replace("/api/brand/", "") : null;
      if (key) {
        const bytes = await readFileByKey(key);
        const ext = extFromName(key);
        subscriberLogoImg = ext === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      }
    } catch { /* ignore */ }
  }

  const ctx: ReportCtx = {
    reportId,
    generatedAt,
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    orgShort: orgName,
    qrPng,
    onacBadge: null,
    fonts,
  };

  // ── PORTADA ────────────────────────────────────────────────────────
  const cover = newPage(pdf, ctx);
  drawHeader(cover, fonts, {
    orgName,
    subscriberLogoImg,
    title: "Hoja de Vida del Candidato",
    subtitle: `Generada ${fmtDateTimeFull(generatedAt)} · Ref. ${reportId.slice(0, 8).toUpperCase()}-${reportId.slice(-4).toUpperCase()}`,
  });

  // Tarjeta principal con foto y nombre
  const cardY = PAGE_H - 280;
  cover.drawRectangle({ x: MARGIN, y: cardY, width: PAGE_W - MARGIN * 2, height: 140, color: COLOR_LIGHT_BG });

  // Foto del candidato (cuadrada, 110x110)
  let photoEmbedded = false;
  if (photoKey) {
    try {
      const bytes = await readFileByKey(photoKey);
      const ext = extFromName(photoKey);
      const img = ext === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      cover.drawImage(img, { x: MARGIN + 15, y: cardY + 15, width: 110, height: 110 });
      photoEmbedded = true;
    } catch { /* ignore */ }
  }
  if (!photoEmbedded) {
    cover.drawRectangle({ x: MARGIN + 15, y: cardY + 15, width: 110, height: 110, color: rgb(0.88, 0.91, 0.96) });
    cover.drawText("SIN FOTO", { x: MARGIN + 40, y: cardY + 65, size: 9, font: fonts.bold, color: COLOR_GREY });
  }

  cover.drawText(`${candidate.firstName} ${candidate.lastName}`, {
    x: MARGIN + 145, y: cardY + 105, size: 18, font: fonts.bold, color: COLOR_NAVY,
  });
  cover.drawText(`${candidate.documentType ?? "CC"} ${candidate.documentNumber ?? "—"}`, {
    x: MARGIN + 145, y: cardY + 85, size: 10, font: fonts.regular, color: COLOR_DARK,
  });
  cover.drawText(candidate.email, {
    x: MARGIN + 145, y: cardY + 70, size: 9, font: fonts.regular, color: COLOR_DARK,
  });
  if (candidate.phone) {
    cover.drawText(candidate.phone, { x: MARGIN + 145, y: cardY + 55, size: 9, font: fonts.regular, color: COLOR_DARK });
  }
  cover.drawText(`Registrado el ${fmtDate(candidate.createdAt)}`, {
    x: MARGIN + 145, y: cardY + 35, size: 8, font: fonts.italic, color: COLOR_GREY,
  });
  cover.drawText(`Inscripciones: ${candidate.enrollments.length}`, {
    x: MARGIN + 145, y: cardY + 20, size: 9, font: fonts.bold, color: COLOR_DARK,
  });

  // Tabla resumen al pie de la portada
  let cursor: Cursor = { page: cover, y: cardY - 30 };
  cursor = sectionTitle(cursor, "Resumen", fonts);
  const totalCerts = candidate.enrollments.filter((e) => e.status === "CERTIFIED").length;
  const totalAttempts = candidate.enrollments.reduce((s, e) => s + e.attempts.length, 0);
  const totalPaid = candidate.enrollments
    .flatMap((e) => e.payments)
    .filter((p) => p.status === "APPROVED")
    .reduce((s, p) => s + Number(p.amount.toString()), 0);
  cursor = row(cursor, "Certificados emitidos", String(totalCerts), fonts);
  cursor = row(cursor, "Pruebas presentadas", String(totalAttempts), fonts);
  cursor = row(cursor, "Total pagado (aprobado)", fmtCOP(totalPaid), fonts);
  cursor = row(cursor, "Estado de la cuenta", candidate.user?.status ?? "—", fonts);
  cursor = row(cursor, "Último ingreso", fmtDateTime(candidate.user?.lastLoginAt ?? null), fonts);

  // ── PÁGINA 2: DATOS PERSONALES ─────────────────────────────────────
  const dataPage = newPage(pdf, ctx);
  cursor = { page: dataPage, y: PAGE_H - MARGIN };
  cursor = sectionTitle(cursor, "Datos personales y de contacto", fonts);
  cursor = row(cursor, "Nombres", candidate.firstName, fonts);
  cursor = row(cursor, "Apellidos", candidate.lastName, fonts);
  cursor = row(cursor, "Tipo de documento", candidate.documentType ?? "—", fonts);
  cursor = row(cursor, "Número de documento", candidate.documentNumber ?? "—", fonts);
  cursor = row(cursor, "Fecha de nacimiento", fmtDate(candidate.birthDate), fonts);
  cursor = row(cursor, "País", candidate.country ?? "—", fonts);
  cursor = row(cursor, "Ciudad", candidate.city ?? "—", fonts);
  cursor = row(cursor, "Dirección", candidate.address ?? "—", fonts);
  cursor = row(cursor, "Correo principal", candidate.user?.email ?? candidate.email, fonts);
  if (candidate.user?.additionalEmails?.length) {
    cursor = row(cursor, "Correos alternos", candidate.user.additionalEmails.join(", "), fonts);
  }
  cursor = row(cursor, "Teléfono", candidate.phone ?? "—", fonts);

  // ── 3. DATOS DE CONOCIMIENTO (esquemas + alcance + norma) ──────────
  cursor.y -= 8;
  cursor = ensureSpace(pdf, cursor, 80, fonts, ctx);
  cursor = sectionTitle(cursor, "Datos de conocimiento — esquemas de certificación", fonts);
  // Esquemas únicos a los que el candidato se ha inscrito
  const schemes = new Map<string, { name: string; code: string; scope: string | null; norm: string | null; validity: number | null }>();
  for (const e of candidate.enrollments) {
    if (e.scheme && !schemes.has(e.scheme.code)) {
      schemes.set(e.scheme.code, {
        name: e.scheme.name,
        code: e.scheme.code,
        scope: e.scheme.scope ?? null,
        norm: e.scheme.normReference ?? null,
        validity: e.scheme.validityMonths ?? null,
      });
    }
  }
  if (schemes.size === 0) {
    cursor = row(cursor, "Sin esquemas inscritos", "—", fonts);
  } else {
    for (const s of schemes.values()) {
      cursor = ensureSpace(pdf, cursor, 56, fonts, ctx);
      cursor.page.drawText(`${s.code} — ${s.name}`, { x: MARGIN, y: cursor.y, size: 10, font: fonts.bold, color: COLOR_NAVY });
      cursor.y -= 13;
      if (s.scope) cursor = row(cursor, "Alcance", s.scope, fonts);
      if (s.norm) cursor = row(cursor, "Norma de referencia", s.norm, fonts);
      if (s.validity) cursor = row(cursor, "Vigencia del certificado", `${s.validity} meses`, fonts);
      cursor.y -= 4;
    }
  }

  // ── 4. FORMACIÓN ACADÉMICA, 5. ANTECEDENTES, 6. HISTORIAL LABORAL ─
  // Categorizamos los documentos del candidato por el nombre del
  // RequiredDocument para presentar tres secciones temáticas. Los
  // archivos físicos se mantienen como ANEXOS al final del informe.
  const allDocs = candidate.enrollments.flatMap((e) => e.documents.map((d) => ({ ...d, enrollment: e })));

  function matchAny(text: string, patterns: RegExp[]): boolean {
    return patterns.some((p) => p.test(text));
  }
  const RE_FORMACION = [/(formac|académic|academic|diploma|t[ií]tulo|estudios?|escolar|escolaridad|grado|posgrado|pregrado|maestr|doctorad|t[eé]cnic|tecn[oó]logo|bachiller|certificad[oa] educ)/i];
  const RE_ANTECEDENTES = [/(antecedent|judicial|disciplinari|penal|procuradur|contralor|polic[ií]a|inhabilit|rama judicial|sric)/i];
  const RE_LABORAL = [/(experiencia|laboral|hoja de vida|hv|cv|cert\.?\s*laboral|certificac[ií]on(es)?\s*laboral|trabajo|emple|cargo|funci[oó]n)/i];

  const docsFormacion: typeof allDocs = [];
  const docsAnte: typeof allDocs = [];
  const docsLaboral: typeof allDocs = [];
  const docsOtros: typeof allDocs = [];
  for (const d of allDocs) {
    const name = `${d.requiredDocument?.name ?? ""} ${d.requiredDocument?.description ?? ""} ${d.fileName ?? ""}`;
    if (matchAny(name, RE_FORMACION)) docsFormacion.push(d);
    else if (matchAny(name, RE_ANTECEDENTES)) docsAnte.push(d);
    else if (matchAny(name, RE_LABORAL)) docsLaboral.push(d);
    else docsOtros.push(d);
  }

  function listDocs(cursorRef: Cursor, list: typeof allDocs, emptyMsg: string): Cursor {
    let c = cursorRef;
    if (list.length === 0) {
      c.page.drawText(emptyMsg, { x: MARGIN, y: c.y, size: 9, font: fonts.italic, color: COLOR_GREY });
      c.y -= 14;
      return c;
    }
    for (const d of list) {
      c = ensureSpace(pdf, c, 24, fonts);
      const statusLabel: Record<string, string> = { SUBMITTED: "en revisión", APPROVED: "aprobado", REJECTED: "rechazado", PENDING: "pendiente" };
      c.page.drawText(`• ${d.requiredDocument?.name ?? "Documento"}`, {
        x: MARGIN, y: c.y, size: 10, font: fonts.bold, color: COLOR_DARK,
      });
      c.y -= 12;
      c.page.drawText(`   Archivo: ${d.fileName ?? ""} · ${statusLabel[d.status] ?? d.status} · ${fmtDate(d.uploadedAt)}`, {
        x: MARGIN, y: c.y, size: 8, font: fonts.italic, color: COLOR_GREY,
      });
      c.y -= 12;
      if (d.requiredDocument?.description) {
        c.page.drawText(`   ${d.requiredDocument.description}`, { x: MARGIN, y: c.y, size: 8, font: fonts.regular, color: COLOR_DARK });
        c.y -= 12;
      }
    }
    return c;
  }

  cursor.y -= 4;
  cursor = ensureSpace(pdf, cursor, 60, fonts, ctx);
  cursor = sectionTitle(cursor, "Formación académica", fonts);
  cursor.page.drawText("Los siguientes documentos académicos fueron aportados por el candidato. El detalle completo se incluye como anexo al final de este informe.",
    { x: MARGIN, y: cursor.y, size: 8, font: fonts.italic, color: COLOR_GREY });
  cursor.y -= 14;
  cursor = listDocs(cursor, docsFormacion, "Sin documentos académicos cargados todavía.");

  cursor.y -= 6;
  cursor = ensureSpace(pdf, cursor, 60, fonts, ctx);
  cursor = sectionTitle(cursor, "Antecedentes disciplinarios, judiciales y penales", fonts);
  cursor.page.drawText("Certificados expedidos por las autoridades de control. Verifíquense por sus canales oficiales antes de la emisión final.",
    { x: MARGIN, y: cursor.y, size: 8, font: fonts.italic, color: COLOR_GREY });
  cursor.y -= 14;
  cursor = listDocs(cursor, docsAnte, "Sin certificados de antecedentes cargados todavía.");

  cursor.y -= 6;
  cursor = ensureSpace(pdf, cursor, 60, fonts, ctx);
  cursor = sectionTitle(cursor, "Historial laboral y experiencia", fonts);
  cursor.page.drawText("Documentos que evidencian la experiencia y trayectoria laboral del candidato.",
    { x: MARGIN, y: cursor.y, size: 8, font: fonts.italic, color: COLOR_GREY });
  cursor.y -= 14;
  cursor = listDocs(cursor, docsLaboral, "Sin documentos de experiencia laboral cargados todavía.");

  if (docsOtros.length > 0) {
    cursor.y -= 6;
    cursor = ensureSpace(pdf, cursor, 50, fonts, ctx);
    cursor = sectionTitle(cursor, "Otros documentos del proceso", fonts);
    cursor = listDocs(cursor, docsOtros, "—");
  }

  // ── 7. EVALUACIONES PRESENTADAS + VIGENCIA + INTENTOS ──────────────
  cursor.y -= 6;
  cursor = ensureSpace(pdf, cursor, 80, fonts, ctx);
  cursor = sectionTitle(cursor, "Evaluaciones presentadas — resultados, vigencia e intentos", fonts);
  if (candidate.enrollments.length === 0) {
    cursor = row(cursor, "Sin inscripciones", "—", fonts);
  } else {
    for (const e of candidate.enrollments) {
      cursor = ensureSpace(pdf, cursor, 110, fonts, ctx);
      const title = e.exam?.name ?? e.scheme?.name ?? "Inscripción";
      const cert = candidate.certificates.find((c) => c.enrollmentId === e.id);
      cursor.page.drawRectangle({ x: MARGIN, y: cursor.y - 6, width: PAGE_W - MARGIN * 2, height: 1, color: COLOR_RULE });
      cursor.page.drawText(title, { x: MARGIN, y: cursor.y - 16, size: 11, font: fonts.bold, color: COLOR_NAVY });
      cursor.page.drawText(`Folio ${e.code ?? "—"} · Estado de la inscripción: ${e.status} · ${fmtDate(e.createdAt)}`, {
        x: MARGIN, y: cursor.y - 30, size: 8, font: fonts.italic, color: COLOR_GREY,
      });
      cursor.y -= 42;

      // Intentos
      if (e.attempts.length === 0) {
        cursor.page.drawText("Estado: EVALUACIÓN PENDIENTE — el candidato aún no ha presentado esta prueba.",
          { x: MARGIN + 10, y: cursor.y, size: 9, font: fonts.bold, color: rgb(0.73, 0.43, 0.05) });
        cursor.y -= 14;
      } else {
        cursor.page.drawText(`Intentos realizados: ${e.attempts.length}`, {
          x: MARGIN + 10, y: cursor.y, size: 9, font: fonts.bold, color: COLOR_DARK,
        });
        cursor.y -= 13;
        for (const a of e.attempts) {
          cursor = ensureSpace(pdf, cursor, 18, fonts, ctx);
          const score = a.scorePercent != null ? `${Number(a.scorePercent).toFixed(1)}%` : "—";
          const verdict = a.passed === true ? "APROBÓ" : a.passed === false ? "NO APROBÓ" : a.status;
          const verdictColor = a.passed === true ? rgb(0.04, 0.55, 0.34) : a.passed === false ? rgb(0.73, 0.13, 0.20) : COLOR_GREY;
          cursor.page.drawText(`#${a.attemptNumber} · Estado: ${a.status} · Puntaje: ${score} · ${verdict}`, {
            x: MARGIN + 16, y: cursor.y, size: 9, font: fonts.regular, color: verdictColor,
          });
          cursor.y -= 12;
          if (a.submittedAt) {
            cursor.page.drawText(`   Presentado: ${fmtDateTime(a.submittedAt)}`, { x: MARGIN + 16, y: cursor.y, size: 8, font: fonts.italic, color: COLOR_GREY });
            cursor.y -= 11;
          }
        }
      }

      // Vigencia del certificado emitido (si lo hay)
      if (cert) {
        cursor = ensureSpace(pdf, cursor, 30, fonts, ctx);
        const vigenteHasta = cert.expiresAt ? fmtDate(cert.expiresAt) : "No vence";
        const estado = cert.status;
        const vigColor = estado === "VALID" ? rgb(0.04, 0.55, 0.34) : estado === "EXPIRED" ? rgb(0.73, 0.43, 0.05) : rgb(0.73, 0.13, 0.20);
        cursor.page.drawText(`Certificado: ${cert.code}`, { x: MARGIN + 10, y: cursor.y, size: 9, font: fonts.bold, color: COLOR_NAVY });
        cursor.y -= 12;
        cursor.page.drawText(`Estado: ${estado} · Emitido: ${fmtDate(cert.issuedAt)} · Vigente hasta: ${vigenteHasta}`, {
          x: MARGIN + 10, y: cursor.y, size: 9, font: fonts.regular, color: vigColor,
        });
        cursor.y -= 12;
      } else if (e.attempts.some((a) => a.passed === true)) {
        cursor.page.drawText("Certificado: pendiente de emisión.", { x: MARGIN + 10, y: cursor.y, size: 9, font: fonts.italic, color: COLOR_GREY });
        cursor.y -= 12;
      }

      // Agenda
      if (e.bookings.length > 0) {
        for (const b of e.bookings) {
          cursor = ensureSpace(pdf, cursor, 14, fonts, ctx);
          cursor.page.drawText(`Agenda: ${fmtDateTime(b.session.startsAt)} · ${b.session.modality ?? ""} · ${b.session.location ?? ""}`,
            { x: MARGIN + 10, y: cursor.y, size: 9, font: fonts.regular, color: COLOR_DARK });
          cursor.y -= 12;
        }
      }
      cursor.y -= 6;
    }
  }

  // ── 8. SOPORTES DE PAGO ─────────────────────────────────────────────
  cursor = ensureSpace(pdf, cursor, 60, fonts, ctx);
  cursor = sectionTitle(cursor, "Soportes de pago", fonts);
  const allPayments = candidate.enrollments.flatMap((e) => e.payments.map((p) => ({ ...p, enrollment: e })));
  if (allPayments.length === 0) {
    cursor = row(cursor, "Sin pagos", "—", fonts);
  } else {
    for (const p of allPayments) {
      cursor = ensureSpace(pdf, cursor, 60, fonts, ctx);
      const meta = (p.metadata as { rapyd?: { checkoutId?: string; type?: string }; receipt?: { fileName?: string; note?: string | null } } | null) ?? {};
      cursor.page.drawText(`${p.status} · ${p.provider ?? "manual"} · ${fmtCOP(Number(p.amount.toString()))}`, {
        x: MARGIN, y: cursor.y, size: 10, font: fonts.bold, color: p.status === "APPROVED" ? rgb(0.04, 0.55, 0.34) : p.status === "REJECTED" ? rgb(0.73, 0.13, 0.20) : COLOR_NAVY,
      });
      cursor.y -= 13;
      cursor.page.drawText(`Folio ${p.enrollment.code ?? "—"} · Creado ${fmtDate(p.createdAt)} · ${p.paidAt ? `Pagado ${fmtDate(p.paidAt)}` : "Sin fecha de pago"}`, {
        x: MARGIN, y: cursor.y, size: 8, font: fonts.italic, color: COLOR_GREY,
      });
      cursor.y -= 12;
      cursor.page.drawText(`Ref. ${p.providerRef ?? "—"}${meta.rapyd?.checkoutId ? ` · Checkout ${meta.rapyd.checkoutId}` : ""}`, {
        x: MARGIN, y: cursor.y, size: 8, font: fonts.regular, color: COLOR_DARK,
      });
      cursor.y -= 12;
      if (meta.receipt?.fileName || p.receiptUrl) {
        cursor.page.drawText(`Soporte: ${meta.receipt?.fileName ?? "comprobante"}`, {
          x: MARGIN, y: cursor.y, size: 8, font: fonts.regular, color: COLOR_DARK,
        });
        cursor.y -= 12;
      }
      cursor.y -= 4;
    }
  }

  // ── 9. SOPORTES DOCUMENTALES (lista consolidada) ───────────────────
  cursor = ensureSpace(pdf, cursor, 60, fonts, ctx);
  cursor = sectionTitle(cursor, "Soportes documentales del proceso", fonts);
  if (allDocs.length === 0) {
    cursor = row(cursor, "Sin documentos", "El candidato aún no ha cargado documentos.", fonts);
  } else {
    cursor.page.drawText("Listado consolidado de los archivos cargados por el candidato. Los archivos completos se anexan al final de este informe.",
      { x: MARGIN, y: cursor.y, size: 8, font: fonts.italic, color: COLOR_GREY });
    cursor.y -= 14;
    for (const d of allDocs) {
      cursor = ensureSpace(pdf, cursor, 16, fonts, ctx);
      const statusLabel: Record<string, string> = { SUBMITTED: "en revisión", APPROVED: "aprobado", REJECTED: "rechazado", PENDING: "pendiente" };
      cursor.page.drawText(
        `• ${d.requiredDocument?.name ?? "Documento"} — ${d.fileName ?? ""} (${statusLabel[d.status] ?? d.status})`,
        { x: MARGIN, y: cursor.y, size: 9, font: fonts.regular, color: COLOR_DARK },
      );
      cursor.y -= 12;
    }
  }

  // ── 10. AUTORIZACIONES (TRATAMIENTO DE DATOS + TÉRMINOS) ───────────
  cursor.y -= 6;
  cursor = ensureSpace(pdf, cursor, 80, fonts, ctx);
  cursor = sectionTitle(cursor, "Autorizaciones y aceptaciones del candidato", fonts);

  // 10.a Tratamiento de datos
  cursor.page.drawText("a) Autorización de tratamiento de datos personales (Ley 1581 de 2012)", {
    x: MARGIN, y: cursor.y, size: 9, font: fonts.bold, color: COLOR_NAVY,
  });
  cursor.y -= 14;
  if (candidate.consents.length === 0) {
    cursor.page.drawText("Sin registro de aceptación. Verifique el proceso del candidato.", {
      x: MARGIN, y: cursor.y, size: 9, font: fonts.italic, color: rgb(0.73, 0.13, 0.20),
    });
    cursor.y -= 14;
  } else {
    for (const c of candidate.consents) {
      cursor = ensureSpace(pdf, cursor, 40, fonts, ctx);
      cursor.page.drawText(`• Aceptada: ${fmtDateTime(c.acceptedAt)} · IP: ${c.ip ?? "—"}`, {
        x: MARGIN, y: cursor.y, size: 9, font: fonts.regular, color: COLOR_DARK,
      });
      cursor.y -= 12;
      cursor.page.drawText(`  Política versión: ${c.policyVersion ?? "—"} · Titular: ${c.holderName ?? "—"}`, {
        x: MARGIN, y: cursor.y, size: 8, font: fonts.italic, color: COLOR_GREY,
      });
      cursor.y -= 12;
    }
  }

  // 10.b Términos y condiciones del cobro/proceso
  cursor.y -= 6;
  cursor = ensureSpace(pdf, cursor, 60, fonts, ctx);
  cursor.page.drawText("b) Aceptación de términos y condiciones del proceso de certificación", {
    x: MARGIN, y: cursor.y, size: 9, font: fonts.bold, color: COLOR_NAVY,
  });
  cursor.y -= 14;
  const termsPayments = allPayments
    .map((p) => {
      const m = (p.metadata as { terms?: { acceptRefund?: boolean; acceptEconomic?: boolean; acceptedAt?: string } } | null) ?? {};
      return m.terms ? { ...m.terms, payment: p } : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);
  if (termsPayments.length === 0) {
    cursor.page.drawText("Sin registros de aceptación de términos (pagos creados antes de esta política).", {
      x: MARGIN, y: cursor.y, size: 9, font: fonts.italic, color: COLOR_GREY,
    });
    cursor.y -= 14;
  } else {
    for (const t of termsPayments) {
      cursor = ensureSpace(pdf, cursor, 50, fonts, ctx);
      cursor.page.drawText(`• Pago ${t.payment.id.slice(-8).toUpperCase()} · Folio ${t.payment.enrollment.code ?? "—"} · ${fmtDateTime(t.acceptedAt ? new Date(t.acceptedAt) : t.payment.createdAt)}`, {
        x: MARGIN, y: cursor.y, size: 9, font: fonts.regular, color: COLOR_DARK,
      });
      cursor.y -= 12;
      cursor.page.drawText(`  No reembolso (obligación de medio): ${t.acceptRefund ? "ACEPTADO" : "NO"} · Uso para actividad económica/profesión: ${t.acceptEconomic ? "ACEPTADO" : "NO"}`, {
        x: MARGIN, y: cursor.y, size: 8, font: fonts.italic, color: t.acceptRefund && t.acceptEconomic ? rgb(0.04, 0.55, 0.34) : rgb(0.73, 0.43, 0.05),
      });
      cursor.y -= 14;
    }
  }

  // ── ANEXOS: DOCUMENTOS DEL CANDIDATO ───────────────────────────────
  for (const d of allDocs) {
    const docTitle = `${d.requiredDocument?.name ?? "Documento"} · ${d.fileName ?? ""}`;
    const ext = extFromName(d.fileUrl);

    if (ext === "pdf") {
      // Concatenamos el PDF: portada con título + páginas embebidas.
      const sep = newPage(pdf, ctx);
      sep.drawRectangle({ x: 0, y: PAGE_H - 70, width: PAGE_W, height: 70, color: COLOR_NAVY });
      sep.drawText("ANEXO", { x: MARGIN, y: PAGE_H - 30, size: 9, font: fonts.bold, color: COLOR_GOLD });
      sep.drawText(d.requiredDocument?.name ?? "Documento", { x: MARGIN, y: PAGE_H - 50, size: 16, font: fonts.bold, color: rgb(1, 1, 1) });
      sep.drawText(`Archivo: ${d.fileName ?? ""}`, { x: MARGIN, y: PAGE_H - 90, size: 9, font: fonts.italic, color: COLOR_GREY });
      sep.drawText(`Inscripción: ${d.enrollment.code ?? d.enrollment.id}`, { x: MARGIN, y: PAGE_H - 105, size: 9, font: fonts.regular, color: COLOR_DARK });
      sep.drawText(`Estado: ${d.status}`, { x: MARGIN, y: PAGE_H - 120, size: 9, font: fonts.regular, color: COLOR_DARK });
      try {
        const bytes = await readFileByKey(d.fileUrl);
        const src = await PDFDocument.load(bytes);
        const indices = src.getPageIndices();
        const copied = await pdf.copyPages(src, indices);
        for (const pg of copied) pdf.addPage(pg);
      } catch {
        const errPage = newPage(pdf, ctx);
        errPage.drawText("Archivo no disponible en el almacenamiento.", { x: MARGIN, y: PAGE_H / 2, size: 12, font: fonts.italic, color: rgb(0.73, 0.13, 0.20) });
      }
    } else if (ext === "png" || ext === "jpg" || ext === "jpeg") {
      // Embebemos la imagen ajustada al área útil de la página
      const imgPage = newPage(pdf, ctx);
      imgPage.drawText("ANEXO", { x: MARGIN, y: PAGE_H - 30, size: 9, font: fonts.bold, color: COLOR_GOLD });
      imgPage.drawText(d.requiredDocument?.name ?? "Documento", { x: MARGIN, y: PAGE_H - 50, size: 14, font: fonts.bold, color: COLOR_NAVY });
      imgPage.drawText(docTitle, { x: MARGIN, y: PAGE_H - 65, size: 8, font: fonts.italic, color: COLOR_GREY });
      try {
        const bytes = await readFileByKey(d.fileUrl);
        const img = ext === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const avW = PAGE_W - MARGIN * 2;
        const avH = PAGE_H - 100 - MARGIN;
        const scale = Math.min(avW / img.width, avH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        imgPage.drawImage(img, { x: (PAGE_W - w) / 2, y: MARGIN + (avH - h) / 2, width: w, height: h });
      } catch {
        imgPage.drawText("Archivo no disponible.", { x: MARGIN, y: PAGE_H / 2, size: 12, font: fonts.italic, color: rgb(0.73, 0.13, 0.20) });
      }
    }
  }

  // Embebemos también los SOPORTES DE PAGO como anexos.
  for (const p of allPayments) {
    if (!p.receiptUrl) continue;
    const ext = extFromName(p.receiptUrl);
    const sep = newPage(pdf, ctx);
    sep.drawText("ANEXO · SOPORTE DE PAGO", { x: MARGIN, y: PAGE_H - 30, size: 9, font: fonts.bold, color: COLOR_GOLD });
    sep.drawText(`${p.status} · ${fmtCOP(Number(p.amount.toString()))}`, { x: MARGIN, y: PAGE_H - 50, size: 14, font: fonts.bold, color: COLOR_NAVY });
    sep.drawText(`Folio ${p.enrollment.code ?? "—"} · Ref. ${p.providerRef ?? ""}`, { x: MARGIN, y: PAGE_H - 65, size: 9, font: fonts.italic, color: COLOR_GREY });
    try {
      if (ext === "pdf") {
        const bytes = await readFileByKey(p.receiptUrl);
        const src = await PDFDocument.load(bytes);
        const indices = src.getPageIndices();
        const copied = await pdf.copyPages(src, indices);
        for (const pg of copied) pdf.addPage(pg);
      } else if (ext === "png" || ext === "jpg" || ext === "jpeg") {
        const bytes = await readFileByKey(p.receiptUrl);
        const img = ext === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const avW = PAGE_W - MARGIN * 2;
        const avH = PAGE_H - 100 - MARGIN;
        const scale = Math.min(avW / img.width, avH / img.height);
        sep.drawImage(img, { x: (PAGE_W - img.width * scale) / 2, y: MARGIN + (avH - img.height * scale) / 2, width: img.width * scale, height: img.height * scale });
      }
    } catch {
      sep.drawText("Soporte no disponible.", { x: MARGIN, y: PAGE_H / 2, size: 12, font: fonts.italic, color: rgb(0.73, 0.13, 0.20) });
    }
  }

  const bytes = await pdf.save();
  return { bytes, reportId };
}
