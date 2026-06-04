import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { readFileByKey, extFromName } from "@/lib/storage";

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

const COLOR_NAVY = rgb(0.043, 0.114, 0.267);  // #0b1d44
const COLOR_GOLD = rgb(0.784, 0.604, 0.208);  // #c89a35
const COLOR_GREY = rgb(0.40, 0.45, 0.52);
const COLOR_DARK = rgb(0.06, 0.09, 0.16);
const COLOR_LIGHT_BG = rgb(0.95, 0.97, 1);
const COLOR_RULE = rgb(0.85, 0.88, 0.94);

interface Cursor { page: PDFPage; y: number }

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}
function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
function fmtCOP(n: number | string): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n ?? 0));
}

function newPage(pdf: PDFDocument): PDFPage {
  return pdf.addPage([PAGE_W, PAGE_H]);
}

function ensureSpace(pdf: PDFDocument, cursor: Cursor, needed: number, fonts: Fonts): Cursor {
  if (cursor.y - needed < MARGIN + 30) {
    const page = newPage(pdf);
    drawFooter(page, fonts, pdf.getPageCount(), pdf);
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

function drawFooter(page: PDFPage, fonts: Fonts, pageIdx: number, _pdf: PDFDocument): void {
  page.drawLine({ start: { x: MARGIN, y: 40 }, end: { x: PAGE_W - MARGIN, y: 40 }, thickness: 0.4, color: COLOR_RULE });
  page.drawText("Hoja de Vida del Candidato · Documento confidencial generado por la plataforma CIOC", {
    x: MARGIN, y: 28, size: 7, font: fonts.italic, color: COLOR_GREY,
  });
  page.drawText(`Pág. ${pageIdx}`, { x: PAGE_W - MARGIN - 30, y: 28, size: 7, font: fonts.regular, color: COLOR_GREY });
}

/// Punto de entrada principal: devuelve los bytes del PDF.
export async function buildCandidateCV(candidateId: string, subscriberId: string): Promise<Uint8Array> {
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, subscriberId },
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: {
          exam: { select: { name: true, passingScore: true } },
          scheme: { select: { name: true, code: true } },
          documents: { include: { requiredDocument: { select: { name: true } } }, orderBy: { uploadedAt: "asc" } },
          payments: { orderBy: { createdAt: "desc" } },
          attempts: { orderBy: { attemptNumber: "desc" }, select: { id: true, attemptNumber: true, status: true, scorePercent: true, passed: true, submittedAt: true } },
          bookings: { where: { status: { in: ["BOOKED", "CONFIRMED"] } }, include: { session: { select: { startsAt: true, location: true, modality: true } } } },
        },
      },
      consents: { orderBy: { acceptedAt: "desc" }, take: 1 },
      user: { select: { email: true, lastLoginAt: true, status: true, additionalEmails: true } },
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

  // ── PORTADA ────────────────────────────────────────────────────────
  const cover = newPage(pdf);
  drawFooter(cover, fonts, 1, pdf);

  // Cabecera con franja azul
  cover.drawRectangle({ x: 0, y: PAGE_H - 110, width: PAGE_W, height: 110, color: COLOR_NAVY });
  cover.drawText(orgName.toUpperCase(), { x: MARGIN, y: PAGE_H - 50, size: 14, font: fonts.bold, color: rgb(1, 1, 1) });
  cover.drawText("HOJA DE VIDA DEL CANDIDATO", { x: MARGIN, y: PAGE_H - 72, size: 22, font: fonts.bold, color: COLOR_GOLD });
  cover.drawText(`Generada el ${fmtDateTime(new Date())}`, { x: MARGIN, y: PAGE_H - 92, size: 9, font: fonts.italic, color: rgb(1, 1, 1) });

  // Logo del suscriptor (esquina superior derecha) si lo tenemos
  if (subscriber?.logoUrl) {
    try {
      const key = subscriber.logoUrl.startsWith("/api/brand/") ? subscriber.logoUrl.replace("/api/brand/", "") : null;
      if (key) {
        const bytes = await readFileByKey(key);
        const ext = extFromName(key);
        const img = ext === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const W = 90, H = (img.height / img.width) * W;
        cover.drawImage(img, { x: PAGE_W - MARGIN - W, y: PAGE_H - 100, width: W, height: H });
      }
    } catch { /* ignore */ }
  }

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
  const dataPage = newPage(pdf);
  drawFooter(dataPage, fonts, 2, pdf);
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

  if (candidate.consents[0]) {
    cursor.y -= 8;
    cursor = sectionTitle(cursor, "Autorización de tratamiento de datos", fonts);
    cursor = row(cursor, "Aceptada el", fmtDateTime(candidate.consents[0].acceptedAt), fonts);
    cursor = row(cursor, "IP de aceptación", candidate.consents[0].ip ?? "—", fonts);
    cursor = row(cursor, "Versión de política", candidate.consents[0].policyVersion ?? "—", fonts);
  }

  // ── INSCRIPCIONES / RESULTADOS ─────────────────────────────────────
  cursor.y -= 8;
  cursor = ensureSpace(pdf, cursor, 80, fonts);
  cursor = sectionTitle(cursor, "Inscripciones y resultados de pruebas", fonts);
  if (candidate.enrollments.length === 0) {
    cursor = row(cursor, "Sin inscripciones", "Aún no hay inscripciones registradas.", fonts);
  } else {
    for (const e of candidate.enrollments) {
      cursor = ensureSpace(pdf, cursor, 90, fonts);
      const title = e.exam?.name ?? e.scheme?.name ?? "Inscripción";
      cursor.page.drawRectangle({
        x: MARGIN, y: cursor.y - 4, width: PAGE_W - MARGIN * 2, height: 1, color: COLOR_RULE,
      });
      cursor.page.drawText(title, { x: MARGIN, y: cursor.y - 14, size: 11, font: fonts.bold, color: COLOR_NAVY });
      cursor.page.drawText(`Folio ${e.code ?? "—"} · Estado: ${e.status} · Creada ${fmtDate(e.createdAt)}`, {
        x: MARGIN, y: cursor.y - 28, size: 8, font: fonts.italic, color: COLOR_GREY,
      });
      cursor.y -= 40;

      if (e.attempts.length > 0) {
        for (const a of e.attempts) {
          cursor = ensureSpace(pdf, cursor, 18, fonts);
          const r = `Intento #${a.attemptNumber}: ${a.status}${a.scorePercent != null ? ` · ${Number(a.scorePercent).toFixed(1)}%` : ""}${a.passed === true ? " · APROBÓ" : a.passed === false ? " · NO APROBÓ" : ""}${a.submittedAt ? ` · ${fmtDate(a.submittedAt)}` : ""}`;
          cursor.page.drawText(r, { x: MARGIN + 10, y: cursor.y, size: 9, font: fonts.regular, color: COLOR_DARK });
          cursor.y -= 14;
        }
      } else {
        cursor.page.drawText("Sin intentos registrados.", { x: MARGIN + 10, y: cursor.y, size: 9, font: fonts.italic, color: COLOR_GREY });
        cursor.y -= 14;
      }
      if (e.bookings.length > 0) {
        for (const b of e.bookings) {
          cursor = ensureSpace(pdf, cursor, 14, fonts);
          cursor.page.drawText(`Agenda: ${fmtDateTime(b.session.startsAt)} · ${b.session.modality ?? ""} · ${b.session.location ?? ""}`, {
            x: MARGIN + 10, y: cursor.y, size: 9, font: fonts.regular, color: COLOR_DARK,
          });
          cursor.y -= 14;
        }
      }
      cursor.y -= 6;
    }
  }

  // ── PAGOS ──────────────────────────────────────────────────────────
  cursor = ensureSpace(pdf, cursor, 60, fonts);
  cursor = sectionTitle(cursor, "Pagos y soportes", fonts);
  const allPayments = candidate.enrollments.flatMap((e) => e.payments.map((p) => ({ ...p, enrollment: e })));
  if (allPayments.length === 0) {
    cursor = row(cursor, "Sin pagos", "—", fonts);
  } else {
    for (const p of allPayments) {
      cursor = ensureSpace(pdf, cursor, 60, fonts);
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

  // ── ANEXOS: DOCUMENTOS DEL CANDIDATO ───────────────────────────────
  const allDocs = candidate.enrollments.flatMap((e) => e.documents.map((d) => ({ ...d, enrollment: e })));
  for (const d of allDocs) {
    const docTitle = `${d.requiredDocument?.name ?? "Documento"} · ${d.fileName ?? ""}`;
    const ext = extFromName(d.fileUrl);

    if (ext === "pdf") {
      // Concatenamos el PDF: portada con título + páginas embebidas.
      const sep = newPage(pdf);
      drawFooter(sep, fonts, pdf.getPageCount(), pdf);
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
        const errPage = newPage(pdf);
        drawFooter(errPage, fonts, pdf.getPageCount(), pdf);
        errPage.drawText("Archivo no disponible en el almacenamiento.", { x: MARGIN, y: PAGE_H / 2, size: 12, font: fonts.italic, color: rgb(0.73, 0.13, 0.20) });
      }
    } else if (ext === "png" || ext === "jpg" || ext === "jpeg") {
      // Embebemos la imagen ajustada al área útil de la página
      const imgPage = newPage(pdf);
      drawFooter(imgPage, fonts, pdf.getPageCount(), pdf);
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
    const sep = newPage(pdf);
    drawFooter(sep, fonts, pdf.getPageCount(), pdf);
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

  return pdf.save();
}
