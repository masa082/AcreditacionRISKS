import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { CertificateCard, type CertificateRow } from "@/components/certificate-card";

export const metadata = { title: "Mis certificados" };

/**
 * Pantalla "Mis certificados" del portal del candidato.
 *
 * Cambios respecto a la versión anterior:
 *  - Se muestra cada certificado como una TARJETA con preview embebido
 *    del PDF (iframe del visor nativo del navegador).
 *  - Se agrega un CHIP con el "Puntaje obtenido" cuando el certificado
 *    está vinculado a un ExamAttempt — esa información SOLO aparece en
 *    esta pantalla, NUNCA en el PDF del certificado (el certificado
 *    sigue siendo un documento formal sin la nota).
 *  - Se preserva el flujo de descarga (botón con atributo `download=`)
 *    y un botón a la vista completa del diploma HTML para imprimir.
 *
 * NOTA — Por qué la información del puntaje SÓLO va en pantalla:
 *  El certificado/constancia es un documento formal verificable. Una
 *  vez emitido, su contenido es invariable y queda con la firma del
 *  organismo. El puntaje es información operativa del proceso del
 *  candidato (pertenece al expediente interno) y no se imprime para
 *  no condicionar al lector externo del certificado.
 */
export default async function CandidateCertificatesPage() {
  const { candidateId } = await requireCandidatePage();
  const certs = await prisma.certificate.findMany({
    where: { candidateId },
    orderBy: { issuedAt: "desc" },
    include: {
      // Solo lo necesario para mostrar el puntaje: el intento vinculado.
      // Si el certificado no tiene attemptId, simplemente no mostramos
      // chip de puntaje.
      attempt: {
        select: {
          rawScore: true,
          maxScore: true,
          scorePercent: true,
          passed: true,
          submittedAt: true,
        },
      },
    },
  });

  const rows: CertificateRow[] = certs.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    issuedAtIso: c.issuedAt.toISOString(),
    expiresAtIso: c.expiresAt ? c.expiresAt.toISOString() : null,
    status: c.status,
    // El verifyToken se usa para el iframe y la descarga. La URL pública
    // del PDF es /api/certificate/{verifyToken}/pdf y NO requiere sesión
    // (verifica por token de 192 bits).
    pdfUrl: `/api/certificate/${c.verifyToken}/pdf`,
    publicViewUrl: `/verificar/${c.code}`,
    // Puntaje — solo en pantalla.
    score: c.attempt
      ? {
          rawScore: c.attempt.rawScore?.toString() ?? null,
          maxScore: c.attempt.maxScore?.toString() ?? null,
          scorePercent: c.attempt.scorePercent?.toString() ?? null,
          passed: c.attempt.passed,
        }
      : null,
  }));

  return (
    <>
      <PageHeader
        title="Mis certificados"
        subtitle="Revise el certificado con la vista previa, vea el puntaje que obtuvo y descárguelo. Cada documento es verificable por QR."
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <EmptyState>Todavía no tiene certificados emitidos.</EmptyState>
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((r) => (
            <CertificateCard key={r.id} row={r} />
          ))}
        </div>
      )}
    </>
  );
}
