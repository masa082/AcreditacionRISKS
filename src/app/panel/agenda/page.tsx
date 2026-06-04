import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { SessionForm } from "@/components/session-form";
import { AgendaCalendar, type SessionLite } from "@/components/agenda-calendar";
import { cancelSession } from "@/lib/actions/agenda";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Agenda de pruebas" };

function shortenExam(name: string): string {
  // Recorta el nombre del examen para que quepa en una celda del calendario.
  // Conserva el tipo (Teórico/Caso) y el esquema (SARLAFT/SAGRILAFT).
  const teor = /Te[oó]rico/i.test(name) ? "Teórico" : null;
  const caso = /Caso/i.test(name) ? "Caso" : null;
  const schema = /SARLAFT/i.test(name) ? "SARLAFT" : /SAGRILAFT/i.test(name) ? "SAGRILAFT" : null;
  return [teor ?? caso, schema].filter(Boolean).join(" · ") || name.slice(0, 18);
}

export default async function AgendaPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.SCHEDULE_MANAGE)) redirect("/panel");

  const [exams, sessionsDb] = await Promise.all([
    prisma.exam.findMany({
      where: { subscriberId, status: "PUBLISHED" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, requireSchedule: true },
    }),
    prisma.examSession.findMany({
      where: { subscriberId, isActive: true },
      orderBy: { startsAt: "asc" },
      include: {
        exam: { select: { name: true, durationMin: true } },
        bookings: {
          orderBy: { createdAt: "asc" },
          include: {
            enrollment: {
              select: {
                code: true,
                candidate: { select: { firstName: true, lastName: true, email: true, documentType: true, documentNumber: true } },
              },
            },
          },
        },
        _count: { select: { bookings: { where: { status: { notIn: ["CANCELLED", "NO_SHOW"] } } } } },
      },
    }),
  ]);

  // Adapta al shape del cliente
  const sessions: SessionLite[] = sessionsDb.map((s) => ({
    id: s.id,
    examName: s.exam.name,
    examShort: shortenExam(s.exam.name),
    title: s.title,
    startsAtISO: s.startsAt.toISOString(),
    durationMin: s.durationMin ?? s.exam.durationMin ?? null,
    modality: s.modality,
    location: s.location,
    meetingLink: s.meetingLink,
    capacity: s.capacity,
    bookings: s.bookings.map((b) => {
      const c = b.enrollment?.candidate;
      const fullName = c ? `${c.firstName} ${c.lastName}` : "Candidato";
      const docLabel = c?.documentNumber ? `${c.documentType ?? ""} ${c.documentNumber}`.trim() : "";
      return {
        id: b.id,
        candidateName: fullName,
        candidateEmail: c?.email ?? "",
        documentLabel: docLabel,
        enrollmentCode: b.enrollment?.code ?? null,
        status: b.status,
      };
    }),
  }));

  const now = new Date();
  const upcoming = sessions.filter((s) => new Date(s.startsAtISO) >= now).slice(0, 6);

  return (
    <>
      <PageHeader
        title="Agenda de pruebas"
        subtitle="Vista de calendario con sesiones programadas y candidatos agendados. Las horas se muestran en su zona local; UTC visible en cada sesión."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="mb-4 font-semibold text-slate-900">Nueva sesión</h2>
          {exams.length === 0 ? (
            <EmptyState>Publique una evaluación antes de crear sesiones.</EmptyState>
          ) : (
            <SessionForm exams={exams.map((e) => ({ id: e.id, name: e.name }))} />
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-900">Calendario</h2>
          <AgendaCalendar sessions={sessions} />
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Próximas sesiones</h2>
          <span className="text-xs text-slate-500">{sessions.length} sesión(es) activas en total</span>
        </div>
        <div className="p-5">
          {upcoming.length === 0 ? (
            <EmptyState>No hay sesiones próximas. Cree una nueva con el formulario.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((s) => {
                const filled = s.bookings.filter((b) => b.status !== "CANCELLED" && b.status !== "NO_SHOW").length;
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800">{s.title || s.examName}</div>
                      <div className="text-xs text-slate-400">
                        {dateTime(new Date(s.startsAtISO))} · {s.modality === "ONLINE" ? "En línea" : "Presencial"}
                        {s.location ? ` · ${s.location}` : ""}
                        {s.capacity > 0 ? ` · ${filled}/${s.capacity} cupos` : ` · ${filled} inscritos`}
                      </div>
                      <Badge tone="green">Programada</Badge>
                    </div>
                    <form action={cancelSession.bind(null, s.id)}>
                      <button type="submit" className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50">
                        Cancelar
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}

