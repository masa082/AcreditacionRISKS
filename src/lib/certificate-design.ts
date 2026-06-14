/// Diseño profesional de los certificados PDF — dos plantillas:
///
/// 1. CERTIFICATION ("Certificado de Idoneidad") — diploma premium en
///    tamaño CARTA horizontal (Letter, 792 × 612 pt). Doble borde
///    dorado + plata, filigranas vectoriales en las cuatro esquinas,
///    cinta dorada con el título, sello circular grande con la cresta
///    del organismo, marcas de agua de seguridad repetidas en diagonal
///    a muy baja opacidad, patrón guilloche en la parte inferior.
///    Tipografía: Times-Roman serif elegante con variantes Bold/Italic.
///
/// 2. EXAM_PRESENTATION ("Constancia de presentación") — diseño
///    sobrio en tamaño CARTA horizontal, borde sencillo, sin sello
///    grande ni filigranas, paleta institucional azul. Sirve para
///    documentar que el candidato presentó la evaluación, no que está
///    certificado.
///
/// Ambos usan StandardFonts (sin dependencias externas) y dibujan los
/// adornos vectorialmente con primitivas de pdf-lib (drawLine,
/// drawCircle, drawRectangle, drawSvgPath).

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, degrees } from "pdf-lib";
import { safeText } from "@/lib/pdf-text";

// ─── Paletas ────────────────────────────────────────────────────────

const GOLD_DEEP = rgb(0.733, 0.557, 0.137);   // #BB8E23
const GOLD = rgb(0.788, 0.635, 0.235);        // #C9A23C
const GOLD_LIGHT = rgb(0.910, 0.804, 0.467);  // #E8CD77
const SILVER = rgb(0.690, 0.706, 0.733);      // #B0B4BB
const SILVER_DEEP = rgb(0.466, 0.486, 0.510); // #777C82
const NAVY = rgb(0.094, 0.114, 0.286);        // #181D49
const NAVY_DEEP = rgb(0.039, 0.063, 0.196);   // #0A1032
const BURGUNDY = rgb(0.486, 0.105, 0.165);    // #7C1B2A — sello
const PAPER = rgb(0.996, 0.992, 0.971);       // marfil tenue
const INK = rgb(0.094, 0.114, 0.286);
const MUTED = rgb(0.470, 0.490, 0.541);
const EMERALD = rgb(0.04, 0.55, 0.34);
const AMBER_DEEP = rgb(0.73, 0.43, 0.05);
const ROSE_DEEP = rgb(0.73, 0.13, 0.20);

export interface CertificateData {
  type: "CERTIFICATION" | "EXAM_PRESENTATION";
  code: string;
  title: string;
  scope: string | null;
  holderName: string;
  documentNumber: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  status: "VALID" | "EXPIRED" | string;
  subscriber: {
    tradeName: string | null;
    legalName: string;
    authorizedSigner: string | null;
    taxId: string | null;
  };
  scheme: { normReference: string | null } | null;
}

export interface RenderInputs {
  cert: CertificateData;
  qrPngBytes: Uint8Array | null;
  logoBytes: Uint8Array | null;
  logoIsPng: boolean;
  signatureBytes: Uint8Array | null;
  signatureIsPng: boolean;
  tokenPreview: string;
}

const PAGE_W = 792; // 11"
const PAGE_H = 612; //  8.5"

export async function renderCertificatePdf(inp: RenderInputs): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const serifBoldItalic = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([PAGE_W, PAGE_H]);

  // Fondo marfil
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER });

  // Carga imágenes
  const logoImg = inp.logoBytes
    ? await (inp.logoIsPng ? pdf.embedPng(inp.logoBytes) : pdf.embedJpg(inp.logoBytes)).catch(() => null)
    : null;
  const signImg = inp.signatureBytes
    ? await (inp.signatureIsPng ? pdf.embedPng(inp.signatureBytes) : pdf.embedJpg(inp.signatureBytes)).catch(() => null)
    : null;
  const qrImg = inp.qrPngBytes ? await pdf.embedPng(inp.qrPngBytes).catch(() => null) : null;

  if (inp.cert.type === "CERTIFICATION") {
    drawDiploma({ pdf, page, fonts: { serif, serifBold, serifItalic, serifBoldItalic, sans, sansBold }, ...inp, logoImg, signImg, qrImg });
  } else {
    drawPresentation({ pdf, page, fonts: { serif, serifBold, serifItalic, sans, sansBold }, ...inp, logoImg, signImg, qrImg });
  }

  return pdf.save();
}

