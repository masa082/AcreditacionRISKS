import { readFileByKey, EXT_TO_MIME, extFromName, isImageKey } from "@/lib/storage";

/// Sirve activos de marca públicos (logo / firma del suscriptor) que aparecen
/// en certificados y diplomas verificables públicamente. Solo expone claves bajo
/// el prefijo "org/" para no filtrar evidencias privadas de candidatos.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await params;
  const key = (segments ?? []).join("/");

  // Restricción de seguridad: solo activos de marca y solo imágenes.
  if (!key.startsWith("org/") || key.includes("..") || !isImageKey(key)) {
    return new Response("No encontrado", { status: 404 });
  }

  let buf: Buffer;
  try {
    buf = await readFileByKey(key);
  } catch {
    return new Response("Archivo no disponible", { status: 404 });
  }

  const ext = extFromName(key);
  const mime = EXT_TO_MIME[ext] ?? "application/octet-stream";

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": "inline",
      // Activo de marca público: cacheable.
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
