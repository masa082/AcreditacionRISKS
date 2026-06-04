"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePlatformAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { SYSTEM_ROLES } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/schemes";

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

const subscriberSchema = z.object({
  legalName: z.string().min(3, "Razón social requerida").max(160),
  tradeName: z.string().max(160).optional().nullable(),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, "Slug: solo minúsculas, números y guiones"),
  contactEmail: z.string().email("Correo de contacto inválido").optional().nullable(),
  planId: z.string().optional().nullable(),
  status: z.enum(["TRIAL", "ACTIVE"]).default("TRIAL"),
  adminFirstName: z.string().min(2, "Nombre del admin requerido").max(80),
  adminLastName: z.string().min(2, "Apellido del admin requerido").max(80),
  adminEmail: z.string().email("Correo del admin inválido"),
  adminPassword: z.string().min(8, "Contraseña del admin: mínimo 8 caracteres").max(72),
});

/// Crea un nuevo SUSCRIPTOR (tenant) con su equipo base: subroles del sistema,
/// usuario administrador, política de datos y finalidades de consentimiento.
export async function createSubscriber(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requirePlatformAction(PERMISSIONS.SUBSCRIBER_MANAGE);
  const parsed = subscriberSchema.safeParse({
    legalName: formData.get("legalName"),
    tradeName: clean(formData.get("tradeName")),
    slug: (formData.get("slug") as string | null)?.toLowerCase().trim(),
    contactEmail: clean(formData.get("contactEmail")),
    planId: clean(formData.get("planId")),
    status: formData.get("status") || "TRIAL",
    adminFirstName: formData.get("adminFirstName"),
    adminLastName: formData.get("adminLastName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  const dup = await prisma.subscriber.findUnique({ where: { slug: d.slug }, select: { id: true } });
  if (dup) return { ok: false, error: "Ya existe una organización con ese identificador (slug)." };
  if (d.planId) {
    const plan = await prisma.plan.findUnique({ where: { id: d.planId }, select: { id: true } });
    if (!plan) return { ok: false, error: "Plan inválido." };
  }

  const passwordHash = await hashPassword(d.adminPassword);
  const created = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscriber.create({
      data: {
        slug: d.slug,
        legalName: d.legalName,
        tradeName: d.tradeName,
        status: d.status,
        contactEmail: d.contactEmail,
        planId: d.planId,
        country: "CO",
      },
    });
    // Subroles del sistema (suscriptor + candidato).
    const subRoleDefs = SYSTEM_ROLES.filter((r) => r.scope === "SUBSCRIBER" || r.scope === "CANDIDATE");
    let adminRoleId = "";
    for (const r of subRoleDefs) {
      const role = await tx.role.create({
        data: { subscriberId: sub.id, key: r.key, name: r.name, description: r.description, isSystem: true, permissions: r.permissions },
      });
      if (r.key === "SUBSCRIBER_ADMIN") adminRoleId = role.id;
    }
    // Usuario administrador del suscriptor.
    await tx.user.create({
      data: {
        subscriberId: sub.id,
        type: "SUBSCRIBER",
        email: d.adminEmail.toLowerCase(),
        passwordHash,
        firstName: d.adminFirstName,
        lastName: d.adminLastName,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        roleId: adminRoleId,
      },
    });
    // Política de datos + finalidades por defecto.
    await tx.privacyPolicyVersion.create({
      data: {
        subscriberId: sub.id,
        version: "v1.0",
        title: "Política de Tratamiento de Datos Personales",
        content: "Esta organización trata sus datos personales conforme a la Ley 1581 de 2012, con las finalidades de evaluación, certificación, verificación pública y conservación de evidencias.",
        isCurrent: true,
      },
    });
    await tx.consentPurpose.createMany({
      data: [
        { subscriberId: sub.id, key: "evaluacion", label: "Procesos de evaluación", required: true },
        { subscriberId: sub.id, key: "emails", label: "Envío de correos y comunicaciones", required: true },
        { subscriberId: sub.id, key: "verificacion", label: "Verificación pública de certificados", required: true },
        { subscriberId: sub.id, key: "conservacion", label: "Conservación de evidencias para auditoría", required: true },
        { subscriberId: sub.id, key: "recordatorios", label: "Recordatorios de renovación", required: false },
      ],
    });
    return sub;
  });

  await audit(ctx, { action: "subscriber.create", entity: "Subscriber", entityId: created.id, subscriberId: created.id, after: { slug: d.slug } });
  revalidatePath("/admin/suscriptores");
  redirect("/admin/suscriptores");
}

/// Cambia el estado de un suscriptor (activar/suspender/cancelar).
export async function setSubscriberStatus(
  subscriberId: string,
  status: "ACTIVE" | "SUSPENDED" | "TRIAL" | "CANCELLED",
): Promise<void> {
  const ctx = await requirePlatformAction(PERMISSIONS.SUBSCRIBER_MANAGE);
  await prisma.subscriber.update({ where: { id: subscriberId }, data: { status } });
  await audit(ctx, { action: "subscriber.status", entity: "Subscriber", entityId: subscriberId, subscriberId, after: { status } });
  revalidatePath("/admin/suscriptores");
}

/// Asigna o cambia el plan de un suscriptor.
export async function assignPlan(subscriberId: string, planId: string | null): Promise<void> {
  const ctx = await requirePlatformAction(PERMISSIONS.SUBSCRIBER_MANAGE);
  await prisma.subscriber.update({ where: { id: subscriberId }, data: { planId } });
  await audit(ctx, { action: "subscriber.plan", entity: "Subscriber", entityId: subscriberId, subscriberId, after: { planId } });
  revalidatePath("/admin/suscriptores");
}

const planSchema = z.object({
  key: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, "Clave: minúsculas, números y guiones"),
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional().nullable(),
  priceMonthly: z.coerce.number().min(0),
  priceYearly: z.coerce.number().min(0),
  maxUsers: z.coerce.number().int().min(1).max(100000),
  maxCandidates: z.coerce.number().int().min(1).max(10000000),
  maxExams: z.coerce.number().int().min(1).max(100000),
  isActive: z.boolean().default(true),
});