// ════════════════════════════════════════════════════════════════════
//   DIPLOMA · Certificado de Idoneidad (premium)
// ════════════════════════════════════════════════════════════════════

interface DrawCtx {
  pdf: PDFDocument;
  page: PDFPage;
  fonts: {
    serif: PDFFont;
    serifBold: PDFFont;
    serifItalic: PDFFont;
    serifBoldItalic?: PDFFont;
    sans: PDFFont;
    sansBold: PDFFont;
  };
  cert: CertificateData;
  tokenPreview: string;
  logoImg: Awaited<ReturnType<PDFDocument["embedPng"]>> | null;
  signImg: Awaited<ReturnType<PDFDocument["embedPng"]>> | null;
  qrImg: Awaited<ReturnType<PDFDocument["embedPng"]>> | null;
}

function drawDiploma(ctx: DrawCtx) {
  const { page, fonts, cert } = ctx;
  const W = PAGE_W, H = PAGE_H;
  const cx = W / 2;

  // ── Marcas de agua de seguridad (diagonal, muy bajo opacity) ──
  drawSecurityWatermark(ctx);

  // ── Marco principal — doble borde dorado + plata ──
  drawOuterFrame(page);

  // ── Filigranas vectoriales en las cuatro esquinas ──
  drawCornerFiligree(page, 50, H - 50, "tl");
  drawCornerFiligree(page, W - 50, H - 50, "tr");
  drawCornerFiligree(page, 50, 50, "bl");
  drawCornerFiligree(page, W - 50, 50, "br");

  // ── Patrón guilloche horizontal en el centro inferior ──
  drawGuillochePattern(page, 110, 168, W - 220, 28);

  // ── Logo del suscriptor (centro-superior izq) ──
  if (ctx.logoImg) {
    const ww = 96;
    const hh = (ctx.logoImg.height / ctx.logoImg.width) * ww;
    page.drawImage(ctx.logoImg, { x: 90, y: H - 100 - hh / 2, width: ww, height: hh });
  }

  // ── Cinta dorada superior con título del organismo ──
  drawTopRibbon(page, ctx);

  // ── Cuerpo del diploma ──
  drawDiplomaBody(page, ctx, cx);

  // ── Sello circular dorado/burgundy (lado izquierdo abajo) ──
  drawSeal(page, fonts, 130, 245, cert.subscriber.tradeName ?? cert.subscriber.legalName);

  // ── QR de verificación (lado derecho abajo) ──
  if (ctx.qrImg) {
    page.drawImage(ctx.qrImg, { x: W - 175, y: 195, width: 90, height: 90 });
    page.drawText(safeText("Verificación pública por QR"), {
      x: W - 188, y: 182, size: 7.5, font: fonts.serifItalic, color: MUTED,
    });
    page.drawText(safeText(`okacreditado.com/verificar/${cert.code}`), {
      x: W - 188, y: 172, size: 6.5, font: fonts.sans, color: MUTED,
    });
  }

  // ── Firma + datos formales (centro-inferior) ──
  drawSignatureBlock(page, ctx, cx);

  // ── Pie con token + folio ──
  drawFooter(page, fonts, ctx.cert, ctx.tokenPreview);
}

