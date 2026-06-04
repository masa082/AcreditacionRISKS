import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Capa de métricas y KPIs del dashboard.
 *
 * Filosofía:
 *   - Todo cálculo se hace en una sola query SQL agregada por bucket de
 *     tiempo (día/semana/mes) para que el dashboard escale a millones de
 *     filas sin tocar memoria de la app.
 *   - Las series temporales siempre vienen rellenas de ceros en huecos —
 *     un mes sin certificados aparece como `{ bucket: "...", value: 0 }`,
 *     no se omite. Eso hace que las gráficas se vean correctas sin
 *     interpolación.
 *   - Todo soporta multitenant: las funciones reciben subscriberId o null
 *     (null => métricas globales para el SUPERADMIN).
 */

export type Granularity = "day" | "week" | "month";
export type RangePreset =
  | "this-week" | "this-month" | "this-quarter" | "this-year"
  | "last-week" | "last-month" | "last-quarter" | "last-year"
  | "last-7d" | "last-30d" | "last-90d" | "last-12m";

export interface DateRange {
  from: Date;
  to: Date;
  /// Período inmediatamente anterior, del MISMO largo. Usado para el delta.
  prevFrom: Date;
  prevTo: Date;
  /// Mismo período del año pasado. Usado para comparativo "vs año anterior".
  yoyFrom: Date;
  yoyTo: Date;
  /// Granularidad recomendada para gráficas dada la longitud del rango.
  granularity: Granularity;
  /// Etiqueta legible para mostrar.
  label: string;
}

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date): Date { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function addMonths(d: Date, n: number): Date { const x = new Date(d); x.setMonth(x.getMonth()+n); return x; }
function addYears(d: Date, n: number): Date { const x = new Date(d); x.setFullYear(x.getFullYear()+n); return x; }
function startOfMonth(d: Date): Date { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function startOfYear(d: Date): Date { const x = new Date(d.getFullYear(), 0, 1); return x; }
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay() || 7; // lunes = 1, domingo = 7
  if (day !== 1) x.setDate(x.getDate() - (day - 1));
  return x;
}

/// Resuelve un preset textual a un DateRange concreto (server-side, ancla
/// en la zona horaria local del servidor). Para casos donde se requiera
/// zona horaria fija se podría parametrizar.
export function resolveRange(preset: RangePreset, now: Date = new Date()): DateRange {
  let from: Date;
  let to: Date = endOfDay(now);
  let label = "";

  switch (preset) {
    case "this-week":     from = startOfWeek(now);                    label = "Esta semana"; break;
    case "this-month":    from = startOfMonth(now);                   label = "Este mes"; break;
    case "this-quarter": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), q, 1);                       label = "Este trimestre"; break;
    }
    case "this-year":     from = startOfYear(now);                    label = "Este año"; break;
    case "last-week":     from = startOfWeek(addDays(now, -7)); to = endOfDay(addDays(startOfWeek(now), -1)); label = "Semana pasada"; break;
    case "last-month": {
      const prev = addMonths(startOfMonth(now), -1);
      from = prev; to = endOfDay(addDays(startOfMonth(now), -1));     label = "Mes pasado"; break;
    }
    case "last-quarter": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      const prevQ = new Date(now.getFullYear(), q - 3, 1);
      from = prevQ;
      to = endOfDay(addDays(new Date(now.getFullYear(), q, 1), -1));
      label = "Trimestre pasado"; break;
    }
    case "last-year": {
      from = startOfYear(addYears(now, -1));
      to = endOfDay(addDays(startOfYear(now), -1));                   label = "Año pasado"; break;
    }
    case "last-7d":       from = startOfDay(addDays(now, -6));        label = "Últimos 7 días"; break;
    case "last-30d":      from = startOfDay(addDays(now, -29));       label = "Últimos 30 días"; break;
    case "last-90d":      from = startOfDay(addDays(now, -89));       label = "Últimos 90 días"; break;
    case "last-12m":      from = startOfDay(addMonths(now, -11));     label = "Últimos 12 meses"; break;
  }

  const lengthMs = to.getTime() - from.getTime();
  const days = Math.max(1, Math.round(lengthMs / 86_400_000));

  // Período inmediatamente anterior (mismo largo) → delta.
  const prevTo = endOfDay(addDays(from, -1));
  const prevFrom = startOfDay(addDays(prevTo, -(days - 1)));

  // Mismo rango pero un año atrás → comparativo YoY.
  const yoyFrom = addYears(from, -1);
  const yoyTo = addYears(to, -1);

  const granularity: Granularity =
    days <= 14 ? "day" : days <= 90 ? "week" : "month";

  return { from, to, prevFrom, prevTo, yoyFrom, yoyTo, granularity, label };
}

