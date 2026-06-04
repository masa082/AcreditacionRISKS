import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePlatformPage } from "@/lib/guards";
import { PageHeader, Card, Badge } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { FeedbackResponder } from "@/components/feedback-responder";

export const metadata = { title: "Ticket de feedback" };

const CATEGORY_LABEL: Record<string, { label: string; emoji: string }> = {
  SUGGESTION: { label: "Sugerencia", emoji: "💡" },
  IMPROVEMENT: { label: "Mejora", emoji: "🛠" },
  DEVELOPMENT: { label: "Desarrollo", emoji: "🚀" },
  BUG: { label: "Bug", emoji: "🐞" },
  PRAISE: { label: "Felicitación", emoji: "🎉" },
  OTHER: { label: "Otro", emoji: "💬" },
};
const STATUS_TONE: Record<string, "amber" | "blue" | "violet" | "green" | "slate"> = {
  OPEN: "amber", IN_REVIEW: "blue", IN_PROGRESS: "violet", RESOLVED: "green", CLOSED: "slate",
};

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformPage();
  const { id } = await params;
  const ticket = await prisma.feedbackTicket.findUnique({
    where: { id },
    include: {
      subscriber: { select: { tradeName: true, legalName: true } },
      user: { select: { firstName: true, lastName: true, email: true, type: true } },
    },
  });
  if (!ticket) notFound();
  const cat = CATEGORY_LABEL[ticket.category] ?? CATEGORY_LABEL.OTHER;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Ticket #${ticket.number}`}
        subtitle={`${cat.emoji} ${cat.label} · creado ${dateTime(ticket.createdAt)}`}
        actions={
          <Link href="/admin/feedback" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
            ← Volver a la bandeja
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-slate-900">{ticket.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span><strong className="text-slate-700">{ticket.authorName}</strong> · {ticket.authorEmail}</span>
              {ticket.authorRole ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{ticket.authorRole}</span> : null}
              {ticket.subscriber ? (
                <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                  {ticket.subscriber.tradeName ?? ticket.subscriber.legalName}
                </span>
              ) : (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">Visitante</span>
              )}
            </div>
            <article className="prose prose-sm mt-4 max-w-none whitespace-pre-wrap break-words text-slate-800">
              {ticket.message}
            </article>

            {ticket.attachments.length > 0 ? (
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Adjuntos ({ticket.attachments.length})</div>
                <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {ticket.attachments.map((k, i) => (
                    <li key={i}>
                      <a
                        href={`/api/feedback/${ticket.id}/attachment/${i}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-lg border border-slate-200 bg-white text-xs text-brand-700 shadow-sm hover:shadow-md"
                      >
                        {/\.(png|jpe?g)$/i.test(k) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/api/feedback/${ticket.id}/attachment/${i}`} alt={`Adjunto ${i + 1}`} className="h-32 w-full object-cover" />
                        ) : (
                          <div className="grid h-32 w-full place-items-center bg-slate-50 text-3xl">📄</div>
                        )}
                        <div className="truncate px-2 py-1.5 text-[10px] text-slate-700">{k.split("/").pop()}</div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {ticket.contextUrl ? (
              <div className="mt-4 text-[10px] text-slate-500">
                <strong>Página de origen:</strong>{" "}
                <code className="break-all rounded bg-slate-100 px-1 font-mono">{ticket.contextUrl}</code>
              </div>
            ) : null}
            {ticket.userAgent ? (
              <div className="mt-1 text-[10px] text-slate-500">
                <strong>Navegador:</strong> <span className="font-mono">{ticket.userAgent}</span>
              </div>
            ) : null}
          </Card>

          {ticket.response ? (
            <Card className="border-l-4 border-l-emerald-500 p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Respuesta del equipo · {ticket.respondedAt ? dateTime(ticket.respondedAt) : ""}
              </div>
              <article className="prose prose-sm mt-2 max-w-none whitespace-pre-wrap break-words text-slate-800">
                {ticket.response}
              </article>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado actual</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[ticket.status] ?? "slate"}>{ticket.status}</Badge>
              <Badge tone={ticket.priority === "URGENT" || ticket.priority === "HIGH" ? "amber" : "slate"}>{ticket.priority}</Badge>
            </div>
            {ticket.internalNotes ? (
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
                <strong>Nota interna:</strong>
                <p className="mt-1 whitespace-pre-wrap">{ticket.internalNotes}</p>
              </div>
            ) : null}
          </Card>

          <Card className="p-4">
            <FeedbackResponder
              ticketId={ticket.id}
              currentStatus={ticket.status}
              currentPriority={ticket.priority}
              currentNotes={ticket.internalNotes}
              alreadyResponded={!!ticket.response}
            />
          </Card>
        </aside>
      </div>
    </div>
  );
}