function drawSecurityWatermark(ctx: DrawCtx) {
  const { page, fonts, cert } = ctx;
  const text = `${cert.code.toUpperCase()} · ${(cert.subscriber.tradeName ?? cert.subscriber.legalName).toUpperCase()} · ONAC `;
  // Repetimos varias líneas en diagonal a 30°, color casi imperceptible.
  const wmColor = rgb(0.88, 0.84, 0.74); // pálido beige
  const rows = 18;
  const stepY = 42;
  const size = 10;
  for (let i = 0; i < rows; i++) {
    const y = -50 + i * stepY;
    page.drawText(safeText(text.repeat(6)), {
      x: -120,
      y,
      size,
      font: fonts.serifItalic,
      color: wmColor,
      rotate: degrees(28),
    });
  }
}

function drawOuterFrame(page: PDFPage) {
  // Borde dorado exterior
  page.drawRectangle({ x: 30, y: 30, width: PAGE_W - 60, height: PAGE_H - 60, borderColor: GOLD_DEEP, borderWidth: 3 });
  // Banda fina plata
  page.drawRectangle({ x: 37, y: 37, width: PAGE_W - 74, height: PAGE_H - 74, borderColor: SILVER, borderWidth: 1 });
  // Borde interior dorado
  page.drawRectangle({ x: 44, y: 44, width: PAGE_W - 88, height: PAGE_H - 88, borderColor: GOLD, borderWidth: 1.2 });
  // Línea de hilo interior
  page.drawRectangle({ x: 50, y: 50, width: PAGE_W - 100, height: PAGE_H - 100, borderColor: GOLD_LIGHT, borderWidth: 0.4 });
}

/// Filigrana de esquina: arabesco simétrico hecho con arcos + diamantes.
/// `corner` define la orientación (tl=top-left, tr=top-right, bl, br).
function drawCornerFiligree(page: PDFPage, x: number, y: number, corner: "tl" | "tr" | "bl" | "br") {
  const sx = corner.includes("r") ? -1 : 1;
  const sy = corner.startsWith("t") ? -1 : 1;
  const px = (dx: number) => x + sx * dx;
  const py = (dy: number) => y + sy * dy;

  // Arco doble (dorado y plateado) ondulado
  // Aproximación con segmentos
  const segs = 30;
  const r = 32;
  for (let i = 0; i < segs; i++) {
    const t1 = (i / segs) * Math.PI * 0.5;
    const t2 = ((i + 1) / segs) * Math.PI * 0.5;
    const wave = Math.sin(t1 * 4) * 2;
    const wave2 = Math.sin(t2 * 4) * 2;
    page.drawLine({
      start: { x: px(Math.cos(t1) * (r + wave)), y: py(Math.sin(t1) * (r + wave)) },
      end: { x: px(Math.cos(t2) * (r + wave2)), y: py(Math.sin(t2) * (r + wave2)) },
      thickness: 0.9,
      color: GOLD_DEEP,
    });
    page.drawLine({
      start: { x: px(Math.cos(t1) * (r + 6 + wave)), y: py(Math.sin(t1) * (r + 6 + wave)) },
      end: { x: px(Math.cos(t2) * (r + 6 + wave2)), y: py(Math.sin(t2) * (r + 6 + wave2)) },
      thickness: 0.5,
      color: SILVER,
    });
  }
  // Diamantes y puntos en la esquina
  drawDiamond(page, px(8), py(8), 4, GOLD_DEEP);
  drawDiamond(page, px(22), py(4), 2.5, GOLD);
  drawDiamond(page, px(4), py(22), 2.5, GOLD);
  // Punto plateado central
  page.drawCircle({ x: px(14), y: py(14), size: 1.6, color: SILVER_DEEP });

  // Brazos rectos con remates
  page.drawLine({
    start: { x: px(40), y: py(0) }, end: { x: px(78), y: py(0) },
    thickness: 0.6, color: GOLD_DEEP,
  });
  page.drawLine({
    start: { x: px(0), y: py(40) }, end: { x: px(0), y: py(78) },
    thickness: 0.6, color: GOLD_DEEP,
  });
  drawDiamond(page, px(82), py(0), 2.2, GOLD);
  drawDiamond(page, px(0), py(82), 2.2, GOLD);
}