/// Bucket que devuelve toda función de series temporales.
export interface TimePoint {
  bucket: string; // "2026-06" / "2026-06-03" / "2026-W23"
  date: Date;
  value: number;
}

interface Counts {
  candidatesTotal: number;
  candidatesNew: number;
  enrollmentsTotal: number;
  enrollmentsPaid: number;
  paymentsApprovedCount: number;
  paymentsApprovedAmount: number; // en la moneda del primer pago — aquí asumimos COP por homogeneidad
  certificatesIssued: number;
  certificatesExpiringSoon: number;
  attemptsSubmitted: number;
  attemptsPassed: number;
  pendingGrading: number;
  pendingPayment: number;
  openAppeals: number;
  leadsNew: number;
}

const ZERO_COUNTS: Counts = {
  candidatesTotal: 0, candidatesNew: 0, enrollmentsTotal: 0, enrollmentsPaid: 0,
  paymentsApprovedCount: 0, paymentsApprovedAmount: 0, certificatesIssued: 0,
  certificatesExpiringSoon: 0, attemptsSubmitted: 0, attemptsPassed: 0,
  pendingGrading: 0, pendingPayment: 0, openAppeals: 0, leadsNew: 0,
};

/// Calcula los contadores principales en un rango. Recibe subscriberId
/// (string) para el panel del suscriptor, o `null` para métricas globales
/// del SUPERADMIN.
export async function getCountsInRange(
  subscriberId: string | null,
  range: { from: Date; to: Date },
): Promise<Counts> {
  const where = subscriberId ? { subscriberId } : {};
  const expSoon = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const [
    candidatesTotal, candidatesNew,
    enrollmentsTotal, enrollmentsPaid,
    paymentsAgg,
    certificatesIssued, certificatesExpiringSoon,
    attemptsSubmitted, attemptsPassed,
    pendingGrading, pendingPayment,
    openAppeals, leadsNew,
  ] = await Promise.all([
    prisma.candidate.count({ where }),
    prisma.candidate.count({ where: { ...where, createdAt: { gte: range.from, lte: range.to } } }),
    prisma.enrollment.count({ where: { ...where, createdAt: { gte: range.from, lte: range.to } } }),
    prisma.enrollment.count({ where: { ...where, payments: { some: { status: "APPROVED", paidAt: { gte: range.from, lte: range.to } } } } }),
    prisma.payment.aggregate({
      _sum: { amount: true }, _count: { _all: true },
      where: { ...where, status: "APPROVED", paidAt: { gte: range.from, lte: range.to } },
    }),
    prisma.certificate.count({ where: { ...where, issuedAt: { gte: range.from, lte: range.to }, type: "CERTIFICATION" } }),
    prisma.certificate.count({ where: { ...where, status: "VALID", expiresAt: { lte: expSoon, gte: new Date() } } }),
    prisma.examAttempt.count({ where: { ...where, submittedAt: { gte: range.from, lte: range.to } } }),
    prisma.examAttempt.count({ where: { ...where, submittedAt: { gte: range.from, lte: range.to }, passed: true } }),
    prisma.examAttempt.count({ where: { ...where, status: { in: ["SUBMITTED", "MANUAL_GRADING"] } } }),
    prisma.enrollment.count({ where: { ...where, status: "PAYMENT_PENDING" } }),
    prisma.appeal.count({ where: { ...where, status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.lead.count({ where: { ...where, createdAt: { gte: range.from, lte: range.to } } }),
  ]);

  return {
    candidatesTotal,
    candidatesNew,
    enrollmentsTotal,
    enrollmentsPaid,
    paymentsApprovedCount: paymentsAgg._count._all,
    paymentsApprovedAmount: Number(paymentsAgg._sum.amount ?? 0),
    certificatesIssued,
    certificatesExpiringSoon,
    attemptsSubmitted,
    attemptsPassed,
    pendingGrading,
    pendingPayment,
    openAppeals,
    leadsNew,
  };
}

/// Wrapper que devuelve también los contadores del período anterior y del
/// mismo rango del año pasado, para calcular delta y YoY.
export async function getKpiBundle(
  subscriberId: string | null,
  range: DateRange,
): Promise<{ current: Counts; previous: Counts; yoy: Counts }> {
  const [current, previous, yoy] = await Promise.all([
    getCountsInRange(subscriberId, range),
    getCountsInRange(subscriberId, { from: range.prevFrom, to: range.prevTo }),
    getCountsInRange(subscriberId, { from: range.yoyFrom, to: range.yoyTo }).catch(() => ZERO_COUNTS),
  ]);
  return { current, previous, yoy };
}

// ─── Series temporales ────────────────────────────────────────────────────

function bucketFmtSQL(g: Granularity): string {
  switch (g) {
    case "day":   return "TO_CHAR(date_trunc('day', t.\"d\"),   'YYYY-MM-DD')";
    case "week":  return "TO_CHAR(date_trunc('week', t.\"d\"),  'IYYY-\"W\"IW')";
    case "month": return "TO_CHAR(date_trunc('month', t.\"d\"), 'YYYY-MM')";
  }
}

function bucketFmtJS(g: Granularity, d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (g === "day") return `${y}-${m}-${day}`;
  if (g === "month") return `${y}-${m}`;
  // ISO week
  const t = new Date(Date.UTC(y, d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function* iterBuckets(from: Date, to: Date, g: Granularity): Iterable<Date> {
  const cur = startOfDay(from);
  const end = startOfDay(to);
  while (cur <= end) {
    yield new Date(cur);
    if (g === "day") cur.setDate(cur.getDate() + 1);
    else if (g === "week") cur.setDate(cur.getDate() + 7);
    else cur.setMonth(cur.getMonth() + 1);
  }
}

function fillZeros(rows: { bucket: string; value: number }[], from: Date, to: Date, g: Granularity): TimePoint[] {
  const map = new Map(rows.map((r) => [r.bucket, r.value]));
  const result: TimePoint[] = [];
  for (const d of iterBuckets(from, to, g)) {
    const bucket = bucketFmtJS(g, d);
    result.push({ bucket, date: d, value: map.get(bucket) ?? 0 });
  }
  return result;
}

/// Cuenta filas agrupadas por bucket de tiempo a partir de una columna
/// timestamp. Devuelve una serie con ceros en huecos.
async function timeseriesCount(opts: {
  table: '"Candidate"' | '"Enrollment"' | '"Certificate"' | '"ExamAttempt"' | '"Lead"';
  dateColumn: string;
  subscriberId: string | null;
  where: string; // condiciones adicionales SQL (sin WHERE/AND)
  range: { from: Date; to: Date };
  granularity: Granularity;
}): Promise<TimePoint[]> {
  const bucketExpr = bucketFmtSQL(opts.granularity);
  const subFilter = opts.subscriberId
    ? Prisma.sql`AND t."subscriberId" = ${opts.subscriberId}`
    : Prisma.empty;
  const extra = opts.where ? Prisma.raw(`AND ${opts.where}`) : Prisma.empty;
  const tableSql = Prisma.raw(opts.table);
  const colSql = Prisma.raw(`"${opts.dateColumn}"`);
  // Construimos la query parcial; bucketExpr necesita ser interpolado como raw porque depende de la granularidad.
  const bucketSql = Prisma.raw(bucketExpr);

  const rows = await prisma.$queryRaw<{ bucket: string; value: bigint }[]>(Prisma.sql`
    SELECT ${bucketSql} AS bucket, COUNT(*)::bigint AS value
    FROM (
      SELECT ${colSql} AS "d", "subscriberId"
      FROM ${tableSql}
      WHERE ${colSql} >= ${opts.range.from} AND ${colSql} <= ${opts.range.to} ${extra}
    ) AS t
    WHERE 1=1 ${subFilter}
    GROUP BY 1
    ORDER BY 1
  `);

  return fillZeros(
    rows.map((r) => ({ bucket: r.bucket, value: Number(r.value) })),
    opts.range.from, opts.range.to, opts.granularity,
  );
}

/// Suma agregada con bucket de tiempo (p. ej. ingresos por mes).
async function timeseriesSum(opts: {
  table: '"Payment"';
  dateColumn: string;
  valueColumn: string;
  subscriberId: string | null;
  where: string;
  range: { from: Date; to: Date };
  granularity: Granularity;
}): Promise<TimePoint[]> {
  const bucketSql = Prisma.raw(bucketFmtSQL(opts.granularity));
  const subFilter = opts.subscriberId
    ? Prisma.sql`AND t."subscriberId" = ${opts.subscriberId}`
    : Prisma.empty;
  const extra = opts.where ? Prisma.raw(`AND ${opts.where}`) : Prisma.empty;
  const tableSql = Prisma.raw(opts.table);
  const colSql = Prisma.raw(`"${opts.dateColumn}"`);
  const valSql = Prisma.raw(`"${opts.valueColumn}"`);

  const rows = await prisma.$queryRaw<{ bucket: string; value: string }[]>(Prisma.sql`
    SELECT ${bucketSql} AS bucket, COALESCE(SUM(t."val"), 0)::numeric AS value
    FROM (
      SELECT ${colSql} AS "d", ${valSql} AS "val", "subscriberId"
      FROM ${tableSql}
      WHERE ${colSql} >= ${opts.range.from} AND ${colSql} <= ${opts.range.to} ${extra}
    ) AS t
    WHERE 1=1 ${subFilter}
    GROUP BY 1
    ORDER BY 1
  `);

  return fillZeros(
    rows.map((r) => ({ bucket: r.bucket, value: Number(r.value) })),
    opts.range.from, opts.range.to, opts.granularity,
  );
}

export async function tsNewCandidates(subscriberId: string | null, range: DateRange): Promise<TimePoint[]> {
  return timeseriesCount({
    table: '"Candidate"', dateColumn: "createdAt",
    subscriberId, where: "", range, granularity: range.granularity,
  });
}
export async function tsNewLeads(subscriberId: string | null, range: DateRange): Promise<TimePoint[]> {
  return timeseriesCount({
    table: '"Lead"', dateColumn: "createdAt",
    subscriberId, where: "", range, granularity: range.granularity,
  });
}
export async function tsCertificatesIssued(subscriberId: string | null, range: DateRange): Promise<TimePoint[]> {
  return timeseriesCount({
    table: '"Certificate"', dateColumn: "issuedAt",
    subscriberId, where: `"type" = 'CERTIFICATION'`, range, granularity: range.granularity,
  });
}
export async function tsAttemptsSubmitted(subscriberId: string | null, range: DateRange): Promise<TimePoint[]> {
  return timeseriesCount({
    table: '"ExamAttempt"', dateColumn: "submittedAt",
    subscriberId, where: `"submittedAt" IS NOT NULL`, range, granularity: range.granularity,
  });
}
export async function tsRevenue(subscriberId: string | null, range: DateRange): Promise<TimePoint[]> {
  return timeseriesSum({
    table: '"Payment"', dateColumn: "paidAt", valueColumn: "amount",
    subscriberId, where: `"status" = 'APPROVED' AND "paidAt" IS NOT NULL AND "amount" > 0`,
    range, granularity: range.granularity,
  });
}

// ─── Embudo de conversión ────────────────────────────────────────────────
export interface FunnelStep {
  key: string;
  label: string;
  value: number;
}

export async function getFunnel(subscriberId: string | null, range: DateRange): Promise<FunnelStep[]> {
  const where = subscriberId ? { subscriberId } : {};
  const r = { gte: range.from, lte: range.to };
  const [leads, candidates, paid, certified] = await Promise.all([
    prisma.lead.count({ where: { ...where, createdAt: r } }),
    prisma.candidate.count({ where: { ...where, createdAt: r } }),
    prisma.enrollment.count({ where: { ...where, payments: { some: { status: "APPROVED", paidAt: r } } } }),
    prisma.certificate.count({ where: { ...where, issuedAt: r, type: "CERTIFICATION" } }),
  ]);
  return [
    { key: "leads", label: "Leads", value: leads },
    { key: "candidates", label: "Candidatos", value: candidates },
    { key: "paid", label: "Inscripciones pagadas", value: paid },
    { key: "certified", label: "Certificados", value: certified },
  ];
}

// ─── Distribución por estado de Enrollment (para dona) ────────────────────
export async function getEnrollmentStatus(subscriberId: string | null, range: DateRange): Promise<{ status: string; count: number }[]> {
  const where = subscriberId ? { subscriberId } : {};
  const groups = await prisma.enrollment.groupBy({
    by: ["status"],
    _count: { _all: true },
    where: { ...where, createdAt: { gte: range.from, lte: range.to } },
  });
  return groups.map((g) => ({ status: g.status, count: g._count._all })).sort((a, b) => b.count - a.count);
}

// ─── Top esquemas por candidatos / certificados ──────────────────────────
export async function getTopSchemes(subscriberId: string | null, range: DateRange, limit = 5): Promise<{ name: string; certs: number; enrollments: number }[]> {
  const where = subscriberId ? { subscriberId } : {};
  const r = { gte: range.from, lte: range.to };

  const schemes = await prisma.certificationScheme.findMany({
    where,
    select: {
      id: true, name: true, code: true,
      _count: {
        select: {
          enrollments: { where: { createdAt: r } },
          certificates: { where: { issuedAt: r, type: "CERTIFICATION" } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
  return schemes
    .map((s) => ({
      name: s.code || s.name,
      enrollments: s._count.enrollments,
      certs: s._count.certificates,
    }))
    .sort((a, b) => b.enrollments + b.certs - (a.enrollments + a.certs))
    .slice(0, limit);
}

// ─── "Candidatos no atendidos" — sin actividad útil reciente ──────────────
/// Devuelve cuántos candidatos no han avanzado en el embudo: están en
/// estados de "espera" (DOCS_PENDING / PAYMENT_PENDING / SCHEDULING) y no
/// han tenido actividad nueva en los últimos N días.
export async function getCandidatesStuck(subscriberId: string | null, days = 7): Promise<number> {
  const where = subscriberId ? { subscriberId } : {};
  const cutoff = new Date(Date.now() - days * 86_400_000);
  return prisma.enrollment.count({
    where: {
      ...where,
      status: { in: ["DOCS_PENDING", "PAYMENT_PENDING", "SCHEDULING", "CONSENT_PENDING"] },
      updatedAt: { lte: cutoff },
    },
  });
}

// ─── Heatmap de actividad por día×hora ───────────────────────────────────
export interface HeatmapCell { dow: number; hour: number; value: number }
export async function getActivityHeatmap(subscriberId: string | null, days = 30): Promise<HeatmapCell[]> {
  const from = new Date(Date.now() - days * 86_400_000);
  const subFilter = subscriberId
    ? Prisma.sql`AND "subscriberId" = ${subscriberId}`
    : Prisma.empty;
  // Usamos User.lastLoginAt como proxy de actividad (multi-tenant).
  const rows = await prisma.$queryRaw<{ dow: number; hour: number; value: bigint }[]>(Prisma.sql`
    SELECT EXTRACT(DOW FROM "lastLoginAt")::int AS dow,
           EXTRACT(HOUR FROM "lastLoginAt")::int AS hour,
           COUNT(*)::bigint AS value
    FROM "User"
    WHERE "lastLoginAt" >= ${from} ${subFilter}
    GROUP BY 1, 2
  `);
  return rows.map((r) => ({ dow: Number(r.dow), hour: Number(r.hour), value: Number(r.value) }));
}

// ─── Helpers de formato ──────────────────────────────────────────────────
export function pctDelta(curr: number, prev: number): number | null {
  if (!prev) return curr > 0 ? null : 0; // sin base de comparación
  return ((curr - prev) / prev) * 100;
}

export function fmtCurrency(amount: number, currency = "COP", locale = "es-CO"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(amount);
}

export function fmtNumber(n: number, locale = "es-CO"): string {
  return new Intl.NumberFormat(locale).format(n);
}

export function fmtPercent(p: number | null, digits = 1): string {
  if (p === null || Number.isNaN(p)) return "—";
  return `${p > 0 ? "+" : ""}${p.toFixed(digits)}%`;
}
