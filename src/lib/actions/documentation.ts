"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformAction, requireSubscriberAction } from "@/lib/guards";
import { saveUpload } from "@/lib/storage";
import type { ActionResult } from "@/lib/actions/schemes";

/**
 * Gestión del catálogo de documentos visibles en /documentacion.
 *
 * Reglas de scope:
 *   - SUSCRIPTOR (panel del organismo): documentos PROPIOS del tenant.
 *     subscriberId queda fijado al ctx; no puede tocar globales ni
 *     documentos de otros suscriptores.
 *   - SUPERADMIN: documentos GLOBALES (subscriberId = null). Estos
 *     aparecen para todos los suscriptores y candidatos del SaaS.
 *
 * Subida de archivo:
 *   - El formulario acepta dos campos `file` opcionales: `pdf` y `docx`.
 *   - Si vienen, se almacenan vía `saveUpload` (S3 si está configurado;
 *     filesystem local en dev).
 *   - La URL servida al usuario es `/api/docs-file/{key}` que actúa de
 *     proxy autenticado/público según el documento.
 *   - También se acepta `pdfUrlRaw` / `docxUrlRaw` para apuntar a un PDF
 *     ya servido externamente (p. ej. `/docs/Foo.pdf` estático en
 *     /public). Cuando se sube un archivo, la URL raw se sobreescribe.
 */

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,80}[a-z0-9])?$/;
const TITLE_MAX = 160;
const DESC_MAX = 2000;

const baseSchema = z.object({
  slug: z.string().regex(SLUG_RE, "Use letras minúsculas, números y guiones (3–80 chars)."),
  title: z.string().trim().min(3).max(TITLE_MAX),
  description: z.string().trim().max(DESC_MAX).optional().nullable(),
  version: z.string().trim().max(40).optional().nullable(),
  category: z.string().trim().max(40).optional().nullable(),
  audience: z.array(z.enum(["CANDIDATE", "SUBSCRIBER", "SUPERADMIN"])).default([]),
  visible: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  pdfUrlRaw: z.string().trim().max(500).optional().nullable(),
  docxUrlRaw: z.string().trim().max(500).optional().nullable(),
});

/// Sube un File si vino con tamaño; devuelve la URL para usar en BD.
async function uploadIfPresent(
  raw: FormDataEntryValue | null,
  scopeFolder: string,
  kind: "pdf" | "docx",
): Promise<{ url: string; sizeKB: number } | null> {
  if (!raw || typeof raw === "string") return null;
  const file = raw as File;
  if (!file.size) return null;
  const { key, size } = await saveUpload(file, ["documentation", scopeFolder, kind]);
  return {
    url: `/api/docs-file/${encodeURIComponent(key)}`,
    sizeKB: Math.max(1, Math.round(size / 1024)),
  };
}

/// Parsea el form y construye el payload validado + uploads procesados.
async function parsePayload(formData: FormData, scopeFolder: string) {
  const parsed = baseSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description") || null,
    version: formData.get("version") || null,
    category: formData.get("category") || null,
    audience: (formData.getAll("audience") as string[]).filter(Boolean),
    visible: formData.get("visible") === "on" || formData.get("visible") === "true",
    sortOrder: formData.get("sortOrder") ?? 0,
    pdfUrlRaw: formData.get("pdfUrlRaw") || null,
    docxUrlRaw: formData.get("docxUrlRaw") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Datos inválidos" } as const;
  }
  const pdfUpload = await uploadIfPresent(formData.get("pdf"), scopeFolder, "pdf");
  const docxUpload = await uploadIfPresent(formData.get("docx"), scopeFolder, "docx");
  return { data: parsed.data, pdfUpload, docxUpload } as const;
}

// ─── Crear/actualizar documento del SUSCRIPTOR ────────────────────────
export async function upsertSubscriberDocAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { subscriberId, ctx } = await requireSubscriberAction("ORG_MANAGE");
    const id = (formData.get("id") as string) || null;
    const result = await parsePayload(formData, subscriberId);
    if ("error" in result) return { ok: false, error: result.error };
    const { data, pdfUpload, docxUpload } = result;

    // Compone los campos finales de URL: prioridad subida > raw > existente.
    const pdfPayload = pdfUpload
      ? { pdfUrl: pdfUpload.url, pdfSizeKB: pdfUpload.sizeKB }
      : data.pdfUrlRaw
      ? { pdfUrl: data.pdfUrlRaw }
      : {};
    const docxPayload = docxUpload
      ? { docxUrl: docxUpload.url, docxSizeKB: docxUpload.sizeKB }
      : data.docxUrlRaw
      ? { docxUrl: data.docxUrlRaw }
      : {};

    if (id) {
      const existing = await prisma.documentation.findFirst({
        where: { id, subscriberId },
      });
      if (!existing) return { ok: false, error: "Documento no encontrado" };
      if (existing.seedSlug) return { ok: false, error: "Los documentos del sistema no se editan." };
      await prisma.documentation.update({
        where: { id },
        data: {
          slug: data.slug,
          title: data.title,
          description: data.description,
          version: data.version,
          category: data.category,
          audience: data.audience,
          visible: data.visible,
          sortOrder: data.sortOrder,
          ...pdfPayload,
          ...docxPayload,
        },
      });
    } else {
      await prisma.documentation.create({
        data: {
          subscriberId,
          uploadedById: ctx.userId,
          slug: data.slug,
          title: data.title,
          description: data.description,
          version: data.version,
          category: data.category,
          audience: data.audience,
          visible: data.visible,
          sortOrder: data.sortOrder,
          pdfUrl: pdfPayload.pdfUrl ?? null,
          pdfSizeKB: ("pdfSizeKB" in pdfPayload ? pdfPayload.pdfSizeKB : null) ?? null,
          docxUrl: docxPayload.docxUrl ?? null,
          docxSizeKB: ("docxSizeKB" in docxPayload ? docxPayload.docxSizeKB : null) ?? null,
        },
      });
    }
    revalidatePath("/panel/documentacion");
    revalidatePath("/documentacion");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: messageFor(e) };
  }
}

