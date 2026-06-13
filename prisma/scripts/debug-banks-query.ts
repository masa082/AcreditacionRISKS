/**
 * DEBUG (solo lectura) — reproduce la query de /panel/preguntas para
 * cada suscriptor y reporta si alguna falla. Ayuda a identificar la
 * causa del "Algo salió mal".
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const subscribers = await prisma.subscriber.findMany({
    select: { id: true, slug: true, legalName: true },
  });
  console.log(`→ ${subscribers.length} suscriptor(es) a probar.\n`);

  for (const sub of subscribers) {
    console.log("🏢", sub.slug, "—", sub.legalName);
    try {
      const banks = await prisma.questionBank.findMany({
        where: { subscriberId: sub.id },
        orderBy: { createdAt: "desc" },
        include: {
          scheme: { select: { name: true } },
          _count: { select: { questions: true } },
        },
      });
      console.log(`   ✓ ${banks.length} banco(s) listado(s) correctamente.`);
      for (const b of banks) {
        console.log(
          `      · ${b.code} — ${b.name} (${b._count.questions} preguntas, esquema: ${b.scheme?.name ?? "—"})`,
        );
      }

      // groupBy de aprobadas (la segunda parte de la query)
      const approved = await prisma.question.groupBy({
        by: ["bankId"],
        where: { subscriberId: sub.id, status: "APPROVED" },
        _count: { _all: true },
      });
      console.log(`   ✓ groupBy aprobadas → ${approved.length} bancos con aprobadas.`);
    } catch (e) {
      console.log("   ✗ Falló:", e instanceof Error ? e.message : String(e));
    }
    console.log("");
  }
}

main()
  .catch((e) => { console.error("✗", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
