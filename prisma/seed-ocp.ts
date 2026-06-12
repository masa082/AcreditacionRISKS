/**
 * Seed ADITIVO (idempotente) — Organismo de Certificación de Personas (OCP)
 * "Risks International S.A.S." con dos esquemas de certificación de idoneidad de
 * Oficiales de Cumplimiento:
 *   - SARLAFT  (Supertransporte)   — banco Anexo B (250 preguntas, literal).
 *   - SAGRILAFT (Supersociedades)  — banco adaptado al Capítulo X de la CBJ.
 *
 * No trunca datos existentes: usa upsert por claves únicas y reemplaza solo las
 * preguntas/secciones de los bancos que administra. Reejecutable sin duplicar.
 *
 * Ejecutar: npx tsx prisma/seed-ocp.ts
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SYSTEM_ROLES } from "../src/lib/permissions";

const prisma = new PrismaClient();
const PASSWORD = "Demo1234*";

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

const THEMES: { code: string; name: string }[] = [
  { code: "T1", name: "Marco Normativo" },
  { code: "T2", name: "Enfoque Basado en Riesgo" },
  { code: "T3", name: "Debida Diligencia" },
  { code: "T4", name: "Monitoreo Transaccional" },
  { code: "T5", name: "Reportes ROS y ROE" },
  { code: "T6", name: "Rol del Oficial de Cumplimiento" },
  { code: "T7", name: "Ética y Confidencialidad" },
];

// Distribución del examen (80 de 250) por tema, según el Análisis Técnico (Anexo D).
const EXAM_DISTRIBUTION: Record<string, number> = {
  T1: 14, T2: 13, T3: 15, T4: 11, T5: 11, T6: 8, T7: 8,
};

interface CertConfig {
  prefix: string; // ST | SG
  bankFile: string;
  scheme: { code: string; name: string; description: string; scope: string; normReference: string };
  bank: { code: string; name: string; normReference: string };
  examName: string;
  caseName: string;
  caseStatement: string;
}

const CERTS: CertConfig[] = [
  {
    prefix: "ST",
    bankFile: "ocp-sarlaft.json",
    scheme: {
      code: "OCP-SARLAFT-ST",
      name: "Certificación Profesional de Oficial de Cumplimiento SARLAFT (Supertransporte)",
      description:
        "Certificación de idoneidad de competencias para Oficiales de Cumplimiento Principal y Suplente del Sistema de Administración del Riesgo LA/FT (SARLAFT) en empresas vigiladas por la Superintendencia de Transporte. Categorías: Principal (mín. 3 años de experiencia) y Suplente (mín. 1 año).",
      scope:
        "Marco normativo SARLAFT del sector transporte, enfoque basado en riesgo, debida diligencia, monitoreo transaccional, reportes ROS/ROE a la UIAF, rol e inhabilidades del Oficial de Cumplimiento y código de ética.",
      normReference: "ISO/IEC 17024; Decreto 830 de 2021; Circular Externa 027 de 2020 (Supertransporte)",
    },
    bank: { code: "ST-BANK-OCP", name: "Banco de Preguntas — Oficial de Cumplimiento SARLAFT (Supertransporte)", normReference: "Anexo B P-OCP-01" },
    examName: "Examen Teórico de Certificación — Oficial de Cumplimiento SARLAFT (Supertransporte)",
    caseName: "Caso Práctico — Oficial de Cumplimiento SARLAFT (Supertransporte)",
    caseStatement:
      "A partir del escenario entregado de una empresa de transporte, elabore: (1) identificación de riesgos LA/FT, (2) matriz de riesgos con clasificación inherente y residual, (3) diseño de controles, (4) un Reporte de Operación Sospechosa (ROS) y (5) un plan de acción SARLAFT. Adjunte su desarrollo en un único archivo PDF.",
  },
  {
    prefix: "SG",
    bankFile: "ocp-sagrilaft.json",
    scheme: {
      code: "OCP-SAGRILAFT-SS",
      name: "Certificación Profesional de Oficial de Cumplimiento SAGRILAFT (Supersociedades)",
      description:
        "Certificación de idoneidad de competencias para Oficiales de Cumplimiento del Sistema de Autocontrol y Gestión del Riesgo Integral LA/FT/FPADM (SAGRILAFT) en empresas del sector real vigiladas por la Superintendencia de Sociedades. Incluye fundamentos del Programa de Transparencia y Ética Empresarial (PTEE).",
      scope:
        "Marco normativo SAGRILAFT (Capítulo X de la Circular Básica Jurídica), enfoque basado en riesgo, debida diligencia y beneficiario final, monitoreo transaccional, reportes ROS/ROE a la UIAF, rol del Oficial de Cumplimiento y código de ética.",
      normReference: "ISO/IEC 17024; Circular Externa 100-000016 de 2020 (Supersociedades); Ley 1778 de 2016 (PTEE)",
    },
    bank: { code: "SG-BANK-OCP", name: "Banco de Preguntas — Oficial de Cumplimiento SAGRILAFT (Supersociedades)", normReference: "Adaptado de Anexo B P-OCP-01" },
    examName: "Examen Teórico de Certificación — Oficial de Cumplimiento SAGRILAFT (Supersociedades)",
    caseName: "Caso Práctico — Oficial de Cumplimiento SAGRILAFT (Supersociedades)",
    caseStatement:
      "A partir del escenario entregado de una empresa del sector real, elabore: (1) identificación de riesgos LA/FT/FPADM, (2) matriz de riesgos con clasificación inherente y residual, (3) diseño de controles, (4) un Reporte de Operación Sospechosa (ROS) y (5) un plan de acción SAGRILAFT. Adjunte su desarrollo en un único archivo PDF.",
  },
];

async function main() {
  console.log("🌱 Seed OCP (aditivo) — Risks International S.A.S.");

  // ----------------------- Plan -----------------------
  const plan =
    (await prisma.plan.findFirst({ where: { key: "enterprise" } })) ??
    (await prisma.plan.findFirst({ where: { key: "pro" } })) ??
    (await prisma.plan.findFirst());

  // ----------------------- Suscriptor -----------------------
  const subscriber = await prisma.subscriber.upsert({
    where: { slug: "risks" },
    update: {},
    create: {
      slug: "risks",
      legalName: "Risks International S.A.S.",
      tradeName: "Risks International",
      taxId: "900.000.000-0",
      status: "ACTIVE",
      primaryColor: "#0f172a",
      secondaryColor: "#dc2626",
      legalRepName: "Representante Legal Risks International S.A.S.",
      authorizedSigner: "Director del Organismo de Certificación de Personas (OCP)",
      contactEmail: "calidad@risksint.com",
      contactPhone: "+57 601 000 0000",
      address: "Bogotá D.C., Colombia",
      country: "CO",
      planId: plan?.id ?? null,
      modules: plan?.modules ?? ["questions", "exams", "payments", "schedule", "committee", "certificates", "renewals", "reports"],
    },
  });
  console.log("🏢 Suscriptor:", subscriber.legalName);

  // ----------------------- Roles (subroles del sistema) -----------------------
  const subRoleDefs = SYSTEM_ROLES.filter((x) => x.scope === "SUBSCRIBER" || x.scope === "CANDIDATE");
  const roles: Record<string, string> = {};
  for (const r of subRoleDefs) {
    const role = await prisma.role.upsert({
      where: { subscriberId_key: { subscriberId: subscriber.id, key: r.key } },
      update: { permissions: r.permissions, name: r.name, description: r.description },
      create: {
        subscriberId: subscriber.id,
        key: r.key,
        name: r.name,
        description: r.description,
        isSystem: true,
        permissions: r.permissions,
      },
    });
    roles[r.key] = role.id;
  }

  // ----------------------- Equipo -----------------------
  const hash = await bcrypt.hash(PASSWORD, 11);
  const team: Array<[string, string, string, string]> = [
    ["admin@risksint.com", "Dirección", "Risks", "SUBSCRIBER_ADMIN"],
    ["calidad@risksint.com", "Calidad", "Risks", "COORDINATOR"],
    ["autor@risksint.com", "Samuel", "Sánchez", "QUESTION_AUTHOR"],
    ["revisor@risksint.com", "Comité", "Técnico", "QUESTION_REVIEWER"],
    ["evaluador@risksint.com", "Evaluador", "OCP", "EVALUATOR"],
    ["comite@risksint.com", "Comité", "Evaluador", "COMMITTEE_MEMBER"],
  ];
  for (const [email, fn, ln, roleKey] of team) {
    await prisma.user.upsert({
      where: { email_subscriberId: { email, subscriberId: subscriber.id } },
      update: { roleId: roles[roleKey], firstName: fn, lastName: ln, status: "ACTIVE" },
      create: {
        subscriberId: subscriber.id,
        type: "SUBSCRIBER",
        email,
        passwordHash: hash,
        firstName: fn,
        lastName: ln,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        roleId: roles[roleKey],
      },
    });
  }
  const author = await prisma.user.findFirstOrThrow({ where: { email: "autor@risksint.com", subscriberId: subscriber.id } });
  const reviewer = await prisma.user.findFirstOrThrow({ where: { email: "revisor@risksint.com", subscriberId: subscriber.id } });

  // ----------------------- Política de datos + finalidades -----------------------
  await prisma.privacyPolicyVersion.upsert({
    where: { subscriberId_version: { subscriberId: subscriber.id, version: "v1.0" } },
    update: { isCurrent: true },
    create: {
      subscriberId: subscriber.id,
      version: "v1.0",
      title: "Política de Tratamiento de Datos Personales — Risks International S.A.S.",
      content:
        "De conformidad con la Ley 1581 de 2012 y normas concordantes, Risks International S.A.S. trata sus datos personales " +
        "únicamente para el proceso de certificación de personas (evaluación de idoneidad de Oficiales de Cumplimiento), " +
        "verificación de la información aportada, emisión y verificación pública de certificados, conservación de evidencias " +
        "para auditoría y acreditación, y comunicaciones relacionadas. Consulte la política completa en " +
        "https://www.risksint.com/habeas-data-2/",
      isCurrent: true,
    },
  });
  const purposes = [
    ["evaluacion", "Proceso de evaluación y certificación", true],
    ["emails", "Envío de correos y comunicaciones", true],
    ["verificacion", "Verificación pública de certificados y directorio ONAC", true],
    ["conservacion", "Conservación de evidencias para auditoría (mín. 5 años)", true],
    ["recordatorios", "Recordatorios de vencimiento y recertificación", false],
  ] as const;
  for (const [key, label, required] of purposes) {
    await prisma.consentPurpose.upsert({
      where: { subscriberId_key: { subscriberId: subscriber.id, key } },
      update: { label, required },
      create: { subscriberId: subscriber.id, key, label, required },
    });
  }

  // ----------------------- Por cada certificación -----------------------
  for (const cfg of CERTS) {
    console.log(`\n🎓 ${cfg.scheme.name}`);

    const scheme = await prisma.certificationScheme.upsert({
      where: { subscriberId_code: { subscriberId: subscriber.id, code: cfg.scheme.code } },
      update: { ...cfg.scheme, validityMonths: 36 },
      create: {
        subscriberId: subscriber.id,
        ...cfg.scheme,
        validityMonths: 36,
        recertRules: { vigenciaMeses: 36, requiereExamen: true, requiereFormacion: "20 horas/año" },
      },
    });

    // Competencia + 7 temas (topics) con códigos prefijados por esquema.
    const competency = await prisma.competency.upsert({
      where: { subscriberId_code: { subscriberId: subscriber.id, code: `${cfg.prefix}-OCIDON` } },
      update: {},
      create: {
        subscriberId: subscriber.id,
        code: `${cfg.prefix}-OCIDON`,
        name: "Idoneidad del Oficial de Cumplimiento",
        description: "Competencia integral evaluada en el esquema de certificación.",
      },
    });
    const topicIdByCode: Record<string, string> = {};
    for (const t of THEMES) {
      const topic = await prisma.topic.upsert({
        where: { subscriberId_code: { subscriberId: subscriber.id, code: `${cfg.prefix}-${t.code}` } },
        update: { name: t.name, competencyId: competency.id },
        create: { subscriberId: subscriber.id, code: `${cfg.prefix}-${t.code}`, name: t.name, competencyId: competency.id },
      });
      topicIdByCode[t.code] = topic.id;
    }

    // Banco teórico.
    const bank = await prisma.questionBank.upsert({
      where: { subscriberId_code: { subscriberId: subscriber.id, code: cfg.bank.code } },
      update: { name: cfg.bank.name, schemeId: scheme.id, normReference: cfg.bank.normReference },
      create: {
        subscriberId: subscriber.id,
        schemeId: scheme.id,
        code: cfg.bank.code,
        name: cfg.bank.name,
        normReference: cfg.bank.normReference,
        version: "v1",
      },
    });

    // Reemplazar preguntas del banco (idempotencia).
    await prisma.question.deleteMany({ where: { subscriberId: subscriber.id, bankId: bank.id } });
    const records = loadBank(cfg.bankFile);
    const now = new Date();
    for (const q of records) {
      await prisma.question.create({
        data: {
          subscriberId: subscriber.id,
          bankId: bank.id,
          code: q.code,
          type: "SINGLE_CHOICE",
          statement: q.statement,
          points: new Prisma.Decimal(1),
          difficulty: q.difficulty,
          competencyId: competency.id,
          topicId: topicIdByCode[q.topicCode],
          status: "APPROVED",
          authorId: author.id,
          reviewerId: reviewer.id,
          approvedAt: now,
          options: {
            create: q.options.map((text, i) => ({ text, isCorrect: i === q.answerIndex, order: i })),
          },
        },
      });
    }
    console.log(`   ❓ ${records.length} preguntas cargadas en ${bank.code}`);

    // Tarifas (derecho a evaluación $1.300.000).
    await prisma.feeConfig.deleteMany({ where: { subscriberId: subscriber.id, schemeId: scheme.id } });
    await prisma.feeConfig.createMany({
      data: [
        { subscriberId: subscriber.id, schemeId: scheme.id, concept: "EXAM", label: "Derecho a evaluación de certificación", amount: new Prisma.Decimal(1300000) },
        { subscriberId: subscriber.id, schemeId: scheme.id, concept: "RECERTIFICATION", label: "Recertificación", amount: new Prisma.Decimal(900000) },
        { subscriberId: subscriber.id, schemeId: scheme.id, concept: "DUPLICATE", label: "Duplicado de certificado", amount: new Prisma.Decimal(120000) },
      ],
    });

    // Requisitos documentales / evidencias (Anexo A). El candidato los adjunta
    // al momento de la inscripción (archivo PDF o imagen).
    const docs: Array<[string, string, boolean, string[]]> = [
      ["CC", "Copia del documento de identidad", true, ["pdf", "jpg", "png"]],
      ["FOTO", "Fotografía reciente (fondo claro)", true, ["jpg", "png"]],
      ["HV", "Hoja de vida actualizada", true, ["pdf"]],
      ["TIT", "Soporte del último nivel de estudios (títulos académicos)", true, ["pdf", "jpg", "png"]],
      ["EXP", "Soportes de experiencia laboral", true, ["pdf", "jpg", "png"]],
      ["CUR", "Certificados de cursos o diplomados en cumplimiento (mín. 90 horas)", true, ["pdf"]],
      // Requisito explícito de la UIAF (Unidad de Información y Análisis
      // Financiero): los Oficiales de Cumplimiento deben acreditar el
      // curso oficial de la UIAF sobre LAFT y Gestión de Riesgos.
      ["UIAF", "Certificado del Curso UIAF sobre LAFT y Gestión de Riesgos", true, ["pdf"]],
      ["DIS", "Certificado de antecedentes disciplinarios", true, ["pdf", "jpg", "png"]],
      ["FIS", "Certificado de antecedentes fiscales", false, ["pdf", "jpg", "png"]],
      ["OTR", "Otros documentos de soporte", false, ["pdf", "jpg", "png"]],
    ];
    for (const [sfx, name, required, acceptedTypes] of docs) {
      await prisma.requiredDocument.upsert({
        where: { subscriberId_code: { subscriberId: subscriber.id, code: `${cfg.prefix}-DOC-${sfx}` } },
        update: { name, required, schemeId: scheme.id, acceptedTypes },
        create: { subscriberId: subscriber.id, schemeId: scheme.id, code: `${cfg.prefix}-DOC-${sfx}`, name, required, acceptedTypes },
      });
    }

    // Examen teórico (80 de 250, 120 min, 80%) con secciones por tema.
    const examCode = `${cfg.prefix}-EX-TEO`;
    const existingExam = await prisma.exam.findFirst({ where: { subscriberId: subscriber.id, code: examCode } });
    if (existingExam) await prisma.examSection.deleteMany({ where: { examId: existingExam.id } });
    const exam = await prisma.exam.upsert({
      where: { subscriberId_code: { subscriberId: subscriber.id, code: examCode } },
      update: {
        name: cfg.examName, schemeId: scheme.id, status: "PUBLISHED",
        durationMin: 120, passingScore: new Prisma.Decimal(80), attemptsAllowed: 1,
        numQuestions: 80, totalPoints: new Prisma.Decimal(80),
      },
      create: {
        subscriberId: subscriber.id, schemeId: scheme.id, code: examCode, name: cfg.examName,
        description: "Examen teórico de opción múltiple. 80 preguntas seleccionadas aleatoriamente del banco de 250.",
        type: "CERTIFICATION", modality: "ONLINE", status: "PUBLISHED",
        durationMin: 120, numQuestions: 80, totalPoints: new Prisma.Decimal(80), passingScore: new Prisma.Decimal(80),
        attemptsAllowed: 1, randomizeQuestions: true, randomizeOptions: true,
        requirePayment: true, requireSchedule: false, requireCommittee: false, autoCertificate: false,
        showResultImmediately: false, showCorrectAnswers: false, allowReview: false,
        instructions: "Dispone de 120 minutos. La calificación mínima aprobatoria es 80%. Un solo intento. La retroalimentación se entrega al cierre.",
      },
    });
    let order = 0;
    for (const t of THEMES) {
      await prisma.examSection.create({
        data: {
          examId: exam.id, bankId: bank.id, title: t.name, order: order++,
          questionCount: EXAM_DISTRIBUTION[t.code], topicFilter: topicIdByCode[t.code],
          pointsPerQuestion: new Prisma.Decimal(1),
        },
      });
    }
    console.log(`   📝 Examen ${examCode} (80/250, 120 min, 80%) con ${THEMES.length} secciones`);

    // Banco + examen de caso práctico (revisión por comité, 2 evaluadores).
    const caseBank = await prisma.questionBank.upsert({
      where: { subscriberId_code: { subscriberId: subscriber.id, code: `${cfg.prefix}-BANK-CASO` } },
      update: { schemeId: scheme.id },
      create: { subscriberId: subscriber.id, schemeId: scheme.id, code: `${cfg.prefix}-BANK-CASO`, name: `Casos Prácticos — ${cfg.prefix}`, version: "v1" },
    });
    await prisma.question.deleteMany({ where: { subscriberId: subscriber.id, bankId: caseBank.id } });
    await prisma.question.create({
      data: {
        subscriberId: subscriber.id, bankId: caseBank.id, code: `${cfg.prefix}-CASO-01`,
        type: "CASE_STUDY", statement: cfg.caseStatement, points: new Prisma.Decimal(80),
        difficulty: "ADVANCED", competencyId: competency.id, topicId: topicIdByCode["T2"],
        status: "APPROVED", authorId: author.id, reviewerId: reviewer.id, approvedAt: now,
        rubric: {
          criterios: [
            { nombre: "Identificación de riesgos", puntos: 15 },
            { nombre: "Matriz de riesgos (inherente y residual)", puntos: 20 },
            { nombre: "Diseño de controles", puntos: 15 },
            { nombre: "Elaboración del ROS", puntos: 15 },
            { nombre: "Plan de acción", puntos: 15 },
          ],
        },
      },
    });
    const praCode = `${cfg.prefix}-EX-PRA`;
    const existingPra = await prisma.exam.findFirst({ where: { subscriberId: subscriber.id, code: praCode } });
    if (existingPra) await prisma.examSection.deleteMany({ where: { examId: existingPra.id } });
    const pra = await prisma.exam.upsert({
      where: { subscriberId_code: { subscriberId: subscriber.id, code: praCode } },
      update: { name: cfg.caseName, schemeId: scheme.id, status: "PUBLISHED" },
      create: {
        subscriberId: subscriber.id, schemeId: scheme.id, code: praCode, name: cfg.caseName,
        description: "Evaluación práctica (caso). Entrega en PDF, calificada por dos evaluadores independientes y revisada por el comité.",
        type: "PRACTICAL", modality: "ONLINE", status: "PUBLISHED",
        durationMin: 240, numQuestions: 1, totalPoints: new Prisma.Decimal(80), passingScore: new Prisma.Decimal(80),
        attemptsAllowed: 1, randomizeQuestions: false, randomizeOptions: false,
        requirePayment: false, requireSchedule: false, requireCommittee: true, autoCertificate: false,
        showResultImmediately: false, allowReview: false,
        instructions: "Dispone de 4 horas. Entregue su desarrollo en un único archivo PDF. La evaluación es calificada por dos evaluadores independientes.",
      },
    });
    await prisma.examSection.create({
      data: { examId: pra.id, bankId: caseBank.id, title: "Caso práctico", order: 0, questionCount: 1, pointsPerQuestion: new Prisma.Decimal(80) },
    });
    console.log(`   🧪 Caso práctico ${praCode} (comité, 2 evaluadores)`);
  }

  await prisma.auditLog.create({
    data: {
      subscriberId: subscriber.id, action: "seed.ocp", entity: "Subscriber", entityId: subscriber.id,
      after: { note: "Esquemas SARLAFT/Supertransporte y SAGRILAFT/Supersociedades cargados (500 preguntas)" },
    },
  });

  console.log("\n✅ Seed OCP completado.");
  console.log("──────── Acceso del organismo certificador ────────");
  console.log("Admin Risks:  admin@risksint.com / Demo1234*");
  console.log("Autor:        autor@risksint.com / Demo1234*");
  console.log("Tenant (slug): risks");
  console.log("Esquemas: OCP-SARLAFT-ST · OCP-SAGRILAFT-SS");
  console.log("───────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed OCP:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
