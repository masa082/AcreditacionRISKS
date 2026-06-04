import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePlatformPage } from "@/lib/guards";
import { PageHeader, Card, Badge } from "@/components/ui";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Feedback de usuarios" };

const CATEGORY_LABEL: Record<string, { label: string; emoji: string; cls: string }> = {
  SUGGESTION:  { label: "Sugerencia",        emoji: "💡", cls: "bg-cyan-50 text-cyan-700 ring-cyan-200" },
  IMPROVEMENT: { label: "Mejora",            emoji: "🛠", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  DEVELOPMENT: { label: "Desarrollo",        emoji: "🚀", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  BUG:         { label: "Bug",               emoji: "🐞", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  PRAISE:      { label: "Felicitación",      emoji: "🎉", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  OTHER:       { label: "Otro",              emoji: "💬", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};

const STATUS_TONE: Record<string, "amber" | "blue" | "violet" | "green" | "slate"> = {
  OPEN: "amber", IN_REVIEW: "blue", IN_PROGRESS: "violet", RESOLVED: "green", CLOSED: "slate",
};
const STATUS_LABEL: Record<string, string> = {
  OPEN: "Abierto", IN_REVIEW: "En revisión", IN_PROGRESS: "En atención", RESOLVED: "Resuelto", CLOSED: "Cerrado",
};

const PRIORITY_TONE: Record<string, "slate" | "amber" | "red"> = {
  LOW: "slate", NORMAL: "slate", HIGH: "amber", URGENT: "red",
};

export default async function FeedbackListPage() {
  await requirePlatformPage();
  const [counts, tickets] = await Promise.all([
    prisma.feedbackTicket.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.feedbackTicket.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        subscriber: { select: { tradeName: true, legalName: true } },
      },
    }),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Feedback de usuarios"
        subtitle="Sugerencias, mejoras, ideas, reportes de error y felicitaciones enviadas por los usuarios. Cada envío es un ticket independiente."
      />

      <div className="grid gap-3 sm:grid-cols-5">
        <Tile label="Abiertos" value={byStatus.OPEN ?? 0} tone="warn" />
        <Tile label="En revisión" value={byStatus.IN_REVIEW ?? 0} tone="info" />
        <Tile label="En atención" value={byStatus.IN_PROGRESS ?? 0} tone="violet" />
        <Tile label="Resueltos" value={byStatus.RESOLVED ?? 0} tone="good" />
        <Tile label="Cerrados" value={byStatus.CLOSED ?? 0} tone="default" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2">Título</th>
                <th className="px-4 py-2">Autor</th>
                <th className="px-4 py-2">Origen</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Prioridad</th>
                <th className="px-4 py-2">Recibido</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-500">
                    Aún no hay feedback recibido. El botón flotante 💬 ya está activo en toda la plataforma.
                  </td>
                </tr>
              ) : tickets.map((t) => {
                const cat = CATEGORY_LABEL[t.category] ?? CATEGORY_LABEL.OTHER;
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">#{t.number}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${cat.cls}`}>
                        <span aria-hidden>{cat.emoji}</span> {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/feedback/${t.id}`} className="font-medium text-slate-800 hover:text-brand-800 hover:underline">
                        {t.title}
                      </Link>
                      {t.attachments.length > 0 ? (
                        <span className="ml-2 text-[10px] text-slate-500" title={`${t.attachments.length} adjunto(s)`}>
                          📎 {t.attachments.length}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div className="font-medium">{t.authorName}</div>
                      <div className="text-[10px] text-slate-500">{t.authorEmail}</div>
                      {t.authorRole ? <div className="text-[9px] text-slate-400">{t.authorRole}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {t.subscriber ? (t.subscriber.tradeName ?? t.subscriber.legalName) : <span className="italic text-slate-400">Público</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status] ?? t.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={PRIORITY_TONE[t.priority] ?? "slate"}>{t.priority}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{dateTime(t.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/feedback/${t.id}`}
                        className="rounded-md border border-brand-300 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                      >
                        Atender
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: "default" | "warn" | "good" | "info" | "violet" }) {
  const cls: Record<typeof tone, string> = {
    default: "border-slate-200 bg-white text-slate-900",
    warn: "border-amber-200 bg-amber-50/40 text-amber-900",
    good: "border-emerald-200 bg-emerald-50/40 text-emerald-900",
    info: "border-cyan-200 bg-cyan-50/40 text-cyan-900",
    violet: "border-violet-200 bg-violet-50/40 text-violet-900",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${cls[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