function drawDiamond(page: PDFPage, cx: number, cy: number, s: number, color: ReturnType<typeof rgb>) {
  // Rotamos un cuadrado 45° con drawSvgPath: M cx,cy-s L cx+s,cy L cx,cy+s L cx-s,cy Z
  const path = `M ${cx} ${cy - s} L ${cx + s} ${cy} L ${cx} ${cy + s} L ${cx - s} ${cy} Z`;
  page.drawSvgPath(path, { color, borderColor: color, borderWidth: 0.5 });
}

/// Patrón guilloche: senoides entrelazadas (común en billetes y diplomas).
function drawGuillochePattern(page: PDFPage, x: number, y: number, w: number, h: number) {
  const cy = y + h / 2;
  const steps = 220;
  for (let i = 0; i < steps - 1; i++) {
    const t1 = (i / (steps - 1)) * Math.PI * 8;
    const t2 = ((i + 1) / (steps - 1)) * Math.PI * 8;
    const x1 = x + (i / (steps - 1)) * w;
    const x2 = x + ((i + 1) / (steps - 1)) * w;
    page.drawLine({
      start: { x: x1, y: cy + Math.sin(t1) * (h * 0.4) },
      end: { x: x2, y: cy + Math.sin(t2) * (h * 0.4) },
      thickness: 0.5, color: GOLD_DEEP,
    });
    page.drawLine({
      start: { x: x1, y: cy + Math.cos(t1) * (h * 0.4) },
      end: { x: x2, y: cy + Math.cos(t2) * (h * 0.4) },
      thickness: 0.4, color: SILVER,
    });
  }
}

function drawTopRibbon(page: PDFPage, ctx: DrawCtx) {
  const { cert, fonts } = ctx;
  const W = PAGE_W;
  const cx = W / 2;
  const ribbonY = PAGE_H - 100;

  page.drawText(safeText("ORGANISMO CERTIFICADOR"), {
    x: cx - fonts.sansBold.widthOfTextAtSize("ORGANISMO CERTIFICADOR", 8) / 2,
    y: PAGE_H - 78, size: 8, font: fonts.sansBold, color: MUTED,
  });
  const org = (cert.subscriber.tradeName ?? cert.subscriber.legalName).toUpperCase();
  page.drawText(safeText(org), {
    x: cx - fonts.serifBold.widthOfTextAtSize(org, 18) / 2,
    y: ribbonY, size: 18, font: fonts.serifBold, color: NAVY_DEEP,
  });
  // Línea dorada decorativa bajo el organismo
  page.drawLine({
    start: { x: cx - 110, y: ribbonY - 6 },
    end: { x: cx + 110, y: ribbonY - 6 },
    thickness: 0.8, color: GOLD_DEEP,
  });
  // Razón social
  if (cert.subscriber.legalName !== org) {
    page.drawText(safeText(cert.subscriber.legalName), {
      x: cx - fonts.serifItalic.widthOfTextAtSize(cert.subscriber.legalName, 9) / 2,
      y: ribbonY - 16, size: 9, font: fonts.serifItalic, color: MUTED,
    });
  }
}

