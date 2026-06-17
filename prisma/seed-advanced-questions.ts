/**
 * Seed ADITIVO — 50 preguntas avanzadas basadas en Resolución 2328 de 2025
 * para enriquecer el banco SARLAFT con mayor complejidad y cobertura temática.
 *
 * Ejecutar: npx tsx prisma/seed-advanced-questions.ts
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

interface QRecord {
  code: string;
  statement: string;
  options: string[];
  answerIndex: number;
  difficulty: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  topicCode: string;
  topicName: string;
}

function loadBank(file: string): QRecord[] {
  const p = path.join(process.cwd(), "prisma", "data", file);
  return JSON.parse(fs.readFileSync(p, "utf8")) as QRecord[];
}

async function main() {
  console.log("📚 Cargando 50 preguntas avanzadas basadas en Resolución 2328...");

  // Cargar las preguntas del archivo JSON
  const advQuestions = loadBank("ocp-advanced-questions.json");

  // Obtener el suscriptor OCP (Risks International)
  const subscriber = await prisma.subscriber.findFirst({
    where: { tradeName: { contains: "RISKS" } },
  });
  if (!subscriber) {
    console.error("❌ No se encontró suscriptor 'Risks'. Ejecuta primero: npm run db:seed:ocp");
    process.exit(1);
  }

  // Obtener la competencia y el banco SARLAFT
  const competency = await prisma.competency.findFirst({
    where: { subscriberId: subscriber.id, code: "ST-OCIDON" },
  });
  if (!competency) {
    console.error("❌ No se encontró competencia 'ST-OCIDON'. Ejecuta primero: npm run db:seed:ocp");
    process.exit(1);
  }

  const bank = await prisma.questionBank.findFirst({
    where: { subscriberId: subscriber.id, code: "ST-BANK-OCP" },
  });
  if (!bank) {
    console.error("❌ No se encontró banco 'ST-BANK-OCP'. Ejecuta primero: npm run db:seed:ocp");
    process.exit(1);
  }

  // Mapear temas y encontrar o crear tópicos
  const themeMap: Record<string, string> = {
    T1: "Marco Normativo",
    T2: "Enfoque Basado en Riesgo",
    T3: "Debida Diligencia",
    T4: "Monitoreo Transaccional",
    T5: "Reportes ROS y ROI",
    T6: "Rol del Oficial de Cumplimiento",
    T7: "Ética y Confidencialidad",
  };

  const topicMap: Record<string, string> = {};
  for (const [code, name] of Object.entries(themeMap)) {
    const topic = await prisma.topic.upsert({
      where: { subscriberId_code: { subscriberId: subscriber.id, code: `ST-${code}` } },
      update: { name, competencyId: competency.id },
      create: {
        subscriberId: subscriber.id,
        code: `ST-${code}`,
        name,
        competencyId: competency.id,
      },
    });
    topicMap[code] = topic.id;
  }

  // Obtener autor y revisor (usuarios SUBSCRIBER del suscriptor)
  const authorReviewers = await prisma.user.findMany({
    where: { subscriberId: subscriber.id, type: "SUBSCRIBER" },
    take: 2,
  });
  if (authorReviewers.length < 2) {
    console.error("❌ No hay suficientes usuarios SUBSCRIBER en RISKS");
    process.exit(1);
  }
  const [author, reviewer] = authorReviewers;

  // Insertar preguntas (upsert por código para idempotencia)
  let created = 0,
    updated = 0;
  const now = new Date();

  for (const q of advQuestions) {
    const topicId = topicMap[q.topicCode];
    if (!topicId) {
      console.warn(`⚠ Tópico ${q.topicCode} no encontrado para pregunta ${q.code}`);
      continue;
    }

    // Crear opciones
    const optionsData = q.options.map((text, i) => ({
      text,
      isCorrect: i === q.answerIndex,
      order: i,
    }));

    const existing = await prisma.question.findFirst({
      where: { subscriberId: subscriber.id, bankId: bank.id, code: q.code },
    });

    if (existing) {
      // Update si existe
      await prisma.question.update({
        where: { id: existing.id },
        data: {
          statement: q.statement,
          difficulty: q.difficulty,
          topicId,
          status: "APPROVED",
          options: {
            deleteMany: {},
            create: optionsData,
          },
        },
      });
      updated++;
    } else {
      // Create si no existe
      await prisma.question.create({
        data: {
          subscriberId: subscriber.id,
          bankId: bank.id,
          code: q.code,
          statement: q.statement,
          type: "SINGLE_CHOICE",
          difficulty: q.difficulty,
          topicId,
          competencyId: competency.id,
          points: new Prisma.Decimal(1),
          status: "APPROVED",
          authorId: author.id,
          reviewerId: reviewer.id,
          approvedAt: now,
          options: {
            create: optionsData,
          },
        },
      });
      created++;
    }
  }

  console.log(`✅ Operación completada:`);
  console.log(`   Creadas: ${created} preguntas`);
  console.log(`   Actualizadas: ${updated} preguntas`);
  console.log(`   Total en banco: ${created + updated} preguntas avanzadas`);
  console.log(`🎓 Banco enriquecido con cobertura avanzada de Resolución 2328.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
