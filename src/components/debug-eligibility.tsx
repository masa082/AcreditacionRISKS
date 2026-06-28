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

interface DocumentInfo {
  fileName?: string;
  status: string;
}

export function DebugEligibility({
  data,
}: {
  data: EligibilityData[];
}) {
  useEffect(() => {
    if (data && data.length > 0) {
      console.log(
        "%c📊 ELIGIBILITY DEBUG - DATOS REALES DEL SERVIDOR",
        "color: #2563eb; font-weight: bold; font-size: 14px; background: #eff6ff; padding: 8px;"
      );

      data.forEach((item) => {
        const statusColor = item.isEligible ? "#10b981" : "#ef4444";
        const statusSymbol = item.isEligible ? "✅" : "❌";

        console.group(
          `%c${statusSymbol} ${item.candidateName} › ${item.examType}`,
          `color: ${statusColor}; font-weight: bold; font-size: 12px`
        );

        console.log(
          `%cDocumentos: ${item.docsApproved}/${item.totalDocs} aprobados`,
          "color: #6b7280"
        );

        console.log(
          "%cIntentos cargados:",
          "color: #6b7280; font-weight: bold"
        );
        item.attempts.forEach((att, idx) => {
          console.log(
            `  [${idx}] status=${att.status}, score=${att.scorePercent}%, passed=${att.passed}`
          );
        });

        console.log(
          `%c${statusSymbol} ${item.isEligible ? "ELEGIBLE" : "NO ELEGIBLE"}`,
          `color: ${statusColor}; font-weight: bold`
        );
        console.log(`%cRazón: ${item.reason}`, "color: #6b7280; font-style: italic");
        console.log(`%cEnrollmentId: ${item.enrollmentId}`, "color: #9ca3af; font-size: 11px");

        console.groupEnd();
      });

      console.log(
        "%c✓ FIN DE DEBUG - TOTAL: " + data.length + " registros",
        "color: #2563eb; font-weight: bold; font-size: 12px; background: #eff6ff; padding: 8px;"
      );
    }
  }, [data]);

  return null;
}
