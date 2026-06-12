/**
 * Script idempotente — agrega como documento requerido el "Certificado
 * del Curso UIAF sobre LAFT y Gestión de Riesgos" a TODOS los esquemas
 * de tipo SARLAFT y SAGRILAFT, en TODOS los suscriptores.
 *
 * El curso de la UIAF es un requisito normativo para Oficiales de
 * Cumplimiento (LAFT/ML/FT) y debe acreditarse durante la inscripción
 * a la certificación.
 *
 * Uso:
 *   - LOCAL:  npm run add:uiaf-doc
 *   - PROD:   DATABASE_URL="<railway-prod-url>" npm run add:uiaf-doc
 *
 * Es seguro correrlo varias veces — usa upsert con clave única
 * (subscriberId, code). Si el documento ya existe, solo actualiza
 * nombre/required/acceptedTypes a los valores canónicos.
 *
 * El script NO toca preguntas, exámenes, tarifas ni ningún otro recurso.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NAME = "Certificado del Curso UIAF sobre LAFT y Gestión de Riesgos";
const ACCEPTED = ["pdf"];

// Cada entrada: { schemeCode, docPrefix }.
//   - schemeCode  → CertificationScheme.code (definido en seed-ocp.ts).
//   - docPrefix   → prefijo usado al armar el código del documento, igual
//                   al usado por el seed (ej. `${prefix}-DOC-${sfx}`).
const TARGETS: Array<{ schemeCode: string; docPrefix: string }> = [
  { schemeCode: "OCP-SARLAFT-ST", docPrefix: "ST" },
  { schemeCode: "OCP-SAGRILAFT-SS", docPrefix: "SG" },
];

async function main() {
  const schemes = await prisma.certificationScheme.findMany({
    where: { code: { in: TARGETS.map((t) => t.schemeCode) } },
    select: { id: true, code: true, subscriberId: true, name: true },
  });

  if (schemes.length === 0) {
    console.log("⚠ No se encontraron esquemas SARLAFT/SAGRILAFT. Nada que hacer.");
    return;
  }

  console.log(`→ Procesando ${schemes.length} esquema(s)...`);

  for (const scheme of schemes) {
    const target = TARGETS.find((t) => t.schemeCode === scheme.code);
    if (!target) continue;
    const code = `${target.docPrefix}-DOC-UIAF`;

    const res = await prisma.requiredDocument.upsert({
      where: {
        subscriberId_code: {
          subscriberId: scheme.subscriberId,
          code,
        },
      },
      update: {
        name: NAME,
        required: true,
        schemeId: scheme.id,
        acceptedTypes: ACCEPTED,
        isActive: true,
      },
      create: {
        subscriberId: scheme.subscriberId,
        schemeId: scheme.id,
        code,
        name: NAME,
        required: true,
        acceptedTypes: ACCEPTED,
        isActive: true,
      },
    });

    console.log(
      `  ✓ ${scheme.code} (subscriber ${scheme.subscriberId.slice(-6)}) → ${res.code}`,
    );
  }

  console.log("✅ Documento UIAF agregado/actualizado correctamente.");
}

main()
  .catch((e) => {
    console.error("✗ Falló el script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