function drawDiplomaBody(page: PDFPage, ctx: DrawCtx, cx: number) {
  const { cert, fonts } = ctx;

  const certifyY = PAGE_H - 170;
  const certifyText = "Certifica que";
  page.drawText(safeText(certifyText), {
    x: cx - fonts.serifItalic.widthOfTextAtSize(certifyText, 13) / 2,
    y: certifyY, size: 13, font: fonts.serifItalic, color: MUTED,
  });

  // Nombre — Times Bold Italic, grande
  const holder = cert.holderName.toUpperCase();
  const holderFont = ctx.fonts.serifBoldItalic ?? fonts.serifBold;
  // Calculamos tamaño que cabe en la página (entre 28 y 40)
  let nameSize = 38;
  while (holderFont.widthOfTextAtSize(holder, nameSize) > PAGE_W - 200 && nameSize > 24) {
    nameSize -= 1;
  }
  page.drawText(safeText(holder), {
    x: cx - holderFont.widthOfTextAtSize(holder, nameSize) / 2,
    y: PAGE_H - 215, size: nameSize, font: holderFont, color: NAVY_DEEP,
  });

  // Línea decorativa con diamantes a los lados
  const lineY = PAGE_H - 226;
  page.drawLine({ start: { x: cx - 200, y: lineY }, end: { x: cx + 200, y: lineY }, thickness: 0.6, color: GOLD });
  drawDiamond(page, cx - 207, lineY, 3, GOLD_DEEP);
  drawDiamond(page, cx + 207, lineY, 3, GOLD_DEEP);
  drawDiamond(page, cx, lineY - 5, 3.2, GOLD_DEEP);

  // Documento
  if (cert.documentNumber) {
    const docLine = `Identificado(a) con documento No. ${cert.documentNumber}`;
    page.drawText(safeText(docLine), {
      x: cx - fonts.serif.widthOfTextAtSize(docLine, 11) / 2,
      y: PAGE_H - 248, size: 11, font: fonts.serif, color: INK,
    });
  }

  // Texto de méritos
  const meritIntro = "Ha cumplido satisfactoriamente con los requisitos definidos por el Sistema de Gestión y la norma ISO/IEC 17024 para acreditarse como:";
  drawCenteredWrapped(page, fonts.serifItalic, meritIntro, cx, PAGE_H - 274, PAGE_W - 240, 10, MUTED, 12);

  // Título de la certificación
  const titleSize = cert.title.length > 60 ? 14 : 17;
  drawCenteredWrapped(page, fonts.serifBold, cert.title, cx, PAGE_H - 308, PAGE_W - 220, titleSize, GOLD_DEEP, titleSize + 2);

  // Alcance (scope) opcional
  if (cert.scope) {
    drawCenteredWrapped(page, fonts.serif, cert.scope, cx, PAGE_H - 335, PAGE_W - 240, 9, INK, 11);
  }
}

function drawCenteredWrapped(
  page: PDFPage, font: PDFFont, text: string, cx: number, startY: number,
  maxWidth: number, size: number, color: ReturnType<typeof rgb>, lineHeight: number,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) > maxWidth) {
      if (line) lines.push(line);
      line = w;
    } else line = trial;
  }
  if (line) lines.push(line);
  let y = startY;
  for (const l of lines) {
    page.drawText(safeText(l), {
      x: cx - font.widthOfTextAtSize(l, size) / 2,
      y, size, font, color,
    });
    y -= lineHeight;
  }
}

function drawSeal(page: PDFPage, fonts: DrawCtx["fonts"], cx: number, cy: number, _org: string) {
  // Sello circular tipo medalla, dorado con anillo plateado.
  // Tres círculos concéntricos + estrella central + texto curvo simplificado.
  page.drawCircle({ x: cx, y: cy, size: 56, color: GOLD_LIGHT, borderColor: GOLD_DEEP, borderWidth: 1.5 });
  page.drawCircle({ x: cx, y: cy, size: 48, borderColor: GOLD_DEEP, borderWidth: 0.8 });
  page.drawCircle({ x: cx, y: cy, size: 36, color: PAPER, borderColor: SILVER, borderWidth: 0.6 });
  // Patrón de rayos
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const r1 = 36, r2 = 48;
    page.drawLine({
      start: { x: cx + Math.cos(ang) * r1, y: cy + Math.sin(ang) * r1 },
      end: { x: cx + Math.cos(ang) * r2, y: cy + Math.sin(ang) * r2 },
      thickness: 0.4, color: GOLD_DEEP,
    });
  }
  // Estrella central
  drawStar(page, cx, cy, 20, 9, BURGUNDY);
  // Texto curvo arriba: "ORGANISMO CERTIFICADOR"
  drawTextOnArc(page, fonts.sansBold, "ORGANISMO CERTIFICADOR", cx, cy, 42, -Math.PI / 2 - 0.7, 1.4, 6.5, GOLD_DEEP);
  drawTextOnArc(page, fonts.sansBold, "ISO/IEC 17024", cx, cy, 42, Math.PI / 2 + 0.5, -1.0, 6.5, GOLD_DEEP);
}

