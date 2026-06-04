import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function csvField(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

interface RapydMetadata {
  rapyd?: {
    checkoutId?: string;
    type?: string;
    status?: string;
    failureCode?: string;
    failureMessage?: string;
    env?: string;
    receivedAt?: string;
  };
  rapydError?: string;
}

/// Exporta la lista filtrada de pagos a CSV con BOM + CRLF para que Excel
/// y Google Sheets reconozcan acentos y los abran nativamente.
/// Respeta exactamente los filtros del listado (q, status, provider, from, to).
export async function GET(req: NextRequest) {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.PAYMENT_VIEW) && !can(ctx, PERMISSIONS.PAYMENT_MANAGE)) {
    return new Response("Forbidden", { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const status = sp.get("status") ?? "";
  const provider = sp.get("provider") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";

  const where: Prisma.PaymentWhereInput = { subscriberId };
  if (status) where.status = status as Prisma.PaymentWhereInput["status"];
  if (provider) where.provider = provider;
  if (from || to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (from) createdAt.gte = new Date(`${from}T00:00:00`);
    if (to)   createdAt.lte = new Date(`${to}T23:59:59`);
    where.createdAt = createdAt;
  }
  if (q) {
    where.OR = [
      { providerRef: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { enrollment: { code: { contains: q, mode: "insensitive" } } },
      { enrollment: { candidate: { documentNumber: { contains: q, mode: "insensitive" } } } },
      { enrollment: { candidate: { firstName: { contains: q, mode: "insensitive" } } } },
      { enrollment: { candidate: { lastName: { contains: q, mode: "insensitive" } } } },
      { enrollment: { candidate: { email: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const payments = await prisma.payment.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      enrollment: {
        select: {
          code: true,
          candidate: { select: { firstName: true, lastName: true, documentType: true, documentNumber: true, email: true, phone: true } },
          scheme: { select: { name: true } },
          exam: { select: { name: true } },
        },
      },
    },
  });

  const headers = [
    "ID Pago", "Fecha creación", "Fecha pago",
    "Estado", "Proveedor", "Moneda", "Monto",
    "Referencia proveedor", "Rapyd Checkout ID", "Rapyd Evento", "Rapyd Status", "Rapyd Env", "Rapyd Failure",
    "Concepto", "Esquema", "Folio inscripción",
    "Candidato", "Tipo doc", "Documento", "Email", "Teléfono",
  ];

  const rows = payments.map((p) => {
    const enr = p.enrollment;
    const c = enr?.candidate;
    const rapydMeta = p.metadata as RapydMetadata | null;
    const r = rapydMeta?.rapyd;
    const failure = [r?.failureCode, r?.failureMessage].filter(Boolean).join(" — ");
    return [
      p.id,
      p.createdAt.toISOString(),
      p.paidAt ? p.paidAt.toISOString() : "",
      p.status,
      p.provider ?? "",
      p.currency,
      p.amount.toString(),
      p.providerRef ?? "",
      r?.checkoutId ?? "",
      r?.type ?? "",
      r?.status ?? "",
      r?.env ?? "",
      failure || rapydMeta?.rapydError || "",
      p.description ?? "",
      enr?.scheme?.name ?? enr?.exam?.name ?? "",
      enr?.code ?? "",
      c ? `${c.firstName} ${c.lastName}` : "",
      c?.documentType ?? "",
      c?.documentNumber ?? "",
      c?.email ?? "",
      c?.phone ?? "",
    ].map(csvField).join(",");
  });

  // BOM + CRLF para máxima compatibilidad con Excel en Windows / Mac.
  const body = "﻿" + [headers.join(","), ...rows].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pagos-${new Date().toISOString().slice(0,10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
