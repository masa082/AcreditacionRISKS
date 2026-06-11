"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/schemes";

/**
 * Marca una incidencia como resuelta. Solo el SUSCRIPTOR del mismo
 * tenant puede hacerlo; queda registrado quién resolvió y con qué nota.
 */
export async function resolveIncidentAction(
  id: string,
  resolution?: string,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction();
  const incident = await prisma.processIncident.findFirst({
    where: { id, subscriberId },
    select: { id: true, candidateId: true, resolvedAt: true },
  });
  if (!incident) return { ok: false, error: "Incidencia no encontrada" };
  if (incident.resolvedAt) return { ok: false, error: "Ya estaba resuelta" };

  await prisma.processIncident.update({
    where: { id },
    data: {
      resolvedAt: new Date(),
      resolvedById: ctx.userId,
      resolution: resolution?.slice(0, 1000) ?? "Marcada como resuelta por el organismo.",
    },
  });
  await audit(ctx, {
    action: "incident.resolve",
    entity: "ProcessIncident",
    entityId: id,
    subscriberId,
  });
  revalidatePath("/panel/candidatos");
  return { ok: true };
}

/// Marca todas las incidencias pendientes del candidato como resueltas.
export async function resolveAllForCandidateAction(candidateId: string): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction();
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, subscriberId },
    select: { id: true },
  });
  if (!candidate) return { ok: false, error: "Candidato no encontrado" };

  const r = await prisma.processIncident.updateMany({
    where: { candidateId, subscriberId, resolvedAt: null },
    data: {
      resolvedAt: new Date(),
      resolvedById: ctx.userId,
      resolution: "Bulk resolution por el organismo.",
    },
  });
  await audit(ctx, {
    action: "incident.bulk_resolve",
    entity: "Candidate",
    entityId: candidateId,
    subscriberId,
    after: { count: r.count },
  });
  revalidatePath("/panel/candidatos");
  return { ok: true, message: `${r.count} incidencia(s) resuelta(s).` };
}