function drawStar(page: PDFPage, cx: number, cy: number, rOuter: number, rInner: number, color: ReturnType<typeof rgb>) {
  let path = "";
  const points = 5;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const ang = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  path += " Z";
  page.drawSvgPath(path, { color, borderColor: color, borderWidth: 0.5 });
}

function drawTextOnArc(
  page: PDFPage, font: PDFFont, text: string, cx: number, cy: number,
  r: number, startAng: number, sweep: number, size: number, color: ReturnType<typeof rgb>,
) {
  const chars = text.split("");
  for (let i = 0; i < chars.length; i++) {
    const ang = startAng + (sweep * i) / Math.max(1, chars.length - 1);
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    const rot = ang + Math.PI / 2;
    page.drawText(safeText(chars[i]), {
      x, y, size, font, color, rotate: degrees((rot * 180) / Math.PI),
    });
  }
}

function drawSignatureBlock(page: PDFPage, ctx: DrawCtx, cx: number) {
  const { cert, fonts, signImg } = ctx;
  const sigCx = cx + 160; // a la derecha
  const sigY = 200;

  if (signImg) {
    const ww = 130;
    const hh = (signImg.height / signImg.width) * ww;
    page.drawImage(signImg, { x: sigCx - ww / 2, y: sigY + 5, width: ww, height: Math.min(hh, 60) });
  }
  page.drawLine({ start: { x: sigCx - 90, y: sigY }, end: { x: sigCx + 90, y: sigY }, thickness: 0.8, color: NAVY });
  if (cert.subscriber.authorizedSigner) {
    page.drawText(safeText(cert.subscriber.authorizedSigner), {
      x: sigCx - fonts.serifBold.widthOfTextAtSize(cert.subscriber.authorizedSigner, 10) / 2,
      y: sigY - 14, size: 10, font: fonts.serifBold, color: NAVY,
    });
  }
  page.drawText(safeText("Director del Organismo de Certificación de Personas"), {
    x: sigCx - fonts.serifItalic.widthOfTextAtSize("Director del Organismo de Certificación de Personas", 8.5) / 2,
    y: sigY - 26, size: 8.5, font: fonts.serifItalic, color: MUTED,
  });

  // Datos formales (izquierda)
  drawDataBlock(page, fonts, 240, 245, cert);
}

function drawDataBlock(page: PDFPage, fonts: DrawCtx["fonts"], x: number, y: number, cert: CertificateData) {
  const k = (label: string, value: string, yy: number) => {
    page.drawText(safeText(label), { x, y: yy, size: 8, font: fonts.sansBold, color: MUTED });
    page.drawText(safeText(value), { x: x + 95, y: yy, size: 10, font: fonts.serif, color: INK });
  };
  k("CÓDIGO", cert.code, y);
  k("EMISIÓN", new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(cert.issuedAt), y - 14);
  if (cert.expiresAt) {
    k("VENCIMIENTO", new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(cert.expiresAt), y - 28);
  }
  if (cert.scheme?.normReference) {
    k("NORMA", cert.scheme.normReference, y - 42);
  }
  if (cert.subscriber.taxId) {
    page.drawText(safeText(`NIT ${cert.subscriber.taxId}`), {
      x, y: y - 56, size: 7.5, font: fonts.serifItalic, color: MUTED,
    });
  }
  // Cinta de estado
  const status = cert.status === "VALID" ? "VIGENTE" : cert.status === "EXPIRED" ? "VENCIDO" : cert.status;
  const sc = cert.status === "VALID" ? EMERALD : cert.status === "EXPIRED" ? AMBER_DEEP : ROSE_DEEP;
  page.drawRectangle({ x, y: y + 12, width: 90, height: 14, color: sc });
  page.drawText(safeText(status), {
    x: x + 45 - fonts.sansBold.widthOfTextAtSize(status, 8.5) / 2,
    y: y + 17, size: 8.5, font: fonts.sansBold, color: rgb(1, 1, 1),
  });
}

