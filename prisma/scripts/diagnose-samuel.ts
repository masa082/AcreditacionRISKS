import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Buscar a Samuel Sánchez
  const candidate = await prisma.candidate.findFirst({
    where: {
      OR: [
        { documentNumber: "7182416" },
        { email: { contains: "samuel", mode: "insensitive" } },
      ],
    },
    include: {
      enrollments: {
        include: {
          exam: { select: { name: true, type: true, requireCommittee: true, autoCertificate: true, passingScore: true } },
          scheme: { select: { name: true } },
          attempts: {
            orderBy: { createdAt: "desc" },
            include: {
              exam: { select: { name: true, type: true, requireCommittee: true, autoCertificate: true, passingScore: true } },
            },
          },
          certificates: true,
          reviews: true,
        },
      },
    },
  });

  if (!candidate) {
    console.log("No se encontró candidato");
    return;
  }

  console.log(`\n=== ${candidate.firstName} ${candidate.lastName} (${candidate.documentNumber}) ===`);
  console.log(`Email: ${candidate.email}`);
  console.log(`Inscripciones: ${candidate.enrollments.length}\n`);

  for (const e of candidate.enrollments) {
    console.log(`--- Inscripción ${e.code} (${e.id}) ---`);
    console.log(`  Esquema: ${e.scheme?.name ?? "—"}`);
    console.log(`  Examen: ${e.exam?.name ?? "—"} (${e.exam?.type ?? "—"})`);
    console.log(`  Estado: ${e.status}`);
    if (e.exam) {
      console.log(`  requireCommittee: ${e.exam.requireCommittee} · autoCertificate: ${e.exam.autoCertificate} · passingScore: ${e.exam.passingScore}`);
    }
    console.log(`  Intentos: ${e.attempts.length}`);
    for (const a of e.attempts) {
      console.log(`    · ${a.id} | status=${a.status} | passed=${a.passed} | score=${a.scorePercent} | submitted=${a.submittedAt?.toISOString() ?? "—"} | graded=${a.gradedAt?.toISOString() ?? "—"}`);
    }
    console.log(`  Certificados: ${e.certificates.length}`);
    for (const c of e.certificates) {
      console.log(`    · ${c.code} | type=${c.type} | status=${c.status} | issued=${c.issuedAt.toISOString()}`);
    }
    console.log(`  Reviews comité: ${e.reviews.length}`);
    for (const r of e.reviews) {
      console.log(`    · ${r.id} | decision=${r.decision} | closed=${r.closedAt?.toISOString() ?? "—"}`);
    }
    console.log();
  }
}

main().finally(() => prisma.$disconnect());
