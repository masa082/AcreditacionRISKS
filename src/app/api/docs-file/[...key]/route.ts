import { readFileByKey, EXT_TO_MIME, extFromName } from "@/lib/storage";

/**
 * Sirve un archivo del catálogo de Documentation.
 *
 * Acceso: público (los documentos del catálogo /documentacion son
 * accesibles por candidatos, suscriptores, admin y visitantes sin
 * login). El path se compone como /api/docs-file/{key} donde {key} es
 * la ruta del archivo en el bucket S3 / disco local, tal como se
 * guardó vía `saveUpload`. La ruta usa segmento dinámico `[...key]`
 * para capturar slashes internos del key.
 *
 * No hay autorización adicional: si el documento existe en BD y está
 * marcado como visible, su contenido es público. Esto refleja el
 * comportamiento esperado de un catálogo institucional.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const composedKey = key.join("/");
  // Defensa: solo permitimos servir desde el prefix "documentation/" para
  // evitar exponer otros archivos del bucket vía esta ruta.
  if (!composedKey.startsWith("documentation/")) {
    return new Response("Ruta no permitida", { status: 403 });
  }
  let buf: Buffer;
  try {
    buf = await readFileByKey(composedKey);
  } catch {
    return new Response("Archivo no encontrado", { status: 404 });
  }
  const ext = extFromName(composedKey);
  const mime = EXT_TO_MIME[ext] ?? "application/octet-stream";
  return new Response(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=300",
      "Content-Disposition": `inline; filename="${composedKey.split("/").pop()}"`,
    },
  });
}
