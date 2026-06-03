import { prisma } from "@/lib/prisma";
import { getCurrentUser, can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";

/// Tipos de reporte CSV disponibles para el suscriptor.
const REPORT_TYPES = [
  "candidatos",
  "inscripciones",
  "pagos",
  "certificados",
  "evaluaciones",
] as const;
type ReportType = (typeof REPORT_TYPES)[number];

/// Escapa un valor para CSV: lo envuelve en comillas dobles si contiene
/// coma, comilla, salto de línea o retorno de carro, duplicando las comillas.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (value instanceof Date) {
    s = value.toISOString();
  } else if (typeof value === "object") {
    // Decimal de Prisma u otros con toString()
    s = (value as { toString(): string }).toString();
  } else {
    s = String(value);
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/// Construye un CSV (separador coma) a partir de encabezados y filas.
function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(","));
  }
  return lines.join("\r\n");
}

/// Exporta reportes del tenant en CSV. Solo personal del suscriptor con
/// permiso report.view. Toda consulta se filtra por subscriberId.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;

  const ctx = await getCurrentUser();
  if (!ctx) return new Response("No autenticado", { status: 401 });
  if (ctx.type !== "SUBSCRIBER" || !ctx.subscriberId) {
    return new Response("Acceso denegado", { status: 403 });
  }
  if (!can(ctx, PERMISSIONS.REPORT_VIEW)) {
    return new Response("Acceso denegado", { status: 403 });
  }
  if (!REPORT_TYPES.includes(type as ReportType)) {
    return new Response("Reporte no encontrado", { status: 404 });
  }

  const subscriberId = ctx.subscriberId;
  let headers: string[] = [];
  let rows: unknown[][] = [];

  switch (type as ReportType) {
    case "candidatos": {
      const data = await prisma.candidate.findMany({
        where: { subscriberId },
        orderBy: { createdAt: "desc" },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          documentNumber: true,
          phone: true,
          createdAt: true,
        },
      });
      headers = [
        "Nombre",
        "Apellido",
        "Correo",
        "Documento",
        "Teléfono",
        "Creado",
      ];
      rows = data.map((c) => [
        c.firstName,
        c.lastName,
        c.email,
        c.documentNumber,
        c.phone,
        c.createdAt,
      ]);
      break;
    }
    case "inscripciones": {
      const data = await prisma.enrollment.findMany({
        where: { subscriberId },
        orderBy: { createdAt: "desc" },
        include: {
          candidate: { select: { firstName: true, lastName: true } },
          exam: { select: { name: true } },
        },
      });
      headers = [
        "Folio",
        "Candidato",
        "Examen",
        "Tipo",
        "Estado",
        "Creado",
      ];
      rows = data.map((e) => [
        e.code,
        `${e.candidate.firstName} ${e.candidate.lastName}`,
        e.exam?.name ?? "",
        e.type,
        e.status,
        e.createdAt,
      ]);
      break;
    }
    case "pagos": {
      const data = await prisma.payment.findMany({
        where: { subscriberId },
        orderBy: { createdAt: "desc" },
        include: { enrollment: { select: { code: true } } },
      });
      headers = [
        "Folio inscripción",
        "Concepto",
        "Descripción",
        "Monto",
        "Moneda",
        "Estado",
        "Pagado",
      ];
      rows = data.map((p) => [
        p.enrollment?.code ?? "",
        p.concept,
        p.description ?? "",
        p.amount,
        p.currency,
        p.status,
        p.paidAt,
      ]);
      break;
    }
    case "certificados": {
      const data = await prisma.certificate.findMany({
        where: { subscriberId },
        orderBy: { issuedAt: "desc" },
        select: {
          code: true,
          holderName: true,
          documentNumber: true,
          type: true,
          status: true,
          issuedAt: true,
          expiresAt: true,
        },
      });
      headers = [
        "Código",
        "Titular",
        "Documento",
        "Tipo",
        "Estado",
        "Emisión",
        "Vencimiento",
      ];
      rows = data.map((c) => [
        c.code,
        c.holderName,
        c.documentNumber ?? "",
        c.type,
        c.status,
        c.issuedAt,
        c.expiresAt,
      ]);
      break;
    }
    case "evaluaciones": {
      const data = await prisma.exam.findMany({
        where: { subscriberId },
        orderBy: { createdAt: "desc" },
        select: {
          code: true,
          name: true,
          type: true,
          modality: true,
          status: true,
          durationMin: true,
          passingScore: true,
        },
      });
      headers = [
        "Código",
        "Nombre",
        "Tipo",
        "Modalidad",
        "Estado",
        "Duración (min)",
        "Puntaje aprobatorio",
      ];
      rows = data.map((x) => [
        x.code,
        x.name,
        x.type,
        x.modality,
        x.status,
        x.durationMin,
        x.passingScore,
      ]);
      break;
    }
  }

  const csv = toCsv(headers, rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-${type}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