/// Crea o actualiza un plan comercial del SaaS.
export async function upsertPlan(
  planId: string | null,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requirePlatformAction(PERMISSIONS.PLAN_MANAGE);
  const parsed = planSchema.safeParse({
    key: (formData.get("key") as string | null)?.toLowerCase().trim(),
    name: formData.get("name"),
    description: clean(formData.get("description")),
    priceMonthly: formData.get("priceMonthly"),
    priceYearly: formData.get("priceYearly"),
    maxUsers: formData.get("maxUsers"),
    maxCandidates: formData.get("maxCandidates"),
    maxExams: formData.get("maxExams"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const data = {
    name: d.name,
    description: d.description,
    priceMonthly: new Prisma.Decimal(d.priceMonthly),
    priceYearly: new Prisma.Decimal(d.priceYearly),
    maxUsers: d.maxUsers,
    maxCandidates: d.maxCandidates,
    maxExams: d.maxExams,
    isActive: d.isActive,
  };
  if (planId) {
    const existing = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true } });
    if (!existing) return { ok: false, error: "Plan no encontrado." };
    await prisma.plan.update({ where: { id: planId }, data });
  } else {
    const dup = await prisma.plan.findUnique({ where: { key: d.key }, select: { id: true } });
    if (dup) return { ok: false, error: "Ya existe un plan con esa clave." };
    await prisma.plan.create({ data: { key: d.key, ...data } });
  }
  await audit(ctx, { action: planId ? "plan.update" : "plan.create", entity: "Plan", entityId: planId ?? d.key });
  revalidatePath("/admin/planes");
  return { ok: true };
}

// ─── Rapyd: el SUPERADMIN puede editar las claves de cualquier suscriptor ──
const rapydPlatformSchema = z.object({
  subscriberId: z.string().min(5),
  rapydEnabled: z.boolean(),
  rapydEnv: z.enum(["sandbox", "production"]),
  rapydAccessKey: z.string().max(120).optional().nullable(),
  rapydSecretKey: z.string().max(400).optional().nullable(),
  rapydMerchantNote: z.string().max(200).optional().nullable(),
});

