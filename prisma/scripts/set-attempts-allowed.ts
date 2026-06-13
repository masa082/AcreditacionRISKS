/**
 * Script idempotente — eleva `Exam.attemptsAllowed` a 3 en los exámenes
 * SARLAFT y SAGRILAFT (Examen Teórico + Caso Práctico) para que los
 * candidatos puedan reintentar si no aprueban a la primera.
 *
 * Antes era 1: un único intento. Ahora 3: el primero más dos
 * reintentos con preguntas distintas y mayor grado de dificultad
 * (manejado por buildAttemptQuestions con excludeQuestionIds +
 * difficultyBoost).
 *
 * Es seguro correrlo varias veces — solo actualiza filas que aún
 * tengan attemptsAllowed < 3.
 *
 * Uso:
 *   - LOCAL:  npm run set:attempts
 *   - PROD:   DATABASE_URL="<railway-url>" npm run set:attempts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_ALLOWED = 3;

// Prefijos de código que identifican los exámenes Risks. Si más
// adelante se agregan otros esquemas (SAGRILAFT, etc.), bastará con
// extender este array.
const CODE_PREFIXES = ["ST-EX-", "SG-EX-", "ST-CASO-", "SG-CASO-"];

async function main() {
  const exams = await prisma.exam.findMany({
    where: {
      OR: CODE_PREFIXES.map((p) => ({ code: { startsWith: p } })),
    },
    select: { id: true, code: true, name: true, attemptsAllowed: true },
  });

  console.log(`→ ${exams.length} examen(es) encontrado(s):`);
  let changed = 0;
  for (const e of exams) {
    if (e.attemptsAllowed >= TARGET_ALLOWED) {
      console.log(`   • ${e.code} (ya en ${e.attemptsAllowed} — sin cambios)`);
      continue;
    }
    await prisma.exam.update({
      where: { id: e.id },
      data: { attemptsAllowed: TARGET_ALLOWED },
    });
    console.log(`   ✓ ${e.code}: ${e.attemptsAllowed} → ${TARGET_ALLOWED}`);
    changed++;
  }
  console.log(`\n✅ ${changed}/${exams.length} examen(es) actualizado(s) a ${TARGET_ALLOWED} intentos.`);
}

main()
  .catch((e) => {
    console.error("✗", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
