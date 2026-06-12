import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createHash } from "node:crypto";
import { safeText } from "@/lib/pdf-text";

/**
 * Genera el PDF de "Autorización de Tratamiento de Datos Personales"
 * firmada por click-wrap del candidato.
 *
 * Estructura del documento (A4, 1 a 3 páginas):
 *  1. Encabezado de marca + título legal.
 *  2. Datos del titular (nombre, documento, correo).
 *  3. Identificación del Responsable del Tratamiento.
 *  4. Evidencia electrónica de la firma (fecha local CO + UTC + IP +
 *     User-Agent + versión de política + hash SHA-256).
 *  5. Texto completo de las 5 declaraciones aceptadas (con ✓).
 *  6. Lista de finalidades autorizadas.
 *  7. Lista de derechos del titular + cómo ejercerlos.
 *  8. Base legal citada.
 *  9. Pie con marca de "Aceptación electrónica click-wrap" + hash.
 *
 * El hash SHA-256 se calcula sobre toda la evidencia normalizada
 * (titular + timestamp + IP + UA + versión + lista de purposes) y
 * actúa como huella de integridad: si alguien altera el PDF, el hash
 * deja de coincidir con el persistido en DataConsent.evidenceHash.
 */

export interface HabeasReceiptInput {
  /** Nombre completo del titular. */
  holderName: string;
  /** Tipo de documento (CC, CE, etc.). */
  documentType: string | null;
  /** Número de documento. */
  documentNumber: string | null;
  /** Correo electrónico del titular. */
  email: string;
  /** Fecha y hora de aceptación (Date — local del server). */
  acceptedAt: Date;
  /** IP desde la que se aceptó. */
  ip: string | null;
  /** User-Agent del navegador del candidato. */
  userAgent: string | null;
  /** Versión de la política aceptada. */
  policyVersion: string;
  /** Datos del Responsable del Tratamiento. */
  responsible: {
    name: string;
    address: string;
    email: string;
    phone: string;
    policyUrl: string;
  };
}

export interface HabeasReceiptResult {
  /** Bytes del PDF listo para guardar/adjuntar. */
  pdfBytes: Uint8Array;
  /** Hash SHA-256 de la evidencia, persistible como prueba. */
  evidenceHash: string;
}

/// Las 5 declaraciones aceptadas en el formulario de registro.
const ACCEPTANCES = [
  {
    n: 1,
    title: "Acepto ser evaluado",
    body:
      "Acepto que el Responsable del Tratamiento utilice mis datos para crear y administrar mi cuenta de candidato, gestionar inscripciones a programas, agendar y calificar evaluaciones de certificación.",
  },
  {
    n: 2,
    title: "Acepto los resultados",
    body:
      "Acepto que el sistema calcule mi puntaje de forma automática y acepto el resultado obtenido al cierre de la evaluación.",
  },
  {
    n: 3,
    title: "Entiendo que mi resultado depende de mis respuestas",
    body:
      "Reconozco que el resultado de la evaluación refleja exclusivamente lo que yo conteste durante la presentación. No habrá modificación de la calificación por causas ajenas a la prueba misma.",
  },
  {
    n: 4,
    title: "Acepto el monitoreo y la confidencialidad",
    body:
      "Acepto que el sistema registre eventos de monitoreo (salida de pantalla, cambio de pestaña, intentos de copia, captura y tiempo por pregunta) y entiendo que las preguntas son confidenciales.",
  },
  {
    n: 5,
    title: "Autorización especial — datos sensibles",
    body:
      "Autorizo de manera libre, expresa e informada el tratamiento de mis datos sensibles (fotografía facial, antecedentes disciplinarios/judiciales/fiscales y eventos antifraude de la presentación) exclusivamente para el proceso de certificación.",
  },
];

const PURPOSES = [
  "Crear y administrar cuenta de candidato",
  "Gestionar inscripción y presentación de evaluaciones",
  "Verificar identidad, antecedentes y documentación",
  "Emitir y publicar certificados verificables",
  "Notificar por correo electrónico, WhatsApp o SMS",
  "Atender solicitudes, quejas y reclamos",
  "Cumplir obligaciones legales y reportes a autoridades de control",
  "Realizar estadísticas internas (datos agregados y disociados)",
];

const RIGHTS = [
  "Conocer, actualizar y rectificar sus datos",
  "Solicitar prueba de la autorización otorgada",
  "Ser informado del uso dado a sus datos",
  "Presentar quejas ante la Superintendencia de Industria y Comercio (SIC)",
  "Revocar la autorización y/o solicitar la supresión del dato",
  "Acceder gratuitamente a sus datos personales tratados",
];

