import "server-only";

/**
 * Helper para construir nombres de archivo descargados (Content-Disposition)
 * que sean LEGIBLES y AUTODESCRIPTIVOS: incluyen el nombre del candidato,
 * su identificación y el estado del proceso, además del tipo de documento.
 *
 * Ejemplos:
 *   HojaDeVida_SAMUEL-SANCHEZ_CC-7182416_LISTO-PARA-PRESENTAR_2026-06-12.pdf
 *   Certificado_PEDRO-MUJICA_CC-79924561_VIGENTE_PRES-2026-BC128BA1.pdf
 *
 * Reglas de saneamiento:
 *   - NFD + strip de marcas combinantes (acentos, eñes) → ASCII-safe.
 *   - Cualquier caracter no [A-Z0-9-] se reemplaza por "-".
 *   - Se colapsan guiones consecutivos y se recortan los extremos.
 *   - MAYÚSCULAS para que el OS no se confunda con case-insensitive fs.
 */

export interface FilenameParts {
  /** Prefijo del tipo de documento, e.g. "HojaDeVida", "Certificado". */
  prefix: string;
  /** Nombre del titular: "Pedro Mujica Gavilán" → "PEDRO-MUJICA-GAVILAN". */
  holderName: string;
  /** Documento de identidad: "CC" + "79924561" → "CC-79924561". */
  documentType?: string | null;
  documentNumber?: string | null;
  /** Etiqueta de estado humano (e.g. "LISTO-PARA-PRESENTAR"). */
  status?: string | null;
  /** Sufijo opcional (folio, fecha, etc.). */
  suffix?: string | null;
  /** Extensión sin punto. Default "pdf". */
  ext?: string;
}

const DASH_RX = /[^A-Z0-9-]+/g;
const COMBINING_RX = /[̀-ͯ]/g;

export function sanitizeForFilename(input: string): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(COMBINING_RX, "")
    .toUpperCase()
    .replace(DASH_RX, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/// Traducción del status interno de Enrollment a una etiqueta corta y
/// legible (sin acentos) apta para nombre de archivo.
const STATUS_LABEL: Record<string, string> = {
  STARTED: "INICIADO",
  CONSENT_PENDING: "AUTORIZACION-PENDIENTE",
  DOCS_PENDING: "DOCUMENTOS-PENDIENTES",
  PAYMENT_PENDING: "PAGO-PENDIENTE",
  SCHEDULING: "POR-AGENDAR",
  READY: "LISTO-PARA-PRESENTAR",
  IN_PROGRESS: "EN-PRESENTACION",
  GRADING: "EN-CALIFICACION",
  COMMITTEE: "EN-COMITE",
  APPROVED: "APROBADO",
  REJECTED: "NO-APROBADO",
  CERTIFIED: "CERTIFICADO",
  EXPIRED: "VENCIDO",
  CANCELLED: "CANCELADO",
  // Para certificados (CertificateStatus): VALID / EXPIRED / SUSPENDED / WITHDRAWN / CANCELLED
  VALID: "VIGENTE",
  SUSPENDED: "SUSPENDIDO",
  WITHDRAWN: "ANULADO",
  // Para pagos (PaymentStatus): PENDING / APPROVED / REJECTED / EXPIRED / REFUNDED
  // APPROVED / PENDING / REJECTED / EXPIRED ya están arriba.
  REFUNDED: "REEMBOLSADO",
};

export function labelStatus(status: string | null | undefined): string {
  if (!status) return "";
  return STATUS_LABEL[status] ?? sanitizeForFilename(status);
}

export function buildPdfFilename(parts: FilenameParts): string {
  const segs: string[] = [];
  segs.push(sanitizeForFilename(parts.prefix));

  const name = sanitizeForFilename(parts.holderName);
  if (name) segs.push(name);

  if (parts.documentNumber) {
    const t = sanitizeForFilename(parts.documentType ?? "DOC");
    const n = sanitizeForFilename(parts.documentNumber);
    if (n) segs.push(`${t}-${n}`);
  }

  if (parts.status) {
    const s = labelStatus(parts.status);
    if (s) segs.push(s);
  }

  if (parts.suffix) {
    const x = sanitizeForFilename(parts.suffix);
    if (x) segs.push(x);
  }

  const ext = (parts.ext ?? "pdf").toLowerCase();
  const base = segs.filter(Boolean).join("_") || "documento";
  // Recortar a un tamaño razonable (algunos OS limitan a 255).
  return `${base.slice(0, 180)}.${ext}`;
}
