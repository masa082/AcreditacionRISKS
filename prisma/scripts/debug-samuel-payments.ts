/**
 * DEBUG (solo lectura) — investiga los pagos de Samuel Sánchez en
 * todas sus inscripciones para entender por qué la tabla de candidatos
 * muestra "—" en la columna Pago.
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
          payments: { orderBy: { createdAt: "asc" } },
          exam: { select: { name: true, requirePayment: true } },
          scheme: { select: { name: true } },
        },
      },
    },
  });
  if (!candidate) return console.log("NO CANDIDATE");

  for (const e of candidate.enrollments) {
    console.log("📂", e.code, "·", e.exam?.name ?? e.scheme?.name);
    console.log("   status:", e.status, "· examen requiere pago:", e.exam?.requirePayment);
    console.log("   pagos (" + e.payments.length + "):");
    for (const p of e.payments) {
      console.log(
        "     ·",
        p.status,
        "· $",
        p.amount.toString(),
        p.currency,
        "· ref:",
        p.providerRef ?? "(none)",
        "· created:",
        p.createdAt.toISOString(),
      );
      if (p.paidAt) console.log("       paidAt:", p.paidAt.toISOString());
      if (p.receiptUrl) console.log("       receipt:", p.receiptUrl.slice(0, 80));
    }
  }
}

main()
  .catch((e) => { console.error("✗", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
