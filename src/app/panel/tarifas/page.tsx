import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { FeeEditForm } from "@/components/fee-edit-form";
import { money } from "@/lib/format";

export const metadata = { title: "Tarifas del programa" };

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

export default async function SubscriberFeesPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.PAYMENT_MANAGE)) redirect("/panel");

  const fees = await prisma.feeConfig.findMany({
    where: { subscriberId },
    orderBy: [{ schemeId: "asc" }, { concept: "asc" }],
    include: { scheme: { select: { name: true } } },
  });

  // Agrupar por esquema
  const byScheme = new Map<string, { schemeName: string; fees: typeof fees }>();
  for (const f of fees) {
    const key = f.schemeId ?? "_global";
    const name = f.scheme?.name ?? "(Tarifa global de la organización)";
    let g = byScheme.get(key);
    if (!g) { g = { schemeName: name, fees: [] }; byScheme.set(key, g); }
    g.fees.push(f);
  }

  return (
    <>
      <PageHeader
        title="Tarifas del programa"
        subtitle="Edite los precios que se cobran a los candidatos por inscripción, examen, recertificación y duplicados. Los montos son subtotales (no incluyen IVA)."
      />
      {byScheme.size === 0 ? (
        <EmptyState>
          Aún no hay tarifas configuradas. Contacte al administrador de la plataforma para que cree las tarifas iniciales.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {Array.from(byScheme.values()).map((g) => (
            <Card key={g.schemeName}>
              <div className="border-b border-slate-200 px-5 py-3">
                <h2 className="text-base font-semibold text-slate-900">{g.schemeName}</h2>
                <p className="text-xs text-slate-500">{g.fees.length} tarifa(s) configuradas</p>
              </div>
              <ul className="divide-y divide-slate-100 p-2">
                {g.fees.map((f) => (
                  <li key={f.id} className="p-3">
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
                      scope="subscriber"
                    />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-slate-400">
        Para crear nuevas tarifas (otro concepto o programa nuevo) contacte al administrador de la plataforma.
      </p>
    </>
  );
}
