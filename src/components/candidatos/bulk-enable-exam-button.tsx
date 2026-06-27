"use client";

import { useState } from "react";
import { bulkEnableExam } from "@/lib/actions/exams-bulk";
import type { ActionResult } from "@/lib/actions/schemes";

interface BulkEnableExamButtonProps {
  selectedEnrollmentIds: string[];
  examType: "PRACTICAL" | "THEORETICAL";
  disabled?: boolean;
}

export function BulkEnableExamButton({
  selectedEnrollmentIds,
  examType,
  disabled = false,
}: BulkEnableExamButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  const handleEnable = async () => {
    if (!selectedEnrollmentIds.length) return;

    setLoading(true);
    try {
      const response = await bulkEnableExam({
        enrollmentIds: selectedEnrollmentIds,
        examType,
        sendNotification: true,
      });
      setResult(response as ActionResult);

      if (response.ok) {
        setTimeout(() => setResult(null), 4000);
      }
    } catch (error) {
      setResult({ ok: false, error: "Error al habilitar examen" });
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = disabled || !selectedEnrollmentIds.length || loading;
  const label =
    examType === "PRACTICAL" ? "Habilitar Caso Práctico" : "Habilitar Examen Teórico";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleEnable}
        disabled={isDisabled}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
          isDisabled
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700"
        }`}
      >
        {loading ? "🔄 Procesando..." : `🔓 ${label}`}
      </button>

      {result && (
        <span
          className={`text-xs font-medium ${
            result.ok ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {result.ok ? "✓ Completado" : `✗ ${result.error || "Error al procesar"}`}
        </span>
      )}
    </div>
  );
}
