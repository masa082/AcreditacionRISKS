/**
 * Seed de demostración para AcreditaPro.
 * Crea: planes, roles del sistema, superadmin, un suscriptor demo (Certizo) con
 * su equipo, esquema de certificación, banco de preguntas (varios tipos),
 * examen, tarifas, política de datos, un candidato e inscripción de ejemplo.
 *
 * Ejecutar: npm run db:seed   (o `prisma migrate reset` para limpiar + sembrar)
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SYSTEM_ROLES } from "../src/lib/permissions";

const prisma = new PrismaClient();

const PASSWORD = "Demo1234*";
const SUPERADMIN_PASSWORD = "Admin1234*";

async function hash(p: string) {
  return bcrypt.hash(p, 11);
}

async function truncateAll() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

async function main() {
  console.log("🌱 Limpiando base de datos…");
  await truncateAll();

  // ----------------------- Planes -----------------------
  console.log("📦 Creando planes…");
  const planPro = await prisma.plan.create({
    data: {
      key: "pro",
      name: "Profesional",
      description: "Para organismos certificadores en operación.",
      priceMonthly: new Prisma.Decimal(490000),
      priceYearly: new Prisma.Decimal(4900000),
      currency: "COP",
      maxUsers: 25,
      maxCandidates: 5000,
      maxExams: 100,
      maxCertificates: 10000,
      maxStorageMb: 20480,
      maxEmailsMonth: 50000,
      modules: ["questions", "exams", "payments", "schedule", "committee", "certificates", "renewals", "reports"],
    },
  });
  await prisma.plan.createMany({
    data: [
      {
        key: "starter",
        name: "Starter",
        description: "Para iniciar procesos de certificación.",
        priceMonthly: new Prisma.Decimal(190000),
        priceYearly: new Prisma.Decimal(1900000),
        maxUsers: 5,
        maxCandidates: 500,
        maxExams: 15,
        maxCertificates: 1000,
        modules: ["questions", "exams", "payments", "certificates"],
      },
      {
        key: "enterprise",
        name: "Enterprise",
        description: "Operación a gran escala con SLA.",
        priceMonthly: new Prisma.Decimal(1490000),
        priceYearly: new Prisma.Decimal(14900000),
        maxUsers: 200,
        maxCandidates: 100000,
        maxExams: 1000,
        maxCertificates: 1000000,
        maxStorageMb: 204800,
        maxEmailsMonth: 1000000,
        modules: ["questions", "exams", "payments", "schedule", "committee", "certificates", "renewals", "reports", "audit", "api"],
      },
    ],
  });

  // ----------------------- Roles de plataforma -----------------------
  console.log("🛡️  Creando roles del sistema…");
  for (const r of SYSTEM_ROLES.filter((x) => x.scope === "PLATFORM")) {
    await prisma.role.create({
      data: {
        subscriberId: null,
        key: r.key,
        name: r.name,
        description: r.description,
        isSystem: true,
        permissions: r.permissions,
      },
    });
  }
  const superadminRole = await prisma.role.findFirstOrThrow({
    where: { subscriberId: null, key: "SUPERADMIN" },
  });

  // ----------------------- Superadministrador -----------------------
  console.log("👑 Creando superadministrador…");
  await prisma.user.create({
    data: {
      subscriberId: null,
      type: "PLATFORM",
      email: "superadmin@acreditapro.com",
      passwordHash: await hash(SUPERADMIN_PASSWORD),
      firstName: "Super",
      lastName: "Administrador",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      roleId: superadminRole.id,
    },
  });

  // ----------------------- Suscriptor demo: Certizo -----------------------
  console.log("🏢 Creando suscriptor demo (Certizo)…");
  const certizo = await prisma.subscriber.create({
    data: {
      slug: "certizo",
      legalName: "Certizo Organismo Certificador S.A.S.",
      tradeName: "Certizo",
      taxId: "901.234.567-8",
      status: "ACTIVE",
      primaryColor: "#1e3a8a",
      secondaryColor: "#0ea5e9",
      legalRepName: "María Fernanda Gómez",
      authorizedSigner: "María Fernanda Gómez — Directora de Certificación",
      contactEmail: "contacto@certizo.co",
      contactPhone: "+57 601 555 0100",
      address: "Calle 100 # 8-60, Bogotá, Colombia",
      country: "CO",
      planId: planPro.id,
      modules: planPro.modules,
    },
  });

  // Roles del suscriptor (subroles configurables)
  const subRoleDefs = SYSTEM_ROLES.filter(
    (x) => x.scope === "SUBSCRIBER" || x.scope === "CANDIDATE",
  );
  const subRoles: Record<string, string> = {};
  for (const r of subRoleDefs) {
    const created = await prisma.role.create({
      data: {
        subscriberId: certizo.id,
        key: r.key,
        name: r.name,
        description: r.description,
        isSystem: true,
        permissions: r.permissions,
      },
    });
    subRoles[r.key] = created.id;
  }

  // Equipo del suscriptor
  console.log("👥 Creando equipo del suscriptor…");
  const team: Array<[string, string, string, string]> = [
    ["admin@certizo.co", "Carlos", "Rodríguez", "SUBSCRIBER_ADMIN"],
    ["coordinador@certizo.co", "Ana", "Martínez", "COORDINATOR"],
    ["autor@certizo.co", "Luis", "Pérez", "QUESTION_AUTHOR"],
    ["revisor@certizo.co", "Diana", "Quintero", "QUESTION_REVIEWER"],
    ["evaluador@certizo.co", "Jorge", "Sánchez", "EVALUATOR"],
    ["comite@certizo.co", "Patricia", "López", "COMMITTEE_MEMBER"],
  ];
  for (const [email, fn, ln, roleKey] of team) {
    await prisma.user.create({
      data: {
        subscriberId: certizo.id,
        type: "SUBSCRIBER",
        email,
        passwordHash: await hash(PASSWORD),
        firstName: fn,
        lastName: ln,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        roleId: subRoles[roleKey],
      },
    });
  }

  // ----------------------- Política de datos + finalidades -----------------------
  console.log("📜 Creando política de tratamiento de datos…");
  const policy = await prisma.privacyPolicyVersion.create({
    data: {
      subscriberId: certizo.id,
      version: "v1.0",
      title: "Política de Tratamiento de Datos Personales",
      content:
        "Certizo trata sus datos personales conforme a la Ley 1581 de 2012 y normas aplicables, " +
        "con las finalidades de evaluación, certificación, verificación pública de certificados, " +
        "conservación de evidencias y comunicaciones relacionadas con su proceso.",
      isCurrent: true,
    },
  });
  await prisma.consentPurpose.createMany({
    data: [
      { subscriberId: certizo.id, key: "evaluacion", label: "Procesos de evaluación", required: true },
      { subscriberId: certizo.id, key: "emails", label: "Envío de correos y comunicaciones", required: true },
      { subscriberId: certizo.id, key: "verificacion", label: "Verificación pública de certificados", required: true },
      { subscriberId: certizo.id, key: "conservacion", label: "Conservación de evidencias para auditoría", required: true },
      { subscriberId: certizo.id, key: "recordatorios", label: "Recordatorios de renovación", required: false },
    ],
  });

  // ----------------------- Esquema de certificación -----------------------
  console.log("🎓 Creando esquema de certificación…");
  const scheme = await prisma.certificationScheme.create({
    data: {
      subscriberId: certizo.id,
      code: "ESQ-AUD-17024",
      name: "Auditor Interno ISO 9001",
      description: "Certificación de competencias para auditores internos de sistemas de gestión de calidad.",
      scope: "Planificación, ejecución y reporte de auditorías internas de sistemas de gestión de calidad bajo ISO 9001:2015.",
      normReference: "ISO/IEC 17024; ISO 19011",
      validityMonths: 36,
      recertRules: { evidencia: "horas de auditoría", examen: true },
    },
  });

  // Competencias y temas
  const compPlan = await prisma.competency.create({
    data: { subscriberId: certizo.id, code: "C1", name: "Planificación de auditorías" },
  });
  const compEjec = await prisma.competency.create({
    data: { subscriberId: certizo.id, code: "C2", name: "Ejecución de auditorías" },
  });
  const topicProg = await prisma.topic.create({
    data: { subscriberId: certizo.id, competencyId: compPlan.id, code: "T1", name: "Programa de auditoría" },
  });
  const topicEvid = await prisma.topic.create({
    data: { subscriberId: certizo.id, competencyId: compEjec.id, code: "T2", name: "Evidencia de auditoría" },
  });

  // Tarifas
  await prisma.feeConfig.createMany({
    data: [
      { subscriberId: certizo.id, schemeId: scheme.id, concept: "ENROLLMENT", label: "Inscripción", amount: new Prisma.Decimal(120000) },
      { subscriberId: certizo.id, schemeId: scheme.id, concept: "EXAM", label: "Examen de certificación", amount: new Prisma.Decimal(350000) },
      { subscriberId: certizo.id, schemeId: scheme.id, concept: "CERTIFICATION", label: "Emisión de certificado", amount: new Prisma.Decimal(180000) },
      { subscriberId: certizo.id, schemeId: scheme.id, concept: "RECERTIFICATION", label: "Recertificación", amount: new Prisma.Decimal(280000) },
    ],
  });

  // Requisitos documentales
  await prisma.requiredDocument.createMany({
    data: [
      { subscriberId: certizo.id, schemeId: scheme.id, code: "DOC-CC", name: "Documento de identidad", required: true, acceptedTypes: ["pdf", "jpg", "png"] },
      { subscriberId: certizo.id, schemeId: scheme.id, code: "DOC-HV", name: "Hoja de vida", required: true, acceptedTypes: ["pdf"] },
      { subscriberId: certizo.id, schemeId: scheme.id, code: "DOC-EXP", name: "Certificado de experiencia (horas de auditoría)", required: false, acceptedTypes: ["pdf"] },
    ],
  });

  // ----------------------- Banco de preguntas -----------------------
  console.log("❓ Creando banco de preguntas…");
  const bank = await prisma.questionBank.create({
    data: {
      subscriberId: certizo.id,
      schemeId: scheme.id,
      code: "BANK-AUD-01",
      name: "Banco Auditor Interno ISO 9001 v1",
      normReference: "ISO 19011",
      version: "v1",
    },
  });
  const author = await prisma.user.findFirstOrThrow({ where: { email: "autor@certizo.co" } });
  const reviewer = await prisma.user.findFirstOrThrow({ where: { email: "revisor@certizo.co" } });

  // P1: Selección única
  const q1 = await prisma.question.create({
    data: {
      subscriberId: certizo.id, bankId: bank.id, code: "Q-001", type: "SINGLE_CHOICE",
      statement: "¿Cuál es el objetivo principal de un programa de auditoría?",
      points: new Prisma.Decimal(2), difficulty: "INTERMEDIATE",
      competencyId: compPlan.id, topicId: topicProg.id, normReference: "ISO 19011",
      status: "APPROVED", authorId: author.id, reviewerId: reviewer.id, approvedAt: new Date(),
      feedback: "El programa de auditoría organiza el conjunto de auditorías planificadas para un periodo.",
      options: {
        create: [
          { text: "Planificar y gestionar el conjunto de auditorías de un periodo", isCorrect: true, order: 0 },
          { text: "Sancionar a los responsables de no conformidades", isCorrect: false, order: 1 },
          { text: "Reemplazar la revisión por la dirección", isCorrect: false, order: 2 },
          { text: "Eliminar la necesidad de evidencia objetiva", isCorrect: false, order: 3 },
        ],
      },
    },
  });

  // P2: Selección múltiple (varias respuestas)
  await prisma.question.create({
    data: {
      subscriberId: certizo.id, bankId: bank.id, code: "Q-002", type: "MULTIPLE_CHOICE",
      statement: "Seleccione las características de una evidencia de auditoría adecuada.",
      points: new Prisma.Decimal(3), partialScoring: true, difficulty: "ADVANCED",
      competencyId: compEjec.id, topicId: topicEvid.id,
      status: "APPROVED", authorId: author.id, reviewerId: reviewer.id, approvedAt: new Date(),
      options: {
        create: [
          { text: "Verificable", isCorrect: true, order: 0 },
          { text: "Pertinente", isCorrect: true, order: 1 },
          { text: "Basada en la opinión del auditor", isCorrect: false, order: 2 },
          { text: "Suficiente", isCorrect: true, order: 3 },
        ],
      },
    },
  });

  // P3: Verdadero/Falso
  await prisma.question.create({
    data: {
      subscriberId: certizo.id, bankId: bank.id, code: "Q-003", type: "TRUE_FALSE",
      statement: "El auditor interno debe ser independiente de la actividad auditada.",
      points: new Prisma.Decimal(1), difficulty: "BASIC", competencyId: compEjec.id,
      status: "APPROVED", authorId: author.id, reviewerId: reviewer.id, approvedAt: new Date(),
      correctAnswer: true,
      feedback: "La independencia preserva la objetividad e imparcialidad de la auditoría.",
    },
  });

  // P4: Pregunta abierta (calificación manual + rúbrica)
  await prisma.question.create({
    data: {
      subscriberId: certizo.id, bankId: bank.id, code: "Q-004", type: "OPEN",
      statement: "Describa los pasos para planificar una auditoría interna basada en riesgos.",
      points: new Prisma.Decimal(5), difficulty: "ADVANCED", competencyId: compPlan.id, topicId: topicProg.id,
      status: "APPROVED", authorId: author.id, reviewerId: reviewer.id, approvedAt: new Date(),
      rubric: {
        criterios: [
          { nombre: "Identifica objetivos y alcance", puntos: 2 },
          { nombre: "Considera riesgos y procesos críticos", puntos: 2 },
          { nombre: "Define recursos y cronograma", puntos: 1 },
        ],
      },
    },
  });

  // P5: Emparejamiento
  await prisma.question.create({
    data: {
      subscriberId: certizo.id, bankId: bank.id, code: "Q-005", type: "MATCHING",
      statement: "Relacione cada término con su definición.",
      points: new Prisma.Decimal(3), difficulty: "INTERMEDIATE", competencyId: compEjec.id,
      status: "APPROVED", authorId: author.id, reviewerId: reviewer.id, approvedAt: new Date(),
      options: {
        create: [
          { text: "Hallazgo", matchLeft: "Hallazgo", matchRight: "Resultado de evaluar evidencia contra criterios", order: 0 },
          { text: "Criterio", matchLeft: "Criterio", matchRight: "Conjunto de requisitos usados como referencia", order: 1 },
          { text: "No conformidad", matchLeft: "No conformidad", matchRight: "Incumplimiento de un requisito", order: 2 },
        ],
      },
    },
  });

  // P6: Ordenamiento
  await prisma.question.create({
    data: {
      subscriberId: certizo.id, bankId: bank.id, code: "Q-006", type: "ORDERING",
      statement: "Ordene las etapas de una auditoría.",
      points: new Prisma.Decimal(3), difficulty: "INTERMEDIATE", competencyId: compPlan.id,
      status: "APPROVED", authorId: author.id, reviewerId: reviewer.id, approvedAt: new Date(),
      options: {
        create: [
          { text: "Planificación", order: 0 },
          { text: "Reunión de apertura", order: 1 },
          { text: "Recolección de evidencia", order: 2 },
          { text: "Reunión de cierre", order: 3 },
          { text: "Informe de auditoría", order: 4 },
        ],
      },
    },
  });

  // ----------------------- Examen -----------------------
  console.log("📝 Creando evaluación…");
  const exam = await prisma.exam.create({
    data: {
      subscriberId: certizo.id, schemeId: scheme.id, code: "EX-AUD-01",
      name: "Examen de Certificación — Auditor Interno ISO 9001",
      description: "Evaluación de conocimientos y competencias para auditores internos.",
      type: "CERTIFICATION", modality: "ONLINE", status: "PUBLISHED",
      durationMin: 60, numQuestions: 6, totalPoints: new Prisma.Decimal(6), passingScore: new Prisma.Decimal(70),
      attemptsAllowed: 2, randomizeQuestions: true, randomizeOptions: true,
      requireCommittee: true, requirePayment: true, requireSchedule: false, autoCertificate: false,
      showResultImmediately: false, allowReview: true,
      instructions: "Lea cada pregunta con atención. Dispone de 60 minutos. El examen se guarda automáticamente.",
      sections: {
        create: [
          { title: "Conocimientos generales", order: 0, bankId: bank.id, questionCount: 4 },
          { title: "Competencias prácticas", order: 1, bankId: bank.id, questionCount: 2 },
        ],
      },
    },
  });

  // ----------------------- Candidato demo + inscripción -----------------------
  console.log("🧑‍🎓 Creando candidato demo…");
  const candidateUser = await prisma.user.create({
    data: {
      subscriberId: certizo.id, type: "CANDIDATE",
      email: "candidato@example.com", passwordHash: await hash(PASSWORD),
      firstName: "Andrés", lastName: "Ramírez", status: "ACTIVE", emailVerifiedAt: new Date(),
      roleId: subRoles["CANDIDATE"],
    },
  });
  const candidate = await prisma.candidate.create({
    data: {
      subscriberId: certizo.id, userId: candidateUser.id,
      firstName: "Andrés", lastName: "Ramírez", email: "candidato@example.com",
      documentType: "CC", documentNumber: "1012345678", phone: "+57 300 555 0199",
      country: "CO", city: "Bogotá",
    },
  });
  await prisma.enrollment.create({
    data: {
      subscriberId: certizo.id, candidateId: candidate.id, schemeId: scheme.id, examId: exam.id,
      type: "CERTIFICATION", status: "PAYMENT_PENDING", code: "INS-2026-0001",
    },
  });

  // Consentimiento de datos del candidato
  await prisma.dataConsent.create({
    data: {
      subscriberId: certizo.id, candidateId: candidate.id, policyId: policy.id,
      holderName: "Andrés Ramírez", documentType: "CC", documentNumber: "1012345678",
      ip: "190.0.0.1", userAgent: "seed", policyVersion: "v1.0",
      purposes: { evaluacion: true, emails: true, verificacion: true, conservacion: true, recordatorios: true },
    },
  });

  // Auditoría de ejemplo
  await prisma.auditLog.create({
    data: {
      subscriberId: certizo.id, action: "seed.bootstrap", entity: "Subscriber",
      entityId: certizo.id, after: { note: "Datos de demostración cargados" },
    },
  });

  console.log("✅ Seed completado.");
  console.log("\n──────── Credenciales de demostración ────────");
  console.log("Superadmin:   superadmin@acreditapro.com / Admin1234*");
  console.log("Admin Certizo: admin@certizo.co / Demo1234*");
  console.log("Autor:         autor@certizo.co / Demo1234*");
  console.log("Revisor:       revisor@certizo.co / Demo1234*");
  console.log("Evaluador:     evaluador@certizo.co / Demo1234*");
  console.log("Comité:        comite@certizo.co / Demo1234*");
  console.log("Candidato:     candidato@example.com / Demo1234*");
  console.log("Tenant (slug): certizo");
  console.log("───────────────────────────────────────────────");
  void q1;
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
