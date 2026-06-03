import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { OrganizationForm } from "@/components/organization-form";

export const metadata = { title: "Organización" };

export default async function OrganizationPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.ORG_MANAGE)) redirect("/panel");

  const s = await prisma.subscriber.findUnique({ where: { id: subscriberId } });
  if (!s) return null;

  return (
    <>
      <PageHeader title="Organización" subtitle="Marca, datos legales y firma autorizada que aparecen en sus certificados." />
      <Card className="max-w-3xl p-6">
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
    </>
  );
}
