"use client";

import { useActionState } from "react";
import { Field, Input, Textarea, FormError, SubmitButton } from "@/components/form";
import { gradeManualAnswer } from "@/lib/actions/grading";
import type { ActionResult } from "@/lib/actions/schemes";

/// Formulario que el evaluador usa para calificar una respuesta manual
/// (caso práctico, abierta, archivo). La escala siempre es **0–100**
/// para que la nota sea legible sin tener que mirar el `points` interno
/// de la pregunta. La acción se encarga de reescalar internamente al
/// `points` para que el cálculo agregado del intento siga funcionando.
export function GradeAnswerForm({
  answerId,
  initialScore,
  initialComment,
  graded,
}: {
  answerId: string;
  /** Nota humana 0–100 previamente asignada (o null si nunca). */
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
      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <Field label="Puntaje (0–100)" htmlFor={`score-${answerId}`} required>
          <Input id={`score-${answerId}`} name="score" type="number" min={0} max={100} step="0.5" required defaultValue={initialScore ?? ""} />
        </Field>
        <Field label="Comentario del evaluador" htmlFor={`comment-${answerId}`}>
          <Textarea id={`comment-${answerId}`} name="comment" rows={2} defaultValue={initialComment ?? ""} />
        </Field>
      </div>
      <p className="text-[11px] text-slate-500">
        Nota sobre 100. El umbral aprobatorio del examen práctico es <strong>70</strong>; por debajo se considera reprobado.
      </p>
      <div className="flex items-center gap-3">
        <SubmitButton>{graded ? "Actualizar calificación" : "Guardar calificación"}</SubmitButton>
        {graded ? <span className="text-xs font-medium text-emerald-700">✓ Calificada</span> : null}
      </div>
    </form>
  );
}