function drawFooter(page: PDFPage, fonts: DrawCtx["fonts"], cert: CertificateData, tokenPreview: string) {
  const txt = `Documento digital · token de verificación ${tokenPreview} · código ${cert.code}`;
  page.drawText(safeText(txt), {
    x: PAGE_W / 2 - fonts.sans.widthOfTextAtSize(txt, 7) / 2,
    y: 60, size: 7, font: fonts.sans, color: MUTED,
  });
  page.drawText(safeText("Este diploma debe acompañarse de la verificación pública en línea (QR) para validar su autenticidad."), {
    x: PAGE_W / 2 - fonts.serifItalic.widthOfTextAtSize("Este diploma debe acompañarse de la verificación pública en línea (QR) para validar su autenticidad.", 7) / 2,
    y: 50, size: 7, font: fonts.serifItalic, color: MUTED,
  });
}

// ════════════════════════════════════════════════════════════════════
//   CONSTANCIA · Presentación de examen (más sobrio)
// ════════════════════════════════════════════════════════════════════

function drawPresentation(ctx: DrawCtx) {
  const { page, fonts, cert } = ctx;
  const W = PAGE_W, H = PAGE_H, cx = W / 2;

  // ── Marco dorado sobre fondo marfil ──────────────────────────────
  page.drawRectangle({ x: 36, y: 36, width: W - 72, height: H - 72, borderColor: GOLD, borderWidth: 1.5 });
  page.drawRectangle({ x: 44, y: 44, width: W - 88, height: H - 88, borderColor: GOLD_LIGHT, borderWidth: 0.5 });

  // ── Encabezado limpio: logo izquierda · organismo centrado ──────
  const headerTopY = H - 70;

  if (ctx.logoImg) {
    const ww = 70;
    const hh = (ctx.logoImg.height / ctx.logoImg.width) * ww;
    page.drawImage(ctx.logoImg, { x: 70, y: headerTopY - hh / 2 - 10, width: ww, height: hh });
  }

  // ISO/IEC 17024 a la derecha, pequeño
  page.drawText(safeText("CONFORME A"), {
    x: W - 168, y: headerTopY, size: 7, font: fonts.sansBold, color: MUTED,
  });
  page.drawText(safeText("ISO/IEC 17024"), {
    x: W - 168, y: headerTopY - 12, size: 11, font: fonts.serifBold, color: NAVY,
  });

  // Centro: razón social y "Constancia de presentación"
  const org = (cert.subscriber.tradeName ?? cert.subscriber.legalName).toUpperCase();
  page.drawText(safeText(org), {
    x: cx - fonts.serifBold.widthOfTextAtSize(org, 14) / 2,
    y: headerTopY, size: 14, font: fonts.serifBold, color: NAVY_DEEP,
  });
  if (cert.subscriber.legalName !== org) {
    page.drawText(safeText(cert.subscriber.legalName), {
      x: cx - fonts.serifItalic.widthOfTextAtSize(cert.subscriber.legalName, 8.5) / 2,
      y: headerTopY - 12, size: 8.5, font: fonts.serifItalic, color: MUTED,
    });
  }

  // Línea separadora dorada bajo el encabezado
  page.drawLine({
    start: { x: 70, y: H - 100 },
    end: { x: W - 70, y: H - 100 },
    thickness: 0.6, color: GOLD,
  });

  // Tipo de documento — discreto, en versalitas con letterspacing simulado
  const labelText = "Constancia de presentación";
  page.drawText(safeText(labelText), {
    x: cx - fonts.serifItalic.widthOfTextAtSize(labelText, 10) / 2,
    y: H - 118, size: 10, font: fonts.serifItalic, color: GOLD_DEEP,
  });

  // ── Cuerpo ──────────────────────────────────────────────────────
  page.drawText(safeText("Hace constar que"), {
    x: cx - fonts.serifItalic.widthOfTextAtSize("Hace constar que", 12) / 2,
    y: H - 160, size: 12, font: fonts.serifItalic, color: MUTED,
  });
  const holder = cert.holderName.toUpperCase();
  let nameSize = 28;
  while (fonts.serifBold.widthOfTextAtSize(holder, nameSize) > W - 200 && nameSize > 18) nameSize -= 1;
  page.drawText(safeText(holder), {
    x: cx - fonts.serifBold.widthOfTextAtSize(holder, nameSize) / 2,
    y: H - 190, size: nameSize, font: fonts.serifBold, color: NAVY_DEEP,
  });
  if (cert.documentNumber) {
    const docLine = `Identificado(a) con documento No. ${cert.documentNumber}`;
    page.drawText(safeText(docLine), {
      x: cx - fonts.serif.widthOfTextAtSize(docLine, 10) / 2,
      y: H - 210, size: 10, font: fonts.serif, color: INK,
    });
  }

  drawCenteredWrapped(
    page, fonts.serif,
    "presentó satisfactoriamente la siguiente evaluación dentro del proceso de certificación de competencias por la entidad arriba mencionada:",
    cx, H - 240, W - 240, 11, MUTED, 14,
  );

  drawCenteredWrapped(page, fonts.serifBold, cert.title, cx, H - 280, W - 220, 13, NAVY, 16);

  if (cert.scope) {
    drawCenteredWrapped(page, fonts.serifItalic, cert.scope, cx, H - 320, W - 240, 9, INK, 11);
  }

  // Bloque inferior izquierda: datos
  drawPresentationDataBlock(page, fonts, 100, 170, cert);

  // QR derecha
  if (ctx.qrImg) {
    page.drawImage(ctx.qrImg, { x: W - 165, y: 130, width: 80, height: 80 });
    page.drawText(safeText("Verificación pública"), {
      x: W - 170, y: 116, size: 7, font: fonts.serifItalic, color: MUTED,
    });
    page.drawText(safeText(`okacreditado.com/verificar/${cert.code}`), {
      x: W - 170, y: 106, size: 6.5, font: fonts.sans, color: MUTED,
    });
  }

  // Firma
  drawPresentationSignature(page, ctx, cx);

  // Pie
  drawFooter(page, fonts, cert, ctx.tokenPreview);
}

