import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { DocumentReview } from "@/components/document-review";
import { CandidateEditForm } from "@/components/candidate-edit-form";
import { CandidateEmailsAdmin } from "@/components/candidate-emails-admin";
import { PdfThumb } from "@/components/pdf-thumb";
import { money, dateOnly, dateTime } from "@/lib/format";

function isPdfName(name: string | null): boolean {
  if (!name) return false;
  return /\.pdf$/i.test(name);
}

export const metadata = { title: "Detalle de candidato" };

// Política: la ficha del candidato siempre se renderiza fresca para
// reflejar inmediatamente cambios de documentos, pagos, intentos y
// emisión de certificados. Sin esto, Next podría servir versión cacheada
// y mostrar datos viejos ("inconsistencias" reportadas por el usuario).
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ENROLL_STATUS_ES: Record<string, string> = {
  STARTED: "Iniciado",
  CONSENT_PENDING: "Autorización pendiente",
  DOCS_PENDING: "Documentos pendientes",
  PAYMENT_PENDING: "Pago pendiente",
  SCHEDULING: "Por agendar",
  READY: "Listo para presentar",
  IN_PROGRESS: "En presentación",
  GRADING: "En calificación",
  COMMITTEE: "En comité",
  APPROVED: "Aprobado",
  REJECTED: "No aprobado",
  CERTIFIED: "Certificado",
  EXPIRED: "Vencido",
  CANCELLED: "Cancelado",
};

const DOC_STATUS: Record<string, { label: string; tone: "blue" | "green" | "red" | "slate" }> = {
  SUBMITTED: { label: "En revisión", tone: "blue" },
  APPROVED: { label: "Aprobado", tone: "green" },
  REJECTED: { label: "Rechazado", tone: "red" },
  PENDING: { label: "Pendiente", tone: "slate" },
};

