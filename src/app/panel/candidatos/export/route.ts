import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function csvField(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/// Exporta la lista filtrada de candidatos a CSV. Excel y Google Sheets lo
/// abren nativamente. Se respetan los mismos filtros del listado.
export async function GET(req: NextRequest) {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.CANDIDATE_MANAGE) && !can(ctx, PERMISSIONS.ENROLLMENT_MANAGE)) {
    return new Response("Forbidden", { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const status = sp.get("status") ?? "";
  const payment = sp.get("payment") ?? "";
  const consent = sp.get("consent") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";

  // Reusamos exactamente el filtro de la lista (mantenido en sync).
  const where = buildWhere({ subscriberId, q, status, payment, consent, from, to });

  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { lastLoginAt: true, lastLoginIp: true, status: true } },
      consents: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, policyVersion: true } },
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: {
          exam: { select: { name: true } },
          scheme: { select: { name: true } },
          payments: { where: { status: "APPROVED" }, orderBy: { paidAt: "desc" }, take: 1, select: { amount: true, currency: true, paidAt: true, providerRef: true } },
          documents: { select: { status: true } },
        },
      },
    },
  });

  const header = [
    "Folio último", "Nombre", "Apellidos", "Correo", "Documento", "N° documento", "Teléfono", "País", "Ciudad",
    "Fecha registro", "Último ingreso", "IP último ingreso", "Estado de cuenta",
    "Autorización datos (versión)", "Fecha autorización",
    "Inscripciones (total)", "Último estado", "Programa",
    "Pago aprobado (monto)", "Moneda", "Fecha de pago", "Referencia",
    "Documentos aprobados", "Documentos pendientes", "Documentos rechazados",
  ];

  const rows: string[] = [header.map(csvField).join(",")];
  for (const c of candidates) {
    const last = c.enrollments[0];
    const lastPayment = last?.payments[0];
    const docsApproved = last?.documents.filter((d) => d.status === "APPROVED").length ?? 0;
    const docsPending = last?.documents.filter((d) => d.status === "SUBMITTED").length ?? 0;
    const docsRejected = last?.documents.filter((d) => d.status === "REJECTED").length ?? 0;
    const consent = c.consents[0];
    rows.push([
      last?.code ?? "",
      c.firstName,
      c.lastName,
      c.email,
      c.documentType ?? "",
      c.documentNumber ?? "",
      c.phone ?? "",
      c.country ?? "",
      c.city ?? "",
      c.createdAt.toISOString(),
      c.user?.lastLoginAt?.toISOString() ?? "",
      c.user?.lastLoginIp ?? "",
      c.user?.status ?? "",
      consent?.policyVersion?.toString() ?? "",
      consent?.createdAt?.toISOString() ?? "",
      c.enrollments.length,
      last?.status ?? "",
      last?.exam?.name ?? last?.scheme?.name ?? "",
      lastPayment?.amount?.toString() ?? "",
      lastPayment?.currency ?? "",
      lastPayment?.paidAt?.toISOString() ?? "",
      lastPayment?.providerRef ?? "",
      docsApproved,
      docsPending,
      docsRejected,
    ].map(csvField).join(","));
  }

  // BOM + CRLF para máxima compatibilidad con Excel (especialmente en Windows).
  const body = "﻿" + rows.join("\r\n");
  const fname = `candidatos_${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}

// Compartido con la lista (importado allí). Lo redefinimos aquí porque la ruta
// de export está aislada; cualquier ajuste a los filtros debe hacerse en ambos
// lugares (mantener en sync hasta que extraigamos un helper común).
function buildWhere(args: {
  subscriberId: string;
  q: string;
  status: string;
  payment: string;
  consent: string;
  from: string;
  to: string;
}) {
  // Replica del helper en page.tsx. Si cambias uno, cambia el otro.
  const { subscriberId, q, status, payment, consent, from, to } = args;
  const where: Record<string, unknown> = { subscriberId };

  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { documentNumber: { contains: q, mode: "insensitive" } },
    ];
  }
  const dateFrom = from ? new Date(from) : null;
  const dateTo = to ? new Date(to) : null;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }
  if (status) {
    where.enrollments = { some: { status } };
  }
  if (payment === "approved") {
    where.enrollments = { ...(where.enrollments as object | undefined ?? {}), some: { ...(where.enrollments as { some?: object } | undefined)?.some, payments: { some: { status: "APPROVED" } } } };
  } else if (payment === "pending") {
    where.enrollments = { ...(where.enrollments as object | undefined ?? {}), some: { ...(where.enrollments as { some?: object } | undefined)?.some, payments: { some: { status: "PENDING" } } } };
  } else if (payment === "none") {
    where.enrollments = { ...(where.enrollments as object | undefined ?? {}), some: { ...(where.enrollments as { some?: object } | undefined)?.some, payments: { none: {} } } };
  }
  if (consent === "yes") where.consents = { some: {} };
  else if (consent === "no") where.consents = { none: {} };

  return where;
}
