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
                  {/* Documentos */}
                  <section>
                    <h3 className="text-sm font-medium text-slate-700">Documentos</h3>
                    {e.documents.length === 0 ? (
                      <p className="mt-1 text-sm text-slate-400">Sin documentos entregados.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {e.documents.map((d) => {
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

                  {/* Pagos */}
                  <section>
                    <h3 className="text-sm font-medium text-slate-700">Pagos</h3>
                    {e.payments.length === 0 ? (
                      <p className="mt-1 text-sm text-slate-400">Sin pagos registrados.</p>
                    ) : (
                      <ul className="mt-2 space-y-1 text-sm">
                        {e.payments.map((p) => (
                          <li key={p.id} className="flex items-center justify-between">
                            <span className="text-slate-600">{p.description ?? p.concept}</span>
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
