"use client";

import { useActionState } from "react";
import { Field, Input, Textarea, FormError, SubmitButton } from "@/components/form";
import { gradeManualAnswer } from "@/lib/actions/grading";
import type { ActionResult } from "@/lib/actions/schemes";

export function GradeAnswerForm({
  answerId,
  maxPoints,
  initialScore,
  initialComment,
  graded,
}: {
  answerId: string;
  maxPoints: number;
  initialScore: number | null;
  initialComment: string | null;
  graded: boolean;
}) {
  const action = gradeManualAnswer.bind(null, answerId);
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: false });

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
      <FormError error={state.error} />
      {state.ok ? <p className="text-xs text-emerald-700">Calificación guardada.</p> : null}
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <Field label={`Puntaje (máx ${maxPoints})`} htmlFor={`score-${answerId}`} required>
          <Input id={`score-${answerId}`} name="score" type="number" min={0} max={maxPoints} step="0.5" required defaultValue={initialScore ?? ""} />
        </Field>
        <Field label="Comentario del evaluador" htmlFor={`comment-${answerId}`}>
          <Textarea id={`comment-${answerId}`} name="comment" rows={2} defaultValue={initialComment ?? ""} />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton>{graded ? "Actualizar calificación" : "Guardar calificación"}</SubmitButton>
        {graded ? <span className="text-xs font-medium text-emerald-700">✓ Calificada</span> : null}
      </div>
    </form>
  );
}
