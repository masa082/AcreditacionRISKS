import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { SessionForm } from "@/components/session-form";
import { cancelSession } from "@/lib/actions/agenda";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Agenda de pruebas" };

export default async function AgendaPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.SCHEDULE_MANAGE)) redirect("/panel");

  const [exams, sessions] = await Promise.all([
    prisma.exam.findMany({
      where: { subscriberId, status: "PUBLISHED" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, requireSchedule: true },
    }),
    prisma.examSession.findMany({
      where: { subscriberId, isActive: true },
      orderBy: { startsAt: "asc" },
      include: {
        exam: { select: { name: true } },
        _count: { select: { bookings: { where: { status: { notIn: ["CANCELLED", "NO_SHOW"] } } } } },
      },
    }),
  ]);

  const now = new Date();

  return (
    <>
      <PageHeader
        title="Agenda de pruebas"
        subtitle="Publique sesiones/horarios para que los candidatos reserven su presentación."
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
          <h2 className="mb-4 font-semibold text-slate-900">Sesiones programadas</h2>
          {sessions.length === 0 ? (
            <EmptyState>No hay sesiones activas. Cree la primera con el formulario.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {sessions.map((s) => {
                const past = s.startsAt < now;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800">{s.exam.name}</div>
                      <div className="text-xs text-slate-400">
                        {dateTime(s.startsAt)} · {s.modality === "ONLINE" ? "En línea" : "Presencial"}
                        {s.location ? ` · ${s.location}` : ""}
                        {s.capacity > 0 ? ` · ${s._count.bookings}/${s.capacity} cupos` : ` · ${s._count.bookings} inscritos`}
                      </div>
                      {past ? <Badge tone="slate">Finalizada</Badge> : <Badge tone="green">Programada</Badge>}
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
        </Card>
      </div>
    </>
  );
}
