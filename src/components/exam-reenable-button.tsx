"use client";

import { useState } from "react";
import { ExamReenableDialog } from "@/components/exam-reenable-dialog";

export function ExamReenableButton({
  examId,
  examName,
  disabledAt,
}: {
  examId: string;
  examName: string;
  disabledAt: Date | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!disabledAt) return null;

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        title="Habilitar de nuevo este examen"
      >
        🔄 Habilitar de nuevo
      </button>
      <ExamReenableDialog
        examId={examId}
        examName={examName}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
