"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword, newToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendVerificationEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";

export interface RegisterState {
  ok: boolean;
  error?: string;
  /// En desarrollo (sin servidor de correo) se devuelve el enlace de activación
  /// para que el candidato pueda continuar el flujo.
  activationToken?: string;
  /// Cuando la cuenta YA existe (mismo correo o mismo documento dentro de la
  /// misma entidad), devolvemos un objeto rico para que la UI renderice
  /// CTAs específicos: restablecer contraseña o contactar al administrador.
  duplicate?: {
    kind: "email" | "document";
    subscriberName: string;
    /// Email enmascarado del usuario existente (para confirmar a la persona
    /// SIN exponer el correo completo). Solo se devuelve cuando lo conocemos.
    hintedEmail?: string;
    /// Correo de contacto del organismo certificador para escalar el caso.
    subscriberContact?: string;
  };
}

const registerSchema = z
  .object({
    org: z.string().min(1, "Seleccione la entidad certificadora"),
    firstName: z.string().min(2, "Ingrese su nombre").max(80),
    lastName: z.string().min(2, "Ingrese sus apellidos").max(80),
    email: z.string().email("Correo inválido"),
    documentType: z.enum(["CC", "CE", "PASAPORTE", "TI", "NIT"], {
      message: "Seleccione el tipo de documento",
    }),
    documentNumber: z.string().min(4, "Documento inválido").max(40),
    phone: z.string().max(40).optional().nullable(),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(72),
    confirm: z.string(),
    acceptPolicy: z.literal("on", {
      message: "Debe autorizar el tratamiento de datos personales",
    }),
    acceptSensitive: z.literal("on", {
      message:
        "Debe autorizar el tratamiento de datos sensibles (foto, antecedentes, antifraude). Sin esta autorización no es posible adelantar el proceso de certificación.",
    }),
    consentPolicyVersion: z.string().min(3).max(40).optional().default("v2026-06-05"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

export async function registerCandidate(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    org: formData.get("org"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    documentType: formData.get("documentType"),
    documentNumber: formData.get("documentNumber"),
    phone: clean(formData.get("phone")),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
    acceptPolicy: formData.get("acceptPolicy"),
    acceptSensitive: formData.get("acceptSensitive"),
    consentPolicyVersion: clean(formData.get("consentPolicyVersion")) ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;
  const email = data.email.toLowerCase();

  const subscriber = await prisma.subscriber.findUnique({
    where: { slug: data.org },
    select: { id: true, status: true, tradeName: true, legalName: true, contactEmail: true },
  });
  if (!subscriber || subscriber.status === "CANCELLED" || subscriber.status === "SUSPENDED") {
    return { ok: false, error: "La entidad certificadora no está disponible para registro." };
  }
  const subName = subscriber.tradeName ?? subscriber.legalName;

  // Función auxiliar: enmascara un correo "juan.perez@example.com" → "j••••z@example.com".
  const maskEmail = (e: string | null | undefined): string | undefined => {
    if (!e) return undefined;
    const [user, domain] = e.split("@");
    if (!user || !domain) return undefined;
    if (user.length <= 2) return `${user[0]}••@${domain}`;
    return `${user[0]}${"•".repeat(Math.max(2, user.length - 2))}${user.slice(-1)}@${domain}`;
  };

  // Bloquea registro tanto si el correo es el principal de otra cuenta,
  // como si está agregado como correo alterno de otra cuenta — para evitar
  // colisión silenciosa con cuentas multi-correo.
  const dupEmail = await prisma.user.findFirst({
    where: {
      subscriberId: subscriber.id,
      OR: [{ email }, { additionalEmails: { has: email } }],
    },
    select: { id: true, email: true },
  });
  if (dupEmail) {
    return {
      ok: false,
      error: `Ya existe una cuenta con ese correo en ${subName}. Puede iniciar sesión o restablecer su contraseña.`,
      duplicate: {
        kind: "email",
        subscriberName: subName,
        hintedEmail: maskEmail(dupEmail.email),
        subscriberContact: subscriber.contactEmail ?? undefined,
      },
    };
  }
  const dupDoc = await prisma.candidate.findFirst({
    where: { subscriberId: subscriber.id, documentNumber: data.documentNumber },
    select: { id: true, email: true },
  });
  if (dupDoc) {
    return {
      ok: false,
      error: `Ya existe una cuenta con ese número de documento en ${subName}.`,
      duplicate: {
        kind: "document",
        subscriberName: subName,
        hintedEmail: maskEmail(dupDoc.email),
        subscriberContact: subscriber.contactEmail ?? undefined,
      },
    };
  }

  const candidateRole = await prisma.role.findFirst({
    where: { subscriberId: subscriber.id, key: "CANDIDATE" },
    select: { id: true },
  });

  const verificationToken = newToken(24);
  const passwordHash = await hashPassword(data.password);

  // Captura de IP + UA como evidencia digital de la autorización.
  // Si el usuario está detrás de proxy/CDN, x-forwarded-for trae la IP real.
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent") ?? null;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        subscriberId: subscriber.id,
        type: "CANDIDATE",
        email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        status: "PENDING_VERIFICATION",
        verificationToken,
        roleId: candidateRole?.id ?? null,
      },
    });
    const candidate = await tx.candidate.create({
      data: {
        subscriberId: subscriber.id,
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        phone: data.phone,
      },
    });

    // ── Autorización Habeas Data (Ley 1581/2012) ──────────────────
    // Crea/reutiliza la versión vigente de política de privacidad del
    // suscriptor (snapshot del texto que el candidato vio en ese momento)
    // y persiste un `DataConsent` enlazado con purposes en JSON, IP y UA.
    // Esto es la "prueba de la autorización" exigida por la SIC.
    const policyVersion = data.consentPolicyVersion;
    const policy = await tx.privacyPolicyVersion.upsert({
      where: { subscriberId_version: { subscriberId: subscriber.id, version: policyVersion } },
      create: {
        subscriberId: subscriber.id,
        version: policyVersion,
        title: "Política de Tratamiento de Datos Personales — CIOC",
        content:
          "Versión publicada en /privacidad y en https://www.risksint.com/habeas-data/. " +
          "El detalle de finalidades, derechos del titular, autorización de datos " +
          "sensibles y datos de contacto del Responsable se entregó al candidato en " +
          "el formulario de registro antes de capturar el consentimiento.",
        isCurrent: true,
      },
      update: {},
    });
    await tx.dataConsent.create({
      data: {
        subscriberId: subscriber.id,
        candidateId: candidate.id,
        policyId: policy.id,
        policyVersion: policy.version,
        holderName: `${data.firstName} ${data.lastName}`.trim(),
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        ip,
        userAgent,
        purposes: {
          accepted: true,
          acceptedSensitive: true,
          policyUrl: "https://www.risksint.com/habeas-data/",
          internalPolicyUrl: "/privacidad",
          // Snapshot canónico de finalidades aprobadas.
          purposes: [
            "Crear y administrar cuenta de candidato",
            "Gestionar inscripción y presentación de evaluaciones",
            "Verificar identidad, antecedentes y documentación",
            "Emitir y publicar certificados verificables",
            "Notificar por correo, WhatsApp o SMS",
            "Atender solicitudes, quejas y reclamos",
            "Cumplir obligaciones legales y reportes a autoridades",
            "Realizar estadísticas internas (datos agregados)",
            "Tratamiento de datos sensibles (foto, antecedentes, antifraude)",
          ],
          rights: [
            "Conocer, actualizar y rectificar sus datos",
            "Solicitar prueba de la autorización",
            "Ser informado del uso dado a sus datos",
            "Presentar quejas ante la SIC",
            "Revocar la autorización y solicitar supresión",
            "Acceder gratuitamente a sus datos",
          ],
          channels: {
            email: "habeasdata@risksint.com",
            phone: "+57 601 794 1834",
          },
          legalBasis: ["Ley 1581 de 2012", "Decreto 1377 de 2013", "Constitución Política art. 15"],
        },
      },
    });
  });

  await audit(null, {
    action: "candidate.register",
    entity: "User",
    subscriberId: subscriber.id,
    after: { email, documentNumber: data.documentNumber },
  });

  await sendVerificationEmail(subscriber.id, email, data.firstName, `${appBaseUrl()}/activar/${verificationToken}`);

  return { ok: true, activationToken: verificationToken };
}

export interface ActivationResult {
  ok: boolean;
  message: string;
}

/// Activa una cuenta de candidato a partir del token de verificación de correo.
export async function activateAccount(token: string): Promise<ActivationResult> {
  if (!token || token.length < 8) {
    return { ok: false, message: "Enlace de activación inválido." };
  }
  const user = await prisma.user.findFirst({
    where: { verificationToken: token },
    select: { id: true, status: true, subscriberId: true, email: true },
  });
  if (!user) {
    return { ok: false, message: "El enlace de activación no es válido o ya fue utilizado." };
  }
  if (user.status === "ACTIVE") {
    return { ok: true, message: "Su cuenta ya estaba activada. Puede iniciar sesión." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      verificationToken: null,
    },
  });
  await audit(null, {
    action: "candidate.activate",
    entity: "User",
    entityId: user.id,
    subscriberId: user.subscriberId,
    after: { email: user.email },
  });
  return { ok: true, message: "¡Cuenta activada! Ya puede iniciar sesión." };
}
