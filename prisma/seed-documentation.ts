/**
 * Seed idempotente del catálogo de documentación.
 *
 * Crea (o actualiza) los tres documentos GLOBALES base del SaaS:
 *   1. Proceso de Certificación CIOC (documento descriptivo)
 *   2. Política de Tratamiento de Datos Personales (habeas data)
 *   3. Términos y Condiciones de la Acreditación
 *
 * Estos documentos quedan con `seedSlug` puesto — la UI los marca como
 * "Sistema" y bloquea su eliminación. SUPERADMIN sí puede actualizar
 * los metadatos (visibilidad, versión, archivos).
 *
 * Ejecutar:  npx tsx prisma/seed-documentation.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DOCS: Array<{
  seedSlug: string;
  slug: string;
  title: string;
  description: string;
  version: string;
  category: string;
  audience: string[];
  pdfUrl: string;
  pdfSizeKB: number;
  docxUrl: string;
  docxSizeKB: number;
  thumbnailUrl: string;
  sortOrder: number;
}> = [
  {
    seedSlug: "proceso-cioc",
    slug: "proceso-certificacion-cioc",
    title: "Proceso de Certificación CIOC — Documento descriptivo",
    description:
      "Documento oficial que describe el ciclo completo del proceso de certificación de personas operado por RISKS INTERNATIONAL bajo la norma ISO/IEC 17024: los 4 pasos del candidato, módulos por rol, multilenguaje, habeas data, ONAC y verificación pública por QR.",
    version: "v1.0",
    category: "proceso",
    audience: ["CANDIDATE", "SUBSCRIBER", "SUPERADMIN"],
    pdfUrl: "/docs/Proceso-Certificacion-okacreditado.pdf",
    pdfSizeKB: 739,
    docxUrl: "/docs/Proceso-Certificacion-okacreditado.docx",
    docxSizeKB: 72,
    thumbnailUrl: "/docs/thumbs/Proceso-Certificacion-okacreditado.png",
    sortOrder: 10,
  },
  {
    seedSlug: "politica-habeas-data",
    slug: "politica-tratamiento-datos",
    title: "Política de Tratamiento de Datos Personales",
    description:
      "Lineamientos para el manejo de datos personales en la plataforma okacreditado.com, en cumplimiento de la Ley 1581 de 2012 y normas concordantes.",
    version: "v1.0",
    category: "legal",
    audience: ["CANDIDATE", "SUBSCRIBER", "SUPERADMIN"],
    pdfUrl: "/docs/Politica-Tratamiento-Datos.pdf",
    pdfSizeKB: 617,
    docxUrl: "/docs/Politica-Tratamiento-Datos.docx",
    docxSizeKB: 68,
    thumbnailUrl: "/docs/thumbs/Politica-Tratamiento-Datos.png",
    sortOrder: 20,
  },
  {
    seedSlug: "terminos-acreditacion",
    slug: "terminos-condiciones-acreditacion",
    title: "Términos y Condiciones de la Acreditación",
    description:
      "Condiciones generales aplicables al proceso de certificación de competencias profesionales operado por RISKS INTERNATIONAL bajo la norma ISO/IEC 17024.",
    version: "v1.0",
    category: "legal",
    audience: ["CANDIDATE", "SUBSCRIBER", "SUPERADMIN"],
    pdfUrl: "/docs/Terminos-Condiciones-Acreditacion.pdf",
    pdfSizeKB: 568,
    docxUrl: "/docs/Terminos-Condiciones-Acreditacion.docx",
    docxSizeKB: 67,
    thumbnailUrl: "/docs/thumbs/Terminos-Condiciones-Acreditacion.png",
    sortOrder: 30,
  },
];

async function main() {
  for (const d of DOCS) {
    const existing = await prisma.documentation.findUnique({
      where: { seedSlug: d.seedSlug },
    });
    if (existing) {
      await prisma.documentation.update({
        where: { id: existing.id },
        data: {
          title: d.title,
          description: d.description,
          version: d.version,
          category: d.category,
          audience: d.audience,
          pdfUrl: d.pdfUrl,
          pdfSizeKB: d.pdfSizeKB,
          docxUrl: d.docxUrl,
          docxSizeKB: d.docxSizeKB,
          thumbnailUrl: d.thumbnailUrl,
          sortOrder: d.sortOrder,
          visible: true,
        },
      });
      console.log(`  ↻  ${d.seedSlug}`);
    } else {
      await prisma.documentation.create({
        data: {
          subscriberId: null,
          seedSlug: d.seedSlug,
          slug: d.slug,
          title: d.title,
          description: d.description,
          version: d.version,
          category: d.category,
          audience: d.audience,
          pdfUrl: d.pdfUrl,
          pdfSizeKB: d.pdfSizeKB,
          docxUrl: d.docxUrl,
          docxSizeKB: d.docxSizeKB,
          thumbnailUrl: d.thumbnailUrl,
          sortOrder: d.sortOrder,
          visible: true,
        },
      });
      console.log(`  +  ${d.seedSlug}`);
    }
  }
  console.log(`\n✓ ${DOCS.length} documentos sembrados.`);
}

main().finally(() => prisma.$disconnect());
