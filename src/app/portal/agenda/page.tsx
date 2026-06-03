import Link from "next/link";
import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Mi agenda" };

const BOOKING_STATUS: Record<string, { label: string; tone: "green" | "amber" | "blue" | "slate" | "red" }> = {
  BOOKED: { label: "Reservada", tone: "blue" },
  CONFIRMED: { label: "Confirmada", tone: "green" },
  ATTENDED: { label: "Asistió", tone: "green" },
  NO_SHOW: { label: "No asistió", tone: "red" },
  CANCELLED: { label: "Cancelada", tone: "slate" },
  RESCHEDULED: { label: "Reagendada", tone: "amber" },
};

export default async function CandidateAgendaPage() {
  const { candidateId } = await requireCandidatePage();

  const bookings = await prisma.scheduleBooking.findMany({
    where: { enrollment: { candidateId }, status: { not: "CANCELLED" } },
    orderBy: { session: { startsAt: "asc" } },
    include: {
      session: { include: { exam: { select: { name: true } } } },
      enrollment: { select: { id: true, code: true } },
    },
  });

  return (
    <>
      <PageHeader title="Mi agenda" subtitle="Sus sesiones de evaluación reservadas." />
      <Card>
        <div className="p-5">
          {bookings.length === 0 ? (
            <EmptyState>
              No tiene sesiones reservadas. El agendamiento se realiza dentro de
              cada inscripción que lo requiera.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {bookings.map((b) => {
                const st = BOOKING_STATUS[b.status] ?? { label: b.status, tone: "slate" as const };
                return (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <Link href={`/portal/inscripcion/${b.enrollment.id}`} className="font-medium text-slate-800 hover:text-brand-800 hover:underline">
                        {b.session.exam.name}
                      </Link>
                      <div className="text-xs text-slate-400">
                        {dateTime(b.session.startsAt)}
                        {b.session.location ? ` · ${b.session.location}` : ""}
                        {b.session.modality === "ONLINE" ? " · En línea" : " · Presencial"}
                      </div>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
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
