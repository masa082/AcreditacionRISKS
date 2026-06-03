import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// ============================================================================
//  Almacenamiento de archivos (documentos/evidencias de candidatos).
//  - Si STORAGE_S3_* está configurado → object storage S3-compatible
//    (Railway bucket / S3). Funciona en serverless (Vercel).
//  - Si no → sistema de archivos local (desarrollo).
//  Misma interfaz pública (saveUpload/readFileByKey/deleteByKey) en ambos casos.
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

// ----------------------- Backend S3 (opcional) -----------------------

const S3_BUCKET = process.env.STORAGE_S3_BUCKET;
const useS3 = !!(S3_BUCKET && process.env.STORAGE_S3_ENDPOINT && process.env.STORAGE_S3_ACCESS_KEY_ID);

let _s3: S3Client | null = null;
function s3(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.STORAGE_S3_REGION || "auto",
      endpoint: process.env.STORAGE_S3_ENDPOINT,
      forcePathStyle: process.env.STORAGE_S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return _s3;
}

// ----------------------- API pública -----------------------

/// Guarda un archivo subido y devuelve su clave relativa (no ruta absoluta).
export async function saveUpload(
  file: File,
  parts: string[],
): Promise<{ key: string; size: number; ext: string }> {
  const ext = MIME_TO_EXT[file.type] || extFromName(file.name) || "bin";
  const safeName = sanitize(file.name).slice(-80) || `archivo.${ext}`;
  const id = randomBytes(8).toString("hex");
  const key = [...parts.map(sanitize), `${id}-${safeName}`].join("/");
  const buf = Buffer.from(await file.arrayBuffer());

  if (useS3) {
    await s3().send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buf,
        ContentType: EXT_TO_MIME[ext] ?? "application/octet-stream",
      }),
    );
  } else {
    const abs = path.join(BASE, key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, buf);
  }
  return { key, size: buf.length, ext };
}

/// Resuelve una clave local a ruta absoluta, protegiendo contra path traversal.
function resolveKey(key: string): string {
  const abs = path.resolve(BASE, key);
  const base = path.resolve(BASE);
  if (abs !== base && !abs.startsWith(base + path.sep)) {
    throw new Error("Clave de archivo inválida");
  }
  return abs;
}

export async function readFileByKey(key: string): Promise<Buffer> {
  if (useS3) {
    const res = await s3().send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }
  return fs.readFile(resolveKey(key));
}

export async function deleteByKey(key: string): Promise<void> {
  try {
    if (useS3) {
      await s3().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    } else {
      await fs.unlink(resolveKey(key));
    }
  } catch {
    /* archivo ya no existe */
  }
}
