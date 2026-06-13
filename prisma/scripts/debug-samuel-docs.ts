/**
 * DEBUG (solo lectura) — verifica si la herencia de documentos
 * aprobados debería estar ocurriendo entre las dos inscripciones de
 * Samuel Sánchez. Imprime el cruce entre RequiredDocument y los docs
 * APPROVED del candidato.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const candidate = await prisma.candidate.findFirst({
    where: { email: "samuxarmandox@gmail.com" },
    include: {
      enrollments: {
        orderBy: { createdAt: "asc" },
        include: {
          documents: { include: { requiredDocument: true } },
        },
      },
    },
  });
  if (!candidate) return console.log("NO CANDIDATE");

  const teor = candidate.enrollments.find((e) => e.code === "INS-2026-0010");
  const caso = candidate.enrollments.find((e) => e.code === "INS-2026-0011");
  if (!teor || !caso) return console.log("Enrollments faltantes");

  console.log("Teórico:", teor.code, "scheme:", teor.schemeId);
  console.log("Caso:   ", caso.code, "scheme:", caso.schemeId);
  console.log("¿Mismo schemeId?", teor.schemeId === caso.schemeId);
  console.log("");

  // Requeridos PARA EL CASO PRÁCTICO (ese es el que debe heredar).
  const reqDocs = await prisma.requiredDocument.findMany({
    where: { subscriberId: caso.subscriberId, schemeId: caso.schemeId, isActive: true, required: true },
    orderBy: { code: "asc" },
  });
  console.log("📋 RequiredDocument para el esquema (Caso Práctico hereda éstos):");
  for (const r of reqDocs) {
    console.log("   ·", r.code, "(id:", r.id.slice(-6), ")", "—", r.name);
  }
  console.log("");

  // Docs APROBADOS del candidato para este esquema (en CUALQUIER otra inscripción).
  const inherited = await prisma.candidateDocument.findMany({
    where: {
      requiredDocumentId: { in: reqDocs.map((r) => r.id) },
      status: "APPROVED",
      enrollment: {
        candidateId: candidate.id,
        schemeId: caso.schemeId,
        NOT: { id: caso.id },
      },
    },
    include: { requiredDocument: { select: { code: true, name: true } } },
  });
  console.log("✅ Docs APROBADOS de otras inscripciones del mismo esquema (deberían heredarse):");
  const inhSet = new Set<string>();
  for (const d of inherited) {
    inhSet.add(d.requiredDocumentId!);
    console.log("   ·", d.requiredDocument?.code, "—", d.fileName, "·", d.status);
  }
  console.log("");

  // Cuáles requeridos NO tienen doc heredado (los que se pedirían):
  const missing = reqDocs.filter((r) => !inhSet.has(r.id));
  console.log("🟡 Requeridos que NO se heredan (faltan):");
  if (missing.length === 0) {
    console.log("   ¡NINGUNO! El Caso Práctico debe arrancar con docs en orden.");
  } else {
    for (const m of missing) console.log("   ·", m.code, "—", m.name);
  }
  console.log("");

  // Status actual del Caso Práctico
  console.log("Status actual de", caso.code, ":", caso.status);
  console.log("  (debería ser READY si todos los req docs están heredados)");

  // Simula computeJourney para Caso Práctico
  console.log("");
  console.log("Simulación de computeJourney para el Caso Práctico:");
  const submittedLocal = await prisma.candidateDocument.findMany({
    where: { enrollmentId: caso.id, requiredDocumentId: { in: reqDocs.map((r) => r.id) }, status: { not: "REJECTED" } },
    select: { requiredDocumentId: true },
  });
  console.log("  Docs LOCALES no-rechazados del Caso Práctico:", submittedLocal.length);
  console.log("  Docs HEREDADOS aprobados:", inherited.length);
  const ok = new Set<string>();
  for (const d of submittedLocal) if (d.requiredDocumentId) ok.add(d.requiredDocumentId);
  for (const d of inherited) if (d.requiredDocumentId) ok.add(d.requiredDocumentId);
  console.log("  Set OK union:", ok.size, "/", reqDocs.length);
  const docsDone = reqDocs.every((d) => ok.has(d.id));
  console.log("  → docsDone =", docsDone);
}

main()
  .catch((e) => { console.error("✗", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