const LEGAL_BASIS = [
  "Constitución Política de Colombia, art. 15 (derecho de habeas data)",
  "Ley 1581 de 2012 — Protección de Datos Personales",
  "Decreto 1377 de 2013 — reglamentación parcial",
];

export async function buildHabeasReceipt(data: HabeasReceiptInput): Promise<HabeasReceiptResult> {
  // Hash de integridad sobre la evidencia normalizada.
  const evidencePayload = JSON.stringify({
    holderName: data.holderName,
    documentType: data.documentType,
    documentNumber: data.documentNumber,
    email: data.email,
    acceptedAt: data.acceptedAt.toISOString(),
    ip: data.ip,
    userAgent: data.userAgent,
    policyVersion: data.policyVersion,
    purposes: PURPOSES,
    acceptances: ACCEPTANCES.map((a) => a.title),
  });
  const evidenceHash = createHash("sha256").update(evidencePayload).digest("hex");

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Autorización de Tratamiento de Datos Personales — ${data.holderName}`);
  pdf.setAuthor(data.responsible.name);
  pdf.setSubject("Habeas Data — Ley 1581 de 2012 · Decreto 1377 de 2013");
  pdf.setCreator("CIOC · RISKS INTERNATIONAL");
  pdf.setCreationDate(data.acceptedAt);

  const fontReg = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  // Paleta institucional
  const NAVY = rgb(0.043, 0.114, 0.267);
  const GOLD = rgb(0.784, 0.604, 0.208);
  const TEXT = rgb(0.059, 0.090, 0.165);
  const MUTED = rgb(0.392, 0.455, 0.545);
  const BAND = rgb(0.992, 0.984, 0.957);

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN_X = 50;
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let cursorY = PAGE_H - 50;

  /** Saltos de página con margen inferior. */
  function ensure(spaceNeeded: number) {
    if (cursorY - spaceNeeded < 60) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      cursorY = PAGE_H - 50;
    }
  }

  /** Texto con word-wrap simple para el ancho disponible. */
  function drawWrapped(
    text: string,
    opts: { size?: number; font?: typeof fontReg; color?: ReturnType<typeof rgb>; x?: number; maxWidth?: number; leading?: number } = {},
  ) {
    const size = opts.size ?? 10;
    const font = opts.font ?? fontReg;
    const color = opts.color ?? TEXT;
    const x = opts.x ?? MARGIN_X;
    const maxWidth = opts.maxWidth ?? PAGE_W - MARGIN_X * 2;
    const leading = opts.leading ?? size * 1.4;

    // safeText() ANTES de medir y dibujar: pdf-lib + Helvetica usan
    // encoding WinAnsi y rompen con marcas combinantes NFD (e.g. `é`
    // en vez de `é`) o caracteres no-Latin-1 (CJK, emojis, comillas
    // curvas). Ver src/lib/pdf-text.ts.
    const safe = safeText(text);
    const words = safe.split(/\s+/);
    let line = "";
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(trial, size) > maxWidth) {
        ensure(leading);
        page.drawText(line, { x, y: cursorY - size, size, font, color });
        cursorY -= leading;
        line = w;
      } else {
        line = trial;
      }
    }
    if (line) {
      ensure(leading);
      page.drawText(line, { x, y: cursorY - size, size, font, color });
      cursorY -= leading;
    }
  }

  // ── 1. Encabezado ──────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: PAGE_H - 90, width: PAGE_W, height: 90, color: NAVY });
  page.drawText("AUTORIZACIÓN DE TRATAMIENTO", {
    x: MARGIN_X, y: PAGE_H - 45, size: 16, font: fontBold, color: rgb(1, 1, 1),
  });
  page.drawText("DE DATOS PERSONALES — HABEAS DATA", {
    x: MARGIN_X, y: PAGE_H - 65, size: 11, font: fontReg, color: rgb(0.85, 0.88, 0.95),
  });
  page.drawRectangle({ x: 0, y: PAGE_H - 94, width: PAGE_W, height: 4, color: GOLD });
  cursorY = PAGE_H - 120;

  // ── 2. Datos del titular ─────────────────────────────────────────
  page.drawRectangle({ x: MARGIN_X - 6, y: cursorY - 6, width: PAGE_W - MARGIN_X * 2 + 12, height: 16, color: BAND });
  page.drawText("DATOS DEL TITULAR", { x: MARGIN_X, y: cursorY, size: 9, font: fontBold, color: NAVY });
  cursorY -= 24;

  const docLine = data.documentType && data.documentNumber
    ? `${data.documentType} ${data.documentNumber}`
    : "Documento no consignado";
  drawWrapped(`Nombre: ${data.holderName}`, { size: 10.5, font: fontBold });
  drawWrapped(`Identificación: ${docLine}`, { size: 10 });
  drawWrapped(`Correo electrónico: ${data.email}`, { size: 10 });
  cursorY -= 8;

  // ── 3. Responsable ───────────────────────────────────────────────
  page.drawRectangle({ x: MARGIN_X - 6, y: cursorY - 6, width: PAGE_W - MARGIN_X * 2 + 12, height: 16, color: BAND });
  page.drawText("RESPONSABLE DEL TRATAMIENTO", { x: MARGIN_X, y: cursorY, size: 9, font: fontBold, color: NAVY });
  cursorY -= 24;

  drawWrapped(`Razón social: ${data.responsible.name}`, { size: 10.5, font: fontBold });
  drawWrapped(`Domicilio: ${data.responsible.address}`, { size: 10 });
  drawWrapped(`Correo de habeas data: ${data.responsible.email}`, { size: 10 });
  drawWrapped(`Teléfono: ${data.responsible.phone}`, { size: 10 });
  drawWrapped(`Política completa: ${data.responsible.policyUrl}`, { size: 9, color: MUTED });
  cursorY -= 8;

  // ── 4. Evidencia electrónica ─────────────────────────────────────
  page.drawRectangle({ x: MARGIN_X - 6, y: cursorY - 6, width: PAGE_W - MARGIN_X * 2 + 12, height: 16, color: BAND });
  page.drawText("EVIDENCIA ELECTRÓNICA DE LA ACEPTACIÓN", { x: MARGIN_X, y: cursorY, size: 9, font: fontBold, color: NAVY });
  cursorY -= 24;

  const localDate = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "full", timeStyle: "long", timeZone: "America/Bogota",
  }).format(data.acceptedAt);
  drawWrapped(`Fecha y hora (Colombia): ${localDate}`, { size: 10 });
  drawWrapped(`Fecha y hora (UTC): ${data.acceptedAt.toISOString()}`, { size: 9, color: MUTED });
  drawWrapped(`IP de origen: ${data.ip ?? "(no capturada)"}`, { size: 10 });
  drawWrapped(`User-Agent: ${data.userAgent ?? "(no capturado)"}`, { size: 9, color: MUTED });
  drawWrapped(`Versión de la política: ${data.policyVersion}`, { size: 10 });
  cursorY -= 8;

  // ── 5. Declaraciones aceptadas ───────────────────────────────────
  page.drawRectangle({ x: MARGIN_X - 6, y: cursorY - 6, width: PAGE_W - MARGIN_X * 2 + 12, height: 16, color: BAND });
  page.drawText("DECLARACIONES ACEPTADAS EXPRESAMENTE", { x: MARGIN_X, y: cursorY, size: 9, font: fontBold, color: NAVY });
  cursorY -= 22;

  for (const a of ACCEPTANCES) {
    ensure(50);
    // Caja del check
    const checkY = cursorY - 4;
    page.drawRectangle({ x: MARGIN_X, y: checkY - 10, width: 12, height: 12, borderColor: NAVY, borderWidth: 1, color: rgb(0.93, 0.97, 0.93) });
    page.drawText("✓", { x: MARGIN_X + 2, y: checkY - 9, size: 11, font: fontBold, color: rgb(0.07, 0.55, 0.27) });
    page.drawText(safeText(`Declaración ${a.n} — ${a.title}`), { x: MARGIN_X + 20, y: checkY - 8, size: 10, font: fontBold, color: NAVY });
    cursorY -= 18;
    drawWrapped(a.body, { x: MARGIN_X + 20, maxWidth: PAGE_W - MARGIN_X * 2 - 20, size: 9.5, color: TEXT, leading: 12 });
    cursorY -= 6;
  }

  // ── 6. Finalidades ───────────────────────────────────────────────
  ensure(50);
  page.drawRectangle({ x: MARGIN_X - 6, y: cursorY - 6, width: PAGE_W - MARGIN_X * 2 + 12, height: 16, color: BAND });
  page.drawText("FINALIDADES AUTORIZADAS DEL TRATAMIENTO", { x: MARGIN_X, y: cursorY, size: 9, font: fontBold, color: NAVY });
  cursorY -= 22;
  for (const p of PURPOSES) {
    ensure(14);
    page.drawText("•", { x: MARGIN_X + 4, y: cursorY - 9, size: 11, font: fontBold, color: GOLD });
    drawWrapped(p, { x: MARGIN_X + 16, maxWidth: PAGE_W - MARGIN_X * 2 - 16, size: 9.5, leading: 12 });
    cursorY -= 2;
  }

  // ── 7. Derechos ──────────────────────────────────────────────────
  ensure(60);
  page.drawRectangle({ x: MARGIN_X - 6, y: cursorY - 6, width: PAGE_W - MARGIN_X * 2 + 12, height: 16, color: BAND });
  page.drawText("DERECHOS DEL TITULAR", { x: MARGIN_X, y: cursorY, size: 9, font: fontBold, color: NAVY });
  cursorY -= 22;
  for (const r of RIGHTS) {
    ensure(14);
    page.drawText("✓", { x: MARGIN_X + 2, y: cursorY - 9, size: 10, font: fontBold, color: rgb(0.07, 0.55, 0.27) });
    drawWrapped(r, { x: MARGIN_X + 16, maxWidth: PAGE_W - MARGIN_X * 2 - 16, size: 9.5, leading: 12 });
    cursorY -= 2;
  }
  cursorY -= 4;
  drawWrapped(
    `Para ejercer estos derechos, escriba a ${data.responsible.email} o llame al ${data.responsible.phone}. ` +
    "Tenemos hasta 15 días hábiles para responderle conforme a la ley.",
    { size: 9, color: MUTED, leading: 12 },
  );

  // ── 8. Base legal ────────────────────────────────────────────────
  ensure(40);
  page.drawRectangle({ x: MARGIN_X - 6, y: cursorY - 6, width: PAGE_W - MARGIN_X * 2 + 12, height: 16, color: BAND });
  page.drawText("BASE LEGAL CITADA", { x: MARGIN_X, y: cursorY, size: 9, font: fontBold, color: NAVY });
  cursorY -= 22;
  for (const l of LEGAL_BASIS) {
    ensure(14);
    page.drawText("§", { x: MARGIN_X + 2, y: cursorY - 9, size: 10, font: fontBold, color: NAVY });
    drawWrapped(l, { x: MARGIN_X + 16, maxWidth: PAGE_W - MARGIN_X * 2 - 16, size: 9.5, leading: 12 });
    cursorY -= 2;
  }

  // ── 9. Click-wrap + hash ─────────────────────────────────────────
  ensure(80);
  cursorY -= 10;
  page.drawRectangle({ x: MARGIN_X - 8, y: cursorY - 60, width: PAGE_W - MARGIN_X * 2 + 16, height: 70, color: rgb(0.99, 0.98, 0.95), borderColor: GOLD, borderWidth: 0.8 });
  page.drawText("ACEPTACIÓN ELECTRÓNICA — CLICK-WRAP", { x: MARGIN_X, y: cursorY - 6, size: 9, font: fontBold, color: GOLD });
  cursorY -= 22;
  drawWrapped(
    `El titular ${data.holderName} aceptó esta autorización marcando expresamente dos casillas independientes ` +
    "en el formulario de registro de la plataforma okacreditado.com. La aceptación se realizó de manera " +
    "previa, libre, voluntaria, expresa e informada, conforme al art. 9 de la Ley 1581/2012.",
    { size: 9, color: TEXT, leading: 11.5 },
  );
  cursorY -= 4;
  page.drawText("HASH SHA-256 DE LA EVIDENCIA", { x: MARGIN_X, y: cursorY, size: 8, font: fontBold, color: MUTED });
  cursorY -= 12;
  page.drawText(evidenceHash, {
    x: MARGIN_X, y: cursorY, size: 8, font: fontReg, color: TEXT,
  });
  cursorY -= 18;

  // ── Pie de página en cada página ─────────────────────────────────
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(
      `${data.responsible.name} · Política de Tratamiento de Datos Personales · Documento generado el ${localDate}`,
      { x: MARGIN_X, y: 28, size: 7, font: fontItalic, color: MUTED },
    );
    p.drawText(`${i + 1} / ${pages.length}`, {
      x: PAGE_W - MARGIN_X - 26, y: 28, size: 7, font: fontReg, color: MUTED,
    });
  });

  const pdfBytes = await pdf.save();
  return { pdfBytes, evidenceHash };
}
