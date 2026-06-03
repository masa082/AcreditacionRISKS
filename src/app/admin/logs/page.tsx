import { requirePlatformPage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Logs globales" };

const ACTOR_TONE: Record<string, "blue" | "violet" | "green" | "slate"> = {
  PLATFORM: "violet",
  SUBSCRIBER: "blue",
  CANDIDATE: "green",
};

const ACTOR_LABEL: Record<string, string> = {
  PLATFORM: "Plataforma",
  SUBSCRIBER: "Suscriptor",
  CANDIDATE: "Candidato",
};

export default async function GlobalLogsPage() {
  await requirePlatformPage();

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Logs globales"
        subtitle="Trazabilidad de todas las acciones registradas en la plataforma."
      />

      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Eventos recientes ({logs.length})
          </h2>
        </div>
        <div className="p-5">
          {logs.length === 0 ? (
            <EmptyState>No hay eventos de auditoría registrados.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-4 font-medium">Fecha</th>
                    <th className="py-2 pr-4 font-medium">Suscriptor</th>
                    <th className="py-2 pr-4 font-medium">Acción</th>
                    <th className="py-2 pr-4 font-medium">Entidad</th>
                    <th className="py-2 pr-4 font-medium">Actor</th>
                    <th className="py-2 font-medium">Tipo de actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-3 pr-4 whitespace-nowrap text-slate-500">
                        {dateTime(log.createdAt)}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600">
                        {log.subscriberId ?? (
                          <span className="text-slate-400">plataforma</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-700">
                        {log.action}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{log.entity}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-500">
                        {log.actorId ?? "sistema"}
                      </td>
                      <td className="py-3">
                        {log.actorType ? (
                          <Badge tone={ACTOR_TONE[log.actorType] ?? "slate"}>
                            {ACTOR_LABEL[log.actorType] ?? log.actorType}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">sistema</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