// ─── Crear/actualizar documento GLOBAL (SUPERADMIN) ───────────────────
export async function upsertGlobalDocAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await requirePlatformAction();
    const id = (formData.get("id") as string) || null;
    const result = await parsePayload(formData, "global");
    if ("error" in result) return { ok: false, error: result.error };
    const { data, pdfUpload, docxUpload } = result;

    const pdfPayload = pdfUpload
      ? { pdfUrl: pdfUpload.url, pdfSizeKB: pdfUpload.sizeKB }
      : data.pdfUrlRaw
      ? { pdfUrl: data.pdfUrlRaw }
      : {};
    const docxPayload = docxUpload
      ? { docxUrl: docxUpload.url, docxSizeKB: docxUpload.sizeKB }
      : data.docxUrlRaw
      ? { docxUrl: data.docxUrlRaw }
      : {};

    if (id) {
      const existing = await prisma.documentation.findUnique({ where: { id } });
      if (!existing) return { ok: false, error: "Documento no encontrado" };
      // En documentos seed permitimos editar metadatos pero NO el slug.
      const slugUpdate = existing.seedSlug ? {} : { slug: data.slug };
      await prisma.documentation.update({
        where: { id },
        data: {
          ...slugUpdate,
          title: data.title,
          description: data.description,
          version: data.version,
          category: data.category,
          audience: data.audience,
          visible: data.visible,
          sortOrder: data.sortOrder,
          ...pdfPayload,
          ...docxPayload,
        },
      });
    } else {
      await prisma.documentation.create({
        data: {
          subscriberId: null,
          uploadedById: ctx.userId,
          slug: data.slug,
          title: data.title,
          description: data.description,
          version: data.version,
          category: data.category,
          audience: data.audience,
          visible: data.visible,
          sortOrder: data.sortOrder,
          pdfUrl: pdfPayload.pdfUrl ?? null,
          pdfSizeKB: ("pdfSizeKB" in pdfPayload ? pdfPayload.pdfSizeKB : null) ?? null,
          docxUrl: docxPayload.docxUrl ?? null,
          docxSizeKB: ("docxSizeKB" in docxPayload ? docxPayload.docxSizeKB : null) ?? null,
        },
      });
    }
    revalidatePath("/admin/documentacion");
    revalidatePath("/documentacion");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: messageFor(e) };
  }
}

// ─── Eliminar documento (cada rol solo en su scope) ───────────────────
export async function deleteDocAction(
  id: string,
  scope: "subscriber" | "platform",
): Promise<ActionResult> {
  try {
    if (scope === "subscriber") {
      const { subscriberId } = await requireSubscriberAction("ORG_MANAGE");
      const doc = await prisma.documentation.findFirst({ where: { id, subscriberId } });
      if (!doc) return { ok: false, error: "Documento no encontrado" };
      if (doc.seedSlug) return { ok: false, error: "Los documentos del sistema no se eliminan." };
      await prisma.documentation.delete({ where: { id } });
      revalidatePath("/panel/documentacion");
    } else {
      await requirePlatformAction();
      const doc = await prisma.documentation.findUnique({ where: { id } });
      if (!doc) return { ok: false, error: "Documento no encontrado" };
      if (doc.seedSlug) return { ok: false, error: "Los documentos del sistema no se eliminan." };
      await prisma.documentation.delete({ where: { id } });
      revalidatePath("/admin/documentacion");
    }
    revalidatePath("/documentacion");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: messageFor(e) };
  }
}

function messageFor(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "UNAUTHENTICATED") return "No has iniciado sesión.";
    if (e.message.startsWith("FORBIDDEN")) return "No tienes permisos para esta acción.";
    return e.message;
  }
  return "Error desconocido";
}
