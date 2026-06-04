import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { OrganizationForm } from "@/components/organization-form";
import { MarketingConfigForm } from "@/components/marketing-config-form";
import { RapydConfigForm } from "@/components/rapyd-config-form";
import { ThemeConfigForm } from "@/components/theme-config-form";
import { getMarketingConfig } from "@/lib/marketing-config";

export const metadata = { title: "Organización" };

export default async function OrganizationPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.ORG_MANAGE)) redirect("/panel");

  const s = await prisma.subscriber.findUnique({ where: { id: subscriberId } });
  if (!s) return null;
  const m = await getMarketingConfig();

  return (
    <>
      <PageHeader title="Organización" subtitle="Marca, datos legales, firma autorizada y configuración comercial de la landing pública." />
      <div className="space-y-8">
        <Card className="max-w-3xl p-6">
          <h2 className="mb-4 text-base font-bold text-slate-900">Identidad y marca</h2>
          <OrganizationForm
            initial={{
              legalName: s.legalName,
              tradeName: s.tradeName,
              taxId: s.taxId,
              legalRepName: s.legalRepName,
              authorizedSigner: s.authorizedSigner,
              signatureImageUrl: s.signatureImageUrl,
              logoUrl: s.logoUrl,
              primaryColor: s.primaryColor,
              secondaryColor: s.secondaryColor,
              contactEmail: s.contactEmail,
              contactPhone: s.contactPhone,
              address: s.address,
            }}
          />
        </Card>

        <div className="max-w-3xl">
          <RapydConfigForm
            variant="self"
            initial={{
              rapydEnabled: s.rapydEnabled,
              rapydEnv: s.rapydEnv,
              rapydAccessKey: s.rapydAccessKey,
              rapydSecretKey: s.rapydSecretKey,
              rapydMerchantNote: s.rapydMerchantNote,
            }}
          />
        </div>

        <div className="max-w-5xl">
          <ThemeConfigForm
            initial={(s.themeConfig ?? {}) as Record<string, string>}
          />
        </div>

        <Card className="max-w-3xl p-6">
          <h2 className="mb-4 text-base font-bold text-slate-900">Marketing y conversión</h2>
          <p className="mb-4 text-sm text-slate-500">
            Estos datos aparecen en la landing pública (home, contacto, hero) y en el flujo de pago del candidato. Los cambios se reflejan en segundos sin redesplegar.
          </p>
          <MarketingConfigForm
            initial={{
              slogan: m.slogan,
              whatsappNumber: m.whatsapp.number,
              whatsappMessage: m.whatsapp.message,
              socialProof: m.socialProof,
              urgency: m.urgency,
              guarantees: m.guarantees,
              bankingInfo: m.bankingInfo,
            }}
          />
        </Card>
      </div>
    </>
  );
}
