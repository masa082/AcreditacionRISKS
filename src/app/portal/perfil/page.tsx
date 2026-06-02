import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";

export const metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const { ctx, candidateId } = await requireCandidatePage();
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) return null;

  return (
    <>
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
    </>
  );
}
