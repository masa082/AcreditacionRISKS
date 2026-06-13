import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader, Badge, EmptyState, Card } from "@/components/ui";

export const metadata = { title: "Banco de preguntas" };
// Forzamos render dinámico — evita que Next intente cachear el listado
// (los bancos pueden cambiar con cualquier import / aprobación) y elimina
// una fuente común de errores 500 cuando la cache queda con un schema
// distinto al de la BD actual.
export const dynamic = "force-dynamic";

export default async function BanksPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();

  // Permission check explícito: si el rol del usuario no incluye al
  // menos VER preguntas, redirigir en vez de crashear. (Antes faltaba
  // este check y la página corría aunque el rol no tuviera el permiso.)
  if (!can(ctx, PERMISSIONS.QUESTION_VIEW) && !can(ctx, PERMISSIONS.QUESTION_CREATE)) {
    redirect("/panel");
  }
  const create = can(ctx, PERMISSIONS.QUESTION_CREATE);

  // Aislamos las queries en try/catch para que un error de BD no tumbe
  // la página entera con "Algo salió mal" — mostramos una tarjeta de
  // error legible y un botón de reintento.
  let banks: Array<{
    id: string;
    code: string;
    name: string;
    version: string;
    isActive: boolean;
    scheme: { name: string } | null;
    _count: { questions: number };
  }> = [];
  let approvedMap = new Map<string, number>();
  let loadError: string | null = null;

  try {
    banks = await prisma.questionBank.findMany({
      where: { subscriberId },
      orderBy: { createdAt: "desc" },
      include: {
        scheme: { select: { name: true } },
        _count: { select: { questions: true } },
      },
    });
    // groupBy de preguntas APROBADAS por banco — el bankId del Question
    // model es String (no nullable), así que el resultado siempre tiene
    // un bankId definido. Aún así filtramos por seguridad para no
    // confiarnos del tipo cuando llegue data inesperada.
    const approved = await prisma.question.groupBy({
      by: ["bankId"],
      where: { subscriberId, status: "APPROVED" },
      _count: { _all: true },
    });
    approvedMap = new Map(
      approved
        .filter((a): a is typeof a & { bankId: string } => typeof a.bankId === "string" && !!a.bankId)
        .map((a) => [a.bankId, a._count._all]),
    );
  } catch (e) {
    loadError = e instanceof Error ? e.message : "No se pudo cargar la lista de bancos.";
  }

  return (
    <>
      <PageHeader
        title="Banco de preguntas"
        subtitle="Organice preguntas por banco, esquema y versión."
        actions={
          <div className="flex gap-2">
            <Link href="/panel/preguntas/clasificacion" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Competencias y temas
            </Link>
            {create ? (
              <Link href="/panel/preguntas/nuevo" className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-semibold text-white">
                + Nuevo banco
              </Link>
            ) : null}
          </div>
        }
      />

      {loadError ? (
        <Card className="p-6 text-sm">
          <p className="font-semibold text-rose-700">No se pudo cargar la lista de bancos.</p>
          <p className="mt-1 text-xs text-rose-600">
            Detalle técnico: <code className="rounded bg-rose-50 px-1 py-0.5 font-mono text-[11px]">{loadError}</code>
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Si el problema persiste, contacte al soporte indicando este mensaje.
          </p>
        </Card>
      ) : banks.length === 0 ? (
        <EmptyState>Aún no hay bancos de preguntas. Cree el primero para empezar a redactar preguntas.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((b) => (
            <Link key={b.id} href={`/panel/preguntas/${b.id}`} className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow">
              <div className="flex items-start justify-between">
                <div className="font-semibold text-slate-800">{b.name}</div>
                <Badge tone={b.isActive ? "green" : "slate"}>{b.version}</Badge>
              </div>
              <div className="mt-1 font-mono text-xs text-slate-400">{b.code}</div>
              <div className="mt-3 text-sm text-slate-500">{b.scheme?.name ?? "Sin esquema"}</div>
              <div className="mt-4 flex gap-4 text-sm">
                <span className="text-slate-700"><b>{b._count.questions}</b> preguntas</span>
                <span className="text-emerald-600"><b>{approvedMap.get(b.id) ?? 0}</b> aprobadas</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
