import { redirect } from "next/navigation";
import { requirePlatformPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { FeeEditForm } from "@/components/fee-edit-form";
import { FeeCreateForm } from "@/components/fee-create-form";
import { money } from "@/lib/format";

export const dynamic = 'force-dynamic';

export const metadata = { title: "Tarifas y precios" };

const CONCEPT_LABEL: Record<string, string> = {
  ENROLLMENT: "Inscripción",
  EXAM: "Examen / Programa",
  CERTIFICATION: "Certificación",
  RECERTIFICATION: "Recertificación",
  RETAKE: "Reintento",
  DUPLICATE: "Duplicado",
  OTHER: "Otro",
};

const CONCEPT_TONE: Record<string, "blue" | "green" | "amber" | "slate"> = {
  EXAM: "blue",
  ENROLLMENT: "blue",
  CERTIFICATION: "green",
  RECERTIFICATION: "amber",
  RETAKE: "amber",
  DUPLICATE: "slate",
  OTHER: "slate",
};

export default async function PlatformFeesPage() {
  const ctx = await requirePlatformPage();
  if (!can(ctx, PERMISSIONS.PLATFORM_BILLING)) redirect("/admin");

  const [subscribers, fees] = await Promise.all([
    prisma.subscriber.findMany({
      orderBy: { legalName: "asc" },
      select: {
        id: true,
        slug: true,
        tradeName: true,
        legalName: true,
        status: true,
        schemes: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
    }),
    prisma.feeConfig.findMany({
      orderBy: [{ subscriberId: "asc" }, { schemeId: "asc" }, { concept: "asc" }],
      include: {
        scheme: { select: { name: true } },
        subscriber: { select: { tradeName: true, legalName: true, slug: true } },
      },
    }),
  ]);

  // Agrupar por suscriptor → esquema
  const groups = new Map<string, {
    subId: string;
    subName: string;
    subStatus: string;
    schemes: Map<string, { schemeName: string; fees: typeof fees }>;
  }>();
  for (const f of fees) {
    const subName = f.subscriber.tradeName ?? f.subscriber.legalName;
    let g = groups.get(f.subscriberId);
    if (!g) {
      g = { subId: f.subscriberId, subName, subStatus: "", schemes: new Map() };
      groups.set(f.subscriberId, g);
    }
    const schemeKey = f.schemeId ?? "_global";
    const schemeName = f.scheme?.name ?? "(Sin esquema · tarifa global del suscriptor)";
    let s = g.schemes.get(schemeKey);
    if (!s) {
      s = { schemeName, fees: [] };
      g.schemes.set(schemeKey, s);
    }
    s.fees.push(f);
  }

  return (
    <>
      <PageHeader
        title="Tarifas y precios"
        subtitle="Edite los montos cobrados por cada concepto (inscripción, examen, recertificación, duplicado, etc.) para todos los suscriptores."
      />

      <Card className="mb-6">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Crear nueva tarifa</h2>
          <p className="mt-1 text-xs text-slate-500">
            Asocie a un suscriptor, opcionalmente a un esquema y elija el concepto.
          </p>
        </div>
        <div className="p-5">
          <FeeCreateForm
            subscribers={subscribers.map((s) => ({
              id: s.id,
              name: s.tradeName ?? s.legalName,
              schemes: s.schemes,
            }))}
          />
        </div>
      </Card>

      {groups.size === 0 ? (
        <EmptyState>No hay tarifas configuradas todavía.</EmptyState>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.values()).map((g) => (
            <Card key={g.subId}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{g.subName}</h2>
                  <p className="text-xs text-slate-500">{g.schemes.size} esquema(s) con tarifa</p>
                </div>
              </div>
              <div className="space-y-4 p-5">
                {Array.from(g.schemes.values()).map((s) => (
                  <div key={s.schemeName} className="rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                    <h3 className="mb-3 text-sm font-bold text-slate-800">{s.schemeName}</h3>
                    <div className="hidden grid-cols-[1fr_140px_90px_120px_auto] gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:grid">
                      <span>Concepto · Etiqueta</span>
                      <span className="text-right">Monto (subtotal)</span>
                      <span className="text-center">Moneda</span>
                      <span className="text-center">Estado</span>
                      <span />
                    </div>
                    <ul className="mt-2 space-y-2">
                      {s.fees.map((f) => (
                        <li key={f.id} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={CONCEPT_TONE[f.concept] ?? "slate"}>{CONCEPT_LABEL[f.concept] ?? f.concept}</Badge>
                              <span className="text-xs text-slate-500">
                                Actual: <strong className="text-slate-800">{money(f.amount, f.currency)}</strong> + IVA
                              </span>
                              {!f.isActive ? <Badge tone="slate">Inactiva</Badge> : null}
                            </div>
                          </div>
                          <FeeEditForm
                            feeId={f.id}
                            currentAmount={f.amount.toString()}
                            currentCurrency={f.currency}
                            currentLabel={f.label}
                            isActive={f.isActive}
                            scope="platform"
                            allowDelete
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Los montos están en su moneda base (subtotal, sin IVA). El cobro al candidato incluye &ldquo;+ IVA&rdquo; conforme a la legislación aplicable.
      </p>
    </>
  );
}
