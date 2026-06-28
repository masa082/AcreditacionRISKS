"use client";

import { useEffect } from "react";

interface EligibilityData {
  candidateName: string;
  enrollmentId: string;
  examType: "PRACTICAL" | "THEORETICAL";
  docsApproved: number;
  totalDocs: number;
  attempts: Array<{
    status: string;
    scorePercent: number | null;
    passed: boolean | null;
  }>;
  isEligible: boolean;
  reason: string;
}

export function DebugEligibility({
  data,
}: {
  data: EligibilityData[];
}) {
  useEffect(() => {
    if (data && data.length > 0) {
      console.log(
        "%c========== ELIGIBILITY DEBUG ==========",
        "color: blue; font-weight: bold; font-size: 14px"
      );
      data.forEach((item) => {
        console.group(
          `%c${item.candidateName} - ${item.examType}`,
          `color: ${item.isEligible ? "green" : "red"}; font-weight: bold`
        );
        console.log("Documentos:", {
          aprobados: item.docsApproved,
          total: item.totalDocs,
        });
        console.log("Intentos:", item.attempts);
        console.log(
          `%c${item.isEligible ? "✅ ELEGIBLE" : "❌ NO ELEGIBLE"}`,
          `color: ${item.isEligible ? "green" : "red"}; font-weight: bold`
        );
        console.log("Razón:", item.reason);
        console.groupEnd();
      });
      console.log(
        "%c=====================================",
        "color: blue; font-weight: bold; font-size: 14px"
      );
    }
  }, [data]);

  return null;
}
