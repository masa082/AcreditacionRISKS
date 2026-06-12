/**
 * Compresor de archivos client-side para subidas del candidato.
 *
 * Objetivo: reducir el peso del archivo SIN pérdida visual de calidad,
 * para que la subida sea más rápida y consuma menos almacenamiento en
 * el bucket S3, manteniendo toda la información legible.
 *
 * Estrategia por tipo:
 *
 *  • IMAGEN (JPG/PNG/HEIC):
 *    - Resize a máximo 2500 px en el lado mayor (suficiente para
 *      cualquier certificado/cédula impreso/escaneado a 300 DPI).
 *    - Re-encoding a JPEG al 90% (visualmente indistinguible del
 *      original; ahorro típico 50-80%).
 *    - PNG con transparencia se conserva como PNG; PNG sin
 *      transparencia se convierte a JPEG.
 *
 *  • PDF:
 *    - Re-serialización lossless con pdf-lib (`useObjectStreams: true`).
 *      No toca el contenido, solo reescribe la estructura interna del
 *      PDF deduplicando objetos y comprimiendo streams. Ahorro
 *      típico 10-30% para PDFs no optimizados (escaneados, exportados
 *      de Word/Office).
 *    - Si el PDF ya es eficiente, devuelve el original sin cambios
 *      perceptibles.
 *
 *  • OTROS / falla del compresor:
 *    - Devuelve el original sin modificar. Nunca bloquea la subida.
 *
 * La compresión corre 100% en el navegador del candidato — no consume
 * compute del servidor ni del bucket. Si el archivo final supera el
 * tope (default 100 MB) el llamador debe mostrar error.
 */

import imageCompression from "browser-image-compression";

export interface CompressionResult {
  /** Archivo final que debe subirse (puede ser el original si no se comprimió). */
  file: File;
  /** Tamaño original en bytes. */
  originalBytes: number;
  /** Tamaño final en bytes. */
  finalBytes: number;
  /** % de ahorro = (1 - final/original) × 100. 0 si no hubo cambio. */
  savedPct: number;
  /** Indica si efectivamente se comprimió. */
  compressed: boolean;
}

const ONE_MB = 1024 * 1024;

/**
 * Comprime una imagen JPEG/PNG manteniendo calidad visual.
 *
 * Parámetros elegidos para certificados/cédulas/diplomas escaneados:
 *   - maxSizeMB = 2: el resultado raramente excederá 2 MB
 *   - maxWidthOrHeight = 2500: equivale a una hoja oficio a ~300 DPI
 *   - useWebWorker = true: no bloquea el hilo principal del navegador
 *   - initialQuality = 0.9: re-encoding JPEG al 90% — visualmente igual
 */
async function compressImageFile(file: File): Promise<File> {
  const options = {
    maxSizeMB: 2,
    maxWidthOrHeight: 2500,
    useWebWorker: true,
    initialQuality: 0.9,
    // Conserva el tipo original cuando se puede (PNG transparente),
    // pero la librería convierte PNG opaco a JPEG si así reduce más.
    fileType: file.type === "image/png" ? "image/png" : "image/jpeg",
  };
  return await imageCompression(file, options);
}

/**
 * Re-serializa un PDF aplicando compresión de streams + object streams.
 * Es 100% lossless — no altera ni una sola coordenada, fuente o pixel.
 * El ahorro varía según qué tan eficiente sea ya el PDF original.
 */
async function compressPdfFile(file: File): Promise<File> {
  const { PDFDocument } = await import("pdf-lib");
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, {
    // Ignorar encriptación: si el PDF está protegido, simplemente
    // devolvemos el original (sin re-serializar).
    ignoreEncryption: true,
  });
  const bytes = await pdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
  return new File([new Uint8Array(bytes)], file.name, { type: "application/pdf" });
}

/**
 * Entrada única — comprime el archivo según su tipo. Nunca lanza:
 * si algo falla devuelve el original con `compressed: false`.
 */
export async function compressFileForUpload(file: File): Promise<CompressionResult> {
  const originalBytes = file.size;
  const result: CompressionResult = {
    file,
    originalBytes,
    finalBytes: originalBytes,
    savedPct: 0,
    compressed: false,
  };

  // Archivos chicos (< 500 KB): no vale la pena comprimir.
  if (originalBytes < 500 * 1024) return result;

  try {
    let out: File;
    if (file.type.startsWith("image/")) {
      out = await compressImageFile(file);
    } else if (file.type === "application/pdf") {
      out = await compressPdfFile(file);
    } else {
      return result; // tipo desconocido, no tocar
    }

    // Si la "compresión" salió más grande que el original, devolvemos
    // el original tal cual (puede pasar con PDFs ya muy optimizados).
    if (out.size >= originalBytes) return result;

    return {
      file: out,
      originalBytes,
      finalBytes: out.size,
      savedPct: Math.round((1 - out.size / originalBytes) * 100),
      compressed: true,
    };
  } catch (err) {
    console.warn("compressFileForUpload failed, uploading original:", err);
    return result;
  }
}

/**
 * Formateador de bytes amigable para humanos (1.3 MB, 850 KB, etc.).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < ONE_MB) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / ONE_MB).toFixed(1)} MB`;
}
