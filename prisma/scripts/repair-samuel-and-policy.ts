/// Reparación operativa:
///
/// 1. Cambia la política operativa de los exámenes PRACTICAL del
///    suscriptor RISKS — `requireCommittee=false`, `autoCertificate=true`
///    — para que el caso práctico emita el certificado de competencias
///    automáticamente al aprobarse de aquí en adelante.
///
/// 2. Repara las inscripciones de Samuel Sánchez que quedaron bloqueadas
///    en COMMITTEE con reviews PENDING:
///      - INS-2026-0011 (Caso Práctico, 84.5%, passed) → cierra el
///        review, marca PASSED, emite el certificado de competencias.
///      - INS-2026-0010 (Teórico, 92%, passed) → cierra el review,
///        marca enrollment APPROVED y attempt PASSED. (El teórico no
///        emite certificado final; ese lo da el práctico.)

import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function newToken(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

async function generateCertificateCode(): Promise<string> {
  const year = new Date().getFullYear();
  // Probar 5 veces por colisión (muy improbable)
  for (let i = 0; i < 5; i++) {
    const code = `CIOC-${year}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const exists = await prisma.certificate.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error("No se pudo generar un código de certificado único.");
}

async function issueCertification(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true, email: true, documentNumber: true } },
      scheme: true,
      attempts: { where: { passed: true }, orderBy: { attemptNumber: "desc" }, take: 1 },
    },
  });
  if (!enrollment) return { ok: false as const, error: "Inscripción no encontrada." };

  const existing = await prisma.certificate.findFirst({
    where: { enrollmentId: enrollment.id, type: "CERTIFICATION", status: { not: "CANCELLED" } },
    select: { id: true, code: true, title: true },
  });
  if (existing) {
    return { ok: true as const, created: false, ...existing };
  }

  const scheme = enrollment.scheme;
  const validityMonths = scheme?.validityMonths ?? 36;
  const issuedAt = new Date();
  const expiresAt = validityMonths > 0
    ? new Date(new Date(issuedAt).setMonth(issuedAt.getMonth() + validityMonths))
    : null;
  const code = await generateCertificateCode();
  const holderName = `${enrollment.candidate.firstName} ${enrollment.candidate.lastName}`.trim();
  const title = scheme?.name ?? "Certificación de competencias";

  const cert = await prisma.certificate.create({
    data: {
      subscriberId: enrollment.subscriberId,
      candidateId: enrollment.candidateId,
      enrollmentId: enrollment.id,
      schemeId: enrollment.schemeId,
      attemptId: enrollment.attempts[0]?.id ?? null,
      type: "CERTIFICATION",
      code,
      verifyToken: newToken(16),
      title,
      scope: scheme?.scope ?? null,
      holderName,
      documentNumber: enrollment.candidate.documentNumber,
      status: "VALID",
      issuedAt,
      expiresAt,
    },
  });
  await prisma.enrollment.update({ where: { id: enrollment.id }, data: { status: "CERTIFIED" } });
  return { ok: true as const, created: true, id: cert.id, code: cert.code, title: cert.title };
}

async function main() {
  const updated = await prisma.exam.updateMany({
    where: { type: "PRACTICAL" },
    data: { requireCommittee: false, autoCertificate: true },
  });
  console.log(`[policy] ${updated.count} exámenes PRACTICAL → requireCommittee=false, autoCertificate=true`);

  const candidate = await prisma.candidate.findFirst({
    where: { documentNumber: "7182416" },
    include: {
      enrollments: {
        include: {
          attempts: { orderBy: { attemptNumber: "desc" }, take: 1 },
          reviews: { where: { decision: "PENDING" } },
          exam: { select: { name: true, type: true } },
        },
      },
    },
  });
  if (!candidate) {
    console.log("No se encontró a Samuel");
    return;
  }

  for (const e of candidate.enrollments) {
    const attempt = e.attempts[0];
    console.log(`\n[samuel] ${e.code} (${e.exam?.type}) status=${e.status} attempt=${attempt?.status} passed=${attempt?.passed}`);
    if (e.status !== "COMMITTEE" || !attempt?.passed) {
      console.log(`  · sin cambios`);
      continue;
    }
    for (const r of e.reviews) {
      await prisma.committeeReview.update({
        where: { id: r.id },
        data: {
          decision: "APPROVED",
          observations: "Cerrada por la nueva política operativa: el caso práctico emite certificado al aprobar; el teórico no requiere comité.",
          closedAt: new Date(),
        },
      });
      console.log(`  · review ${r.id} → APPROVED`);
    }
    if (e.exam?.type === "PRACTICAL") {
      await prisma.examAttempt.update({ where: { id: attempt.id }, data: { status: "PASSED" } });
      const res = await issueCertification(e.id);
      if (res.ok) {
        console.log(`  · attempt → PASSED, certificado ${res.created ? "EMITIDO" : "ya existía"}: ${res.code} (${res.title})`);
      } else {
        console.log(`  · ERROR emitiendo certificado: ${res.error}`);
      }
    } else {
      await prisma.examAttempt.update({ where: { id: attempt.id }, data: { status: "PASSED" } });
      await prisma.enrollment.update({ where: { id: e.id }, data: { status: "APPROVED" } });
      console.log(`  · attempt → PASSED, enrollment → APPROVED`);
    }
  }
  console.log("\n[OK] Reparación finalizada.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
