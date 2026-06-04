import { readFileByKey, EXT_TO_MIME, extFromName, isImageKey, IMAGE_EXTS } from "@/lib/storage";

/// Sirve activos de marca públicos (logo / firma del suscriptor) que aparecen
/// en certificados y diplomas verificables públicamente. Solo expone claves bajo
/// el prefijo "org/" para no filtrar evidencias privadas de candidatos.
///
/// Tolera URLs sin extensión (p. ej. `/api/brand/org/<sub>/logo`): en ese caso
/// intenta servir el archivo añadiendo `.png`, `.jpg` o `.jpeg`. Esto facilita
/// que un suscriptor pegue una URL "limpia" en el campo del panel sin tener
/// que conocer la extensión exacta que generó el almacenamiento.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await params;
  const key = (segments ?? []).join("/");

  // Restricción de seguridad: solo activos de marca, sin path traversal.
  if (!key.startsWith("org/") || key.includes("..")) {
    return new Response("No encontrado", { status: 404 });
  }

  // Construimos la lista de claves candidatas:
  //  - Si la key ya trae extensión válida, la usamos tal cual.
  //  - Si no, probamos .png, .jpg, .jpeg en ese orden.
  const candidates: string[] = isImageKey(key)
    ? [key]
    : [...IMAGE_EXTS].map((ext) => `${key}.${ext}`);

  for (const candidate of candidates) {
    try {
      const buf = await readFileByKey(candidate);
      const ext = extFromName(candidate);
      const mime = EXT_TO_MIME[ext] ?? "application/octet-stream";
      return new Response(new Uint8Array(buf), {
        headers: {
          "Content-Type": mime,
          "Content-Disposition": "inline",
          // Activo de marca público: cacheable.
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    } catch {
      // Probar siguiente candidato.
    }
  }
  return new Response("Archivo no disponible", { status: 404 });
}