function drawPresentationDataBlock(page: PDFPage, fonts: DrawCtx["fonts"], x: number, y: number, cert: CertificateData) {
  const k = (label: string, value: string, yy: number) => {
    page.drawText(safeText(label), { x, y: yy, size: 8, font: fonts.sansBold, color: MUTED });
    page.drawText(safeText(value), { x: x + 95, y: yy, size: 10, font: fonts.serif, color: INK });
  };
  k("CÓDIGO", cert.code, y);
  k("EMISIÓN", new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(cert.issuedAt), y - 14);
  if (cert.scheme?.normReference) {
    k("NORMA", cert.scheme.normReference, y - 28);
  }
  if (cert.subscriber.taxId) {
    page.drawText(safeText(`NIT ${cert.subscriber.taxId}`), {
      x, y: y - 44, size: 7.5, font: fonts.serifItalic, color: MUTED,
    });
  }
}

function drawPresentationSignature(page: PDFPage, ctx: DrawCtx, cx: number) {
  const { fonts, cert, signImg } = ctx;
  const sigCx = cx + 180;
  const sigY = 175;
  if (signImg) {
    const ww = 110;
    const hh = (signImg.height / signImg.width) * ww;
    page.drawImage(signImg, { x: sigCx - ww / 2, y: sigY + 5, width: ww, height: Math.min(hh, 50) });
  }
  page.drawLine({ start: { x: sigCx - 80, y: sigY }, end: { x: sigCx + 80, y: sigY }, thickness: 0.6, color: NAVY });
  if (cert.subscriber.authorizedSigner) {
    page.drawText(safeText(cert.subscriber.authorizedSigner), {
      x: sigCx - fonts.serifBold.widthOfTextAtSize(cert.subscriber.authorizedSigner, 9) / 2,
      y: sigY - 12, size: 9, font: fonts.serifBold, color: NAVY,
    });
  }
  page.drawText(safeText("Firma autorizada"), {
    x: sigCx - fonts.serifItalic.widthOfTextAtSize("Firma autorizada", 8) / 2,
    y: sigY - 22, size: 8, font: fonts.serifItalic, color: MUTED,
  });
}
