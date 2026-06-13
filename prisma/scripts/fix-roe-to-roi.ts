/**
 * Script idempotente — Corrige el acrónimo "ROE" → "ROI" en el banco
 * de preguntas, los nombres de tópico y las opciones, tanto para
 * SARLAFT (Supertransporte) como para SAGRILAFT (Supersociedades).
 *
 * Causa raíz:
 *   El seed original usaba "ROE" como acrónimo de "Reporte de Operación
 *   Intentada", pero el término técnicamente correcto en la doctrina
 *   UIAF es **ROI = Reporte de Operaciones Inusuales**. Este script
 *   actualiza la BD viva sin re-ejecutar el seed completo (que
 *   duplicaría preguntas).
 *
 * Cambios aplicados:
 *   - Tópico nombre:  "Reportes ROS y ROE"  →  "Reportes ROS y ROI"
 *   - Pregunta.statement:
 *       "Reporte de Operación Intentada"  →  "Reporte de Operaciones Inusuales"
 *       "ROE" (palabra completa)          →  "ROI"
 *   - QuestionOption.text: idem.
 *
 * Uso:
 *   - LOCAL: npm run fix:roe-to-roi
 *   - PROD:  DATABASE_URL="<railway-url>" npm run fix:roe-to-roi
 *
 * Es seguro correrlo varias veces — solo actualiza filas que aún
 * contienen "ROE" o "Reporte de Operación Intentada".
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Cualquier ocurrencia de ROE como palabra independiente (no como
// sub-string de otra palabra). \bROE\b en JS.
const ROE_RX = /\bROE\b/g;
const INTENTADA_RX = /Reporte de Operaci[oó]n Intentada/g;
const INTENTADA2_RX = /Reporte Operaci[oó]n Intentada/g;

function fix(text: string | null | undefined): string | null {
  if (text == null) return text ?? null;
  let s = text;
  s = s.replace(INTENTADA_RX, "Reporte de Operaciones Inusuales");
  s = s.replace(INTENTADA2_RX, "Reporte de Operaciones Inusuales");
  s = s.replace(ROE_RX, "ROI");
  return s;
}

function changed(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "") !== (b ?? "");
}

async function main() {
  console.log("→ Buscando preguntas/opciones/tópicos con 'ROE' o 'Operación Intentada'...");

  // 1. Topics
  const topics = await prisma.topic.findMany({
    where: { OR: [{ name: { contains: "ROE" } }, { name: { contains: "Operación Intentada" } }] },
  });
  let topicCount = 0;
  for (const t of topics) {
    const nameNext = fix(t.name) ?? t.name;
    if (changed(t.name, nameNext)) {
      await prisma.topic.update({
        where: { id: t.id },
        data: { name: nameNext },
      });
      topicCount++;
    }
  }
  console.log(`  ✓ ${topicCount} tópico(s) actualizado(s)`);

  // 2. Questions
  const questions = await prisma.question.findMany({
    where: {
      OR: [
        { statement: { contains: "ROE" } },
        { statement: { contains: "Operación Intentada" } },
      ],
    },
    select: { id: true, statement: true },
  });
  let qCount = 0;
  for (const q of questions) {
    const next = fix(q.statement) ?? q.statement;
    if (changed(q.statement, next)) {
      await prisma.question.update({
        where: { id: q.id },
        data: { statement: next },
      });
      qCount++;
    }
  }
  console.log(`  ✓ ${qCount} pregunta(s) actualizada(s)`);

  // 3. QuestionOption
  const opts = await prisma.questionOption.findMany({
    where: {
      OR: [
        { text: { contains: "ROE" } },
        { text: { contains: "Operación Intentada" } },
      ],
    },
    select: { id: true, text: true },
  });
  let oCount = 0;
  for (const o of opts) {
    const next = fix(o.text) ?? o.text;
    if (changed(o.text, next)) {
      await prisma.questionOption.update({
        where: { id: o.id },
        data: { text: next },
      });
      oCount++;
    }
  }
  console.log(`  ✓ ${oCount} opción(es) de pregunta actualizada(s)`);

  console.log(`✅ Listo. Total: ${topicCount + qCount + oCount} filas tocadas.`);
}

main()
  .catch((e) => {
    console.error("✗ Falló el script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
