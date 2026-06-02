import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

// ============================================================================
//  Almacenamiento de archivos (documentos/evidencias de candidatos).
//  Implementación LOCAL (sistema de archivos) para desarrollo. En producción
//  (Vercel/serverless) debe sustituirse por object storage (Railway/S3) — la
//  interfaz (saveUpload/readFileByKey) está pensada para ese reemplazo.
// ============================================================================

const BASE = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), "storage", "uploads");

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB (Anexo A)

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

export const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export const IMAGE_EXTS = new Set(["jpg", "jpeg", "png"]);

export function extFromName(name: string): string {
  return path.extname(name).replace(".", "").toLowerCase();
}

export function isImageKey(keyOrName: string): boolean {
  return IMAGE_EXTS.has(extFromName(keyOrName));
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/// Guarda un archivo subido y devuelve su clave relativa (no ruta absoluta).
export async function saveUpload(
  file: File,
  parts: string[],
): Promise<{ key: string; size: number; ext: string }> {
  const ext = MIME_TO_EXT[file.type] || extFromName(file.name) || "bin";
  const safeName = sanitize(file.name).slice(-80) || `archivo.${ext}`;
  const id = randomBytes(8).toString("hex");
  const rel = [...parts.map(sanitize), `${id}-${safeName}`].join("/");
  const abs = path.join(BASE, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(abs, buf);
  return { key: rel, size: buf.length, ext };
}

/// Resuelve una clave a ruta absoluta, protegiendo contra path traversal.
function resolveKey(key: string): string {
  const abs = path.resolve(BASE, key);
  const base = path.resolve(BASE);
  if (abs !== base && !abs.startsWith(base + path.sep)) {
    throw new Error("Clave de archivo inválida");
  }
  return abs;
}

export async function readFileByKey(key: string): Promise<Buffer> {
  return fs.readFile(resolveKey(key));
}

export async function deleteByKey(key: string): Promise<void> {
  try {
    await fs.unlink(resolveKey(key));
  } catch {
    /* archivo ya no existe */
  }
}
