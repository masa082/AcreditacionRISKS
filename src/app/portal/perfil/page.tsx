import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { AlternateEmailsForm } from "@/components/alternate-emails-form";

export const metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const { ctx, candidateId } = await requireCandidatePage();
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) return null;

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true, additionalEmails: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Mi perfil" subtitle="Mantenga actualizada su información de contacto." />
      <Card className="max-w-3xl p-6">
        <ProfileForm
          initial={{
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: ctx.email,
            documentType: candidate.documentType,
            documentNumber: candidate.documentNumber,
            phone: candidate.phone,
            birthDate: candidate.birthDate ? candidate.birthDate.toISOString().slice(0, 10) : null,
            country: candidate.country,
            city: candidate.city,
            address: candidate.address,
          }}
        />
      </Card>
      <div className="max-w-3xl">
        <AlternateEmailsForm
          primaryEmail={user?.email ?? ctx.email}
          alternateEmails={user?.additionalEmails ?? []}
        />
      </div>
    </div>
  );
}
