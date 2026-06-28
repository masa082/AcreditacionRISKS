import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ctx = await getCurrentUser();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const candidates = await prisma.candidate.findMany({
    where: {
      subscriberId: ctx.subscriberId,
      OR: [
        { firstName: { contains: "OMAR", mode: "insensitive" } },
        { firstName: { contains: "Wilgen", mode: "insensitive" } },
        { firstName: { contains: "Estefany", mode: "insensitive" } },
      ],
    },
    include: {
      enrollments: {
        include: {
          documents: { select: { status: true, fileName: true } },
          attempts: {
            orderBy: { createdAt: "desc" },
            select: {
              status: true,
              scorePercent: true,
              submittedAt: true,
            },
          },
        },
      },
    },
  });

  const results = candidates.map((c) => {
    const enrollmentAnalysis = c.enrollments.map((e) => {
      const docsApproved = e.documents?.filter((d) => d.status === "APPROVED").length ?? 0;
      const hasPracticalAttempt = e.attempts?.some(
        (a) => a.status === "FAILED" || (Number(a.scorePercent) === 0 && a.status === "SUBMITTED")
      );
      const isEligiblePractical = docsApproved > 0 && hasPracticalAttempt;

      const hasFailedTheoretical = e.attempts?.some((a) => a.status === "FAILED");
      const isEligibleTheoretical = docsApproved > 0 && hasFailedTheoretical;

      return {
        enrollmentId: e.id,
        docsApproved,
        documents: e.documents?.map((d) => ({ status: d.status, fileName: d.fileName })),
        attempts: e.attempts?.map((a) => ({
          status: a.status,
          scorePercent: Number(a.scorePercent),
        })),
        hasPracticalAttempt,
        isEligiblePractical,
        hasFailedTheoretical,
        isEligibleTheoretical,
      };
    });

    return {
      candidateName: `${c.firstName} ${c.lastName}`,
      candidateId: c.id,
      enrollmentCount: c.enrollments.length,
      enrollmentAnalysis,
      elegibleForPractical: enrollmentAnalysis
        .filter((e) => e.isEligiblePractical)
        .map((e) => e.enrollmentId),
      elegibleForTheoretical: enrollmentAnalysis
        .filter((e) => e.isEligibleTheoretical)
        .map((e) => e.enrollmentId),
    };
  });

  return Response.json(results, { headers: { "Content-Type": "application/json" } });
}
