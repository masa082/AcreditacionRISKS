import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setReferralCookie } from "@/lib/actions/referral-cookie";

export const dynamic = "force-dynamic";

/// Link compartible de referido: /r/CODIGO. Verifica el código, setea la
/// cookie y redirige al visitante a la home/registro. Si el código no es
/// válido, redirige limpiamente a la home.
export default async function RefLanding({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = code.trim().toUpperCase().slice(0, 12);

  const referrer = await prisma.referrer.findFirst({
    where: { code: clean, status: "ACTIVE" },
    select: { id: true },
  });
  if (referrer) {
    await setReferralCookie(clean);
  }
  redirect(`/?ref=${clean}`);
}