/// SUPERADMIN configura las claves Rapyd de cualquier suscriptor.
/// Misma semántica que la versión del lado del propio suscriptor:
/// si la nueva secret viene vacía, se conserva la existente.
export async function updateRapydConfigForSubscriber(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requirePlatformAction(PERMISSIONS.SUBSCRIBER_MANAGE);
  const parsed = rapydPlatformSchema.safeParse({
    subscriberId: formData.get("subscriberId"),
    rapydEnabled: formData.get("rapydEnabled") === "on",
    rapydEnv: (formData.get("rapydEnv") as string) || "sandbox",
    rapydAccessKey: clean(formData.get("rapydAccessKey")),
    rapydSecretKey: clean(formData.get("rapydSecretKey")),
    rapydMerchantNote: clean(formData.get("rapydMerchantNote")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  const current = await prisma.subscriber.findUnique({
    where: { id: d.subscriberId },
    select: { rapydAccessKey: true, rapydSecretKey: true, rapydEnabled: true, rapydEnv: true },
  });
  if (!current) return { ok: false, error: "Suscriptor no encontrado." };

  const nextSecret = d.rapydSecretKey ?? current.rapydSecretKey ?? null;
  const nextAccess = d.rapydAccessKey ?? current.rapydAccessKey ?? null;

  if (d.rapydEnabled && (!nextAccess || !nextSecret)) {
    return { ok: false, error: "Para activar Rapyd se requieren ambas claves." };
  }

  await prisma.subscriber.update({
    where: { id: d.subscriberId },
    data: {
      rapydEnabled: d.rapydEnabled,
      rapydEnv: d.rapydEnv,
      rapydAccessKey: nextAccess,
      rapydSecretKey: nextSecret,
      rapydMerchantNote: d.rapydMerchantNote,
    },
  });
  await audit(ctx, {
    action: "platform.rapyd.update",
    entity: "Subscriber",
    entityId: d.subscriberId,
    subscriberId: d.subscriberId,
    before: { rapydEnabled: current.rapydEnabled, rapydEnv: current.rapydEnv, rapydAccessKey: current.rapydAccessKey },
    after: { rapydEnabled: d.rapydEnabled, rapydEnv: d.rapydEnv, rapydAccessKey: nextAccess, secretChanged: !!d.rapydSecretKey },
  });
  revalidatePath(`/admin/suscriptores/${d.subscriberId}`);
  return { ok: true, message: "Configuración Rapyd actualizada." };
}

const platformEditUserSchema = z.object({
  userId: z.string().min(5),
  firstName: z.string().min(2, "Nombre requerido").max(80),
  lastName: z.string().min(2, "Apellido requerido").max(80),
  email: z.string().email("Correo inválido").max(190),
  phone: z.string().max(40).optional().nullable(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION"]).optional().nullable(),
});

/// SUPERADMIN edita los datos de cualquier usuario de cualquier suscriptor.
/// Útil cuando un suscriptor pierde acceso y necesita reasignación de correo.
export async function updateUserByPlatform(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requirePlatformAction(PERMISSIONS.SUBSCRIBER_MANAGE);
  const parsed = platformEditUserSchema.safeParse({
    userId: formData.get("userId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: clean(formData.get("phone")),
    status: (formData.get("status") as string) || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const email = d.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { id: d.userId },
    select: {
      id: true, subscriberId: true, email: true, firstName: true,
      lastName: true, phone: true, status: true,
    },
  });
  if (!user) return { ok: false, error: "Usuario no encontrado." };

  if (email !== user.email && user.subscriberId) {
    const collision = await prisma.user.findFirst({
      where: {
        subscriberId: user.subscriberId,
        NOT: { id: user.id },
        OR: [{ email }, { additionalEmails: { has: email } }],
      },
      select: { id: true },
    });
    if (collision) {
      return { ok: false, error: "Ese correo ya está en uso por otra cuenta del mismo suscriptor." };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      email,
      phone: d.phone,
      status: d.status ?? user.status,
    },
  });
  if (user.subscriberId) {
    await prisma.candidate.updateMany({
      where: { userId: user.id, subscriberId: user.subscriberId },
      data: { firstName: d.firstName, lastName: d.lastName, email, phone: d.phone },
    });
  }
  await audit(ctx, {
    action: "platform.user.update",
    entity: "User",
    entityId: user.id,
    subscriberId: user.subscriberId,
    before: {
      firstName: user.firstName, lastName: user.lastName,
      email: user.email, phone: user.phone, status: user.status,
    },
    after: { firstName: d.firstName, lastName: d.lastName, email, phone: d.phone, status: d.status },
  });
  revalidatePath("/panel/usuarios");
  revalidatePath(`/admin/suscriptores`);
  return { ok: true, message: "Datos actualizados por la plataforma." };
}