function isImageName(name: string | null): boolean {
  const ext = name?.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png"].includes(ext);
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.CANDIDATE_MANAGE) && !can(ctx, PERMISSIONS.ENROLLMENT_MANAGE)) {
    redirect("/panel");
  }
  const canReview = can(ctx, PERMISSIONS.DOCUMENT_REVIEW);

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: {
          exam: { select: { name: true } },
          scheme: { select: { name: true } },
          documents: { include: { requiredDocument: { select: { name: true } } }, orderBy: { uploadedAt: "desc" } },
          payments: { orderBy: { createdAt: "desc" } },
          bookings: { where: { status: { not: "CANCELLED" } }, include: { session: { select: { startsAt: true, location: true, modality: true } } } },
          attempts: { orderBy: { attemptNumber: "desc" }, take: 1, select: { id: true, status: true, scorePercent: true, passed: true, submittedAt: true } },
        },
      },
      consents: { orderBy: { acceptedAt: "desc" }, take: 1 },
      user: { select: { id: true, lastLoginAt: true, lastLoginIp: true, status: true, email: true, additionalEmails: true } },
    },
  });
  if (!candidate || candidate.subscriberId !== subscriberId) notFound();

  const lastConsent = candidate.consents[0];

  // ─── Consolidación documentos + pagos por esquema ──────────────
  //
  // Problema: cada inscripción guarda sus propios `documents` y
  // `payments`. Cuando el candidato genera una segunda inscripción
  // del mismo esquema (ej. Caso Práctico tras el Teórico) la vista
  // mostraba "Sin documentos / Sin pagos" porque los archivos y el
  // pago se entregaron en la PRIMERA inscripción.
  //
  // Solución: agrupar por `schemeId` y exponer en cada inscripción
  // el set agregado de TODAS las inscripciones del mismo esquema.
  // Para documentos, deduplicamos por `requiredDocumentId` (cuando
  // existe) prefiriendo APROBADOS y, de no haberlos, el más reciente.
  // Cada doc lleva un flag `_originEnrollmentCode` para indicar de
  // qué folio viene cuando NO es el actual.

  type EnrollmentItem = typeof candidate.enrollments[number];
  type DocItem = EnrollmentItem["documents"][number] & {
    _originEnrollmentId: string;
    _originEnrollmentCode: string;
  };
  type PaymentItem = EnrollmentItem["payments"][number] & {
    _originEnrollmentId: string;
    _originEnrollmentCode: string;
  };

  const docsByScheme = new Map<string, DocItem[]>();
  const paymentsByScheme = new Map<string, PaymentItem[]>();
  for (const e of candidate.enrollments) {
    const key = e.schemeId ?? `__no_scheme__${e.id}`;
    const dArr = docsByScheme.get(key) ?? [];
    for (const d of e.documents) {
      dArr.push({ ...d, _originEnrollmentId: e.id, _originEnrollmentCode: e.code });
    }
    docsByScheme.set(key, dArr);
    const pArr = paymentsByScheme.get(key) ?? [];
    for (const p of e.payments) {
      pArr.push({ ...p, _originEnrollmentId: e.id, _originEnrollmentCode: e.code });
    }
    paymentsByScheme.set(key, pArr);
  }

  // Para cada esquema, deduplicar docs por requiredDocumentId:
  //  - si hay APROBADO: tomar el más reciente APROBADO
  //  - sino: el más reciente sin importar status
  // Los que no tienen requiredDocumentId quedan como están (libres).
  const docsForEnrollment = new Map<string, DocItem[]>();
  for (const e of candidate.enrollments) {
    const key = e.schemeId ?? `__no_scheme__${e.id}`;
    const pool = docsByScheme.get(key) ?? [];
    const byReq = new Map<string, DocItem[]>();
    const free: DocItem[] = [];
    for (const d of pool) {
      if (d.requiredDocumentId) {
        const arr = byReq.get(d.requiredDocumentId) ?? [];
        arr.push(d);
        byReq.set(d.requiredDocumentId, arr);
      } else free.push(d);
    }
    const dedupe: DocItem[] = [];
    for (const arr of byReq.values()) {
      const approved = arr.filter((x) => x.status === "APPROVED");
      const winner = (approved.length > 0 ? approved : arr).sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      )[0];
      if (winner) dedupe.push(winner);
    }
    dedupe.push(...free);
    // Orden final: aprobados primero, luego por fecha desc.
    dedupe.sort((a, b) => {
      if (a.status === "APPROVED" && b.status !== "APPROVED") return -1;
      if (b.status === "APPROVED" && a.status !== "APPROVED") return 1;
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
    docsForEnrollment.set(e.id, dedupe);
  }

  // Para pagos, mostramos TODOS los del esquema (sin dedupe) — un
  // pago de inscripción y un pago de retake pueden coexistir.
  const paymentsForEnrollment = new Map<string, PaymentItem[]>();
  for (const e of candidate.enrollments) {
    const key = e.schemeId ?? `__no_scheme__${e.id}`;
    const pool = paymentsByScheme.get(key) ?? [];
    const sorted = [...pool].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    paymentsForEnrollment.set(e.id, sorted);
  }

  // Logs de auditoría e ingresos para el candidato.
  const [recentLogs, loginCount] = candidate.user
    ? await Promise.all([
        prisma.auditLog.findMany({
          where: { actorId: candidate.user.id },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: { id: true, action: true, ip: true, userAgent: true, createdAt: true, entity: true },
        }),
        prisma.auditLog.count({ where: { actorId: candidate.user.id, action: "auth.login" } }),
      ])
    : [[], 0];

  return (
    <>
      <PageHeader
        title={`${candidate.firstName} ${candidate.lastName}`}
        subtitle={candidate.email}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/panel/candidatos/${candidate.id}/documentos`} className="rounded-lg border border-brand-300 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              📁 Carpeta de archivos
            </Link>
            <Link
              href={`/panel/candidatos/${candidate.id}/certificados`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gold-300 bg-gold-50 px-3 py-1.5 text-sm font-semibold text-gold-700 hover:bg-gold-100"
            >
              🎓 Certificados obtenidos
            </Link>
            <a href={`/panel/candidatos/${candidate.id}/cv`} className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-800">
              ⬇ Descargar Hoja de Vida (PDF)
            </a>
            <Link href="/panel/candidatos" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Volver
            </Link>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="font-semibold text-slate-900">Datos del candidato</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-400">Documento</dt><dd className="text-slate-700">{candidate.documentType ?? ""} {candidate.documentNumber ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Teléfono</dt><dd className="text-slate-700">{candidate.phone ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Ciudad</dt><dd className="text-slate-700">{candidate.city ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Registrado</dt><dd className="text-slate-700">{dateOnly(candidate.createdAt)}</dd></div>
          </dl>
          <div className="mt-4 border-t border-slate-100 pt-3 text-sm">
            <div className="text-slate-400">Autorización de datos</div>
            {lastConsent ? (
              <p className="mt-1 text-slate-700">
                <Badge tone="green">Aceptada</Badge>
                <span className="ml-2 text-xs text-slate-400">v{lastConsent.policyVersion} · {dateOnly(lastConsent.acceptedAt)}</span>
              </p>
            ) : (
              <p className="mt-1"><Badge tone="slate">Sin registro</Badge></p>
            )}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 text-sm">
            <div className="text-slate-400">Accesos a la plataforma</div>
            <dl className="mt-1 space-y-1 text-xs">
              <div className="flex justify-between"><dt className="text-slate-500">Estado cuenta</dt><dd className="text-slate-700">{candidate.user?.status ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Total logins</dt><dd className="font-semibold text-slate-800">{loginCount}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Último ingreso</dt><dd className="text-slate-700">{candidate.user?.lastLoginAt ? dateTime(candidate.user.lastLoginAt) : "Nunca"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">IP último ingreso</dt><dd className="font-mono text-slate-700">{candidate.user?.lastLoginIp ?? "—"}</dd></div>
            </dl>
          </div>

          {can(ctx, PERMISSIONS.CANDIDATE_MANAGE) ? (
            <>
              <CandidateEditForm
                candidateId={candidate.id}
                initial={{
                  firstName: candidate.firstName,
                  lastName: candidate.lastName,
                  email: candidate.email,
                  phone: candidate.phone,
                  documentType: candidate.documentType,
                  documentNumber: candidate.documentNumber,
                  country: candidate.country,
                  city: candidate.city,
                  address: candidate.address,
                }}
              />
              {candidate.user ? (
                <CandidateEmailsAdmin
                  candidateId={candidate.id}
                  primaryEmail={candidate.user.email}
                  alternateEmails={candidate.user.additionalEmails ?? []}
                />
              ) : null}
            </>
          ) : null}
        </Card>

        <div className="space-y-5 lg:col-span-2">
          {candidate.enrollments.length === 0 ? (
            <Card className="p-5"><EmptyState>Este candidato aún no tiene inscripciones.</EmptyState></Card>
          ) : (
            candidate.enrollments.map((e) => (
              <Card key={e.id} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                  <div>
                    <div className="font-semibold text-slate-900">{e.exam?.name ?? e.scheme?.name ?? "Inscripción"}</div>
                    <div className="text-xs text-slate-400">Folio {e.code}</div>
                  </div>
                  <Badge tone={e.status.endsWith("PENDING") || e.status === "SCHEDULING" ? "amber" : e.status === "CERTIFIED" || e.status === "APPROVED" ? "green" : "blue"}>
                    {ENROLL_STATUS_ES[e.status] ?? e.status}
                  </Badge>
                </div>
                <div className="space-y-4 p-5">
                  {/* Documentos (agregados del esquema — se reutilizan entre inscripciones) */}
                  <section>
                    <h3 className="text-sm font-medium text-slate-700">
                      Documentos
                      <span className="ml-2 text-[10px] font-normal text-slate-400">
                        (compartidos en el proceso del esquema)
                      </span>
                    </h3>
                    {(docsForEnrollment.get(e.id) ?? []).length === 0 ? (
                      <p className="mt-1 text-sm text-slate-400">Sin documentos entregados.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {(docsForEnrollment.get(e.id) ?? []).map((d) => {
                          const st = DOC_STATUS[d.status] ?? DOC_STATUS.PENDING;
                          return (
                            <li key={d.id} className="rounded-lg border border-slate-200 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                  {/* Miniatura tipo "tarjeta": imagen real para
                                      jpg/png, render del visor nativo para PDF,
                                      icono fallback para otros. Mismo
                                      comportamiento que /panel/candidatos/[id]/documentos. */}
                                  <a
                                    href={`/api/files/${d.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Abrir en pestaña nueva"
                                    className="group relative block h-20 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                                  >
                                    {isImageName(d.fileName) ? (
                                      /* eslint-disable-next-line @next/next/no-img-element */
                                      <img
                                        src={`/api/files/${d.id}`}
                                        alt={d.fileName ?? "documento"}
                                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                                      />
                                    ) : isPdfName(d.fileName) ? (
                                      <>
                                        <PdfThumb url={`/api/files/${d.id}`} alt={d.fileName ?? "documento"} />
                                        <span className="absolute right-1 top-1 rounded bg-white/95 px-1 text-[8px] font-bold uppercase tracking-wider text-rose-700 shadow-sm ring-1 ring-rose-200">
                                          PDF
                                        </span>
                                      </>
                                    ) : (
                                      <div className="grid h-full w-full place-items-center text-xl">📄</div>
                                    )}
                                  </a>
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-slate-800">{d.requiredDocument?.name ?? d.fileName ?? "Documento"}</div>
                                    <a href={`/api/files/${d.id}`} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-brand-700 hover:underline">{d.fileName ?? "Ver documento"}</a>
                                    {d._originEnrollmentId !== e.id ? (
                                      <div className="mt-1 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
                                        ⤴ Entregado en folio <span className="font-mono">{d._originEnrollmentCode}</span>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                                <Badge tone={st.tone}>{st.label}</Badge>
                              </div>
                              {d.reviewNotes ? <p className="mt-1 text-xs text-rose-600">Observación: {d.reviewNotes}</p> : null}
                              {canReview && d.status === "SUBMITTED" ? (
                                <DocumentReview
                                  documentId={d.id}
                                  fileUrl={`/api/files/${d.id}`}
                                  fileName={d.fileName}
                                />
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  {/* Pagos (agregados del esquema — el candidato puede pagar en
                       cualquier inscripción del mismo programa) */}
                  <section>
                    <h3 className="text-sm font-medium text-slate-700">
                      Pagos
                      <span className="ml-2 text-[10px] font-normal text-slate-400">
                        (compartidos en el proceso del esquema)
                      </span>
                    </h3>
                    {(paymentsForEnrollment.get(e.id) ?? []).length === 0 ? (
                      <p className="mt-1 text-sm text-slate-400">Sin pagos registrados.</p>
                    ) : (
                      <ul className="mt-2 space-y-1 text-sm">
                        {(paymentsForEnrollment.get(e.id) ?? []).map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-2">
                            <span className="min-w-0 text-slate-600">
                              {p.description ?? p.concept}
                              {p._originEnrollmentId !== e.id ? (
                                <span className="ml-2 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
                                  ⤴ Pagado en folio <span className="font-mono">{p._originEnrollmentCode}</span>
                                </span>
                              ) : null}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">{money(p.amount, p.currency)}</span>
                              <Badge tone={p.status === "APPROVED" ? "green" : p.status === "PENDING" ? "amber" : "slate"}>{p.status}</Badge>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {/* Evaluación */}
                  {e.attempts.length > 0 ? (
                    <section>
                      <h3 className="text-sm font-medium text-slate-700">Evaluación</h3>
                      {e.attempts.map((at) => {
                        const pct = at.scorePercent != null ? Number(at.scorePercent.toString()) : null;
                        const tone = at.passed === true ? "green" : at.passed === false ? "red" : "amber";
                        const label = at.status === "PASSED" ? "Aprobado" : at.status === "FAILED" ? "No aprobado" : at.status === "MANUAL_GRADING" ? "En calificación" : at.status === "PENDING_COMMITTEE" ? "En comité" : at.status;
                        return (
                          <div key={at.id} className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-slate-600">
                              {pct != null ? `Calificación ${pct}%` : "Examen presentado"}
                              {at.submittedAt ? <span className="ml-2 text-xs text-slate-400">{dateTime(at.submittedAt)}</span> : null}
                            </span>
                            <Badge tone={tone}>{label}</Badge>
                          </div>
                        );
                      })}
                    </section>
                  ) : null}

                  {/* Agenda */}
                  {e.bookings.length > 0 ? (
                    <section>
                      <h3 className="text-sm font-medium text-slate-700">Agenda</h3>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        {e.bookings.map((b) => (
                          <li key={b.id}>
                            {dateTime(b.session.startsAt)}
                            {b.session.location ? ` · ${b.session.location}` : ""}
                            {b.session.modality === "ONLINE" ? " · En línea" : " · Presencial"}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Trazabilidad (últimos 25 eventos)</h2>
        </div>
        <div className="p-5">
          {recentLogs.length === 0 ? (
            <p className="text-sm text-slate-400">Sin eventos registrados.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-xs">
              {recentLogs.map((l) => (
                <li key={l.id} className="grid grid-cols-[160px_140px_1fr_180px] gap-3 py-2">
                  <span className="text-slate-500">{dateTime(l.createdAt)}</span>
                  <span className="font-mono text-slate-700">{l.action}</span>
                  <span className="truncate text-slate-500" title={l.userAgent ?? ""}>{l.userAgent ?? ""}</span>
                  <span className="font-mono text-slate-700">{l.ip ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
