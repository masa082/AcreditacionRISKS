"use client";

import { useActionState } from "react";
import { Field, Input, Textarea, Select, FormError, SubmitButton } from "@/components/form";
import { EXAM_TYPE_LABELS, EXAM_MODALITY_LABELS } from "@/lib/exam-meta";
import type { ActionResult } from "@/lib/actions/schemes";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

export interface ExamInitial {
  code?: string;
  name?: string;
  description?: string | null;
  schemeId?: string | null;
  type?: string;
  modality?: string;
  durationMin?: number;
  passingScore?: number;
  attemptsAllowed?: number;
  maxQuestions?: number;
  instructions?: string | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  requirePayment?: boolean;
  requireSchedule?: boolean;
  requireCommittee?: boolean;
  autoCertificate?: boolean;
  showResultImmediately?: boolean;
  showCorrectAnswers?: boolean;
  allowReview?: boolean;
}

const FLAGS: { name: keyof ExamInitial; label: string; hint?: string }[] = [
  { name: "randomizeQuestions", label: "Preguntas aleatorias" },
  { name: "randomizeOptions", label: "Orden aleatorio de opciones" },
  { name: "requirePayment", label: "Requiere pago previo" },
  { name: "requireSchedule", label: "Requiere agenda previa" },
  { name: "requireCommittee", label: "Requiere aprobación del comité" },
  { name: "autoCertificate", label: "Certificado automático al aprobar" },
  { name: "showResultImmediately", label: "Mostrar resultado inmediato" },
  { name: "showCorrectAnswers", label: "Mostrar respuestas correctas" },
  { name: "allowReview", label: "Permitir revisión posterior" },
];

export function ExamForm({
  action,
  schemes,
  initial,
  submitLabel,
}: {
  action: Action;
  schemes: { id: string; code: string; name: string }[];
  initial?: ExamInitial;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, { ok: false } as ActionResult);

  return (
    <form action={formAction} className="space-y-6">
      <FormError error={state.error} />

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Código" required><Input name="code" required defaultValue={initial?.code} placeholder="EX-AUD-02" /></Field>
        <div className="sm:col-span-2">
          <Field label="Nombre" required><Input name="name" required defaultValue={initial?.name} placeholder="Examen de Certificación …" /></Field>
        </div>
      </div>

      <Field label="Descripción"><Textarea name="description" rows={2} defaultValue={initial?.description ?? ""} /></Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Esquema">
          <Select name="schemeId" defaultValue={initial?.schemeId ?? ""}>
            <option value="">— Sin esquema —</option>
            {schemes.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </Select>
        </Field>
        <Field label="Tipo">
          <Select name="type" defaultValue={initial?.type ?? "CERTIFICATION"}>
            {Object.entries(EXAM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Modalidad">
          <Select name="modality" defaultValue={initial?.modality ?? "ONLINE"}>
            {Object.entries(EXAM_MODALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Duración (min)" required><Input name="durationMin" type="number" min={1} max={1440} required defaultValue={initial?.durationMin ?? 60} /></Field>
        <Field label="Puntaje mínimo (%)" required hint="Umbral aprobatorio (política: ≥80%)."><Input name="passingScore" type="number" min={0} max={100} step="0.1" required defaultValue={initial?.passingScore ?? 80} /></Field>
        <Field label="Intentos permitidos" required><Input name="attemptsAllowed" type="number" min={1} max={20} required defaultValue={initial?.attemptsAllowed ?? 1} /></Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label="Máximo de preguntas por intento"
          required
          hint="Cantidad máxima que verá el candidato. Se eligen al azar, sin repetir. Use 0 para servir todas las preguntas de las secciones sin tope."
        >
          <Input
            name="maxQuestions"
            type="number"
            min={0}
            max={500}
            required
            defaultValue={initial?.maxQuestions ?? 50}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Disponible desde" hint="Opcional"><Input name="availableFrom" type="datetime-local" defaultValue={initial?.availableFrom ?? ""} /></Field>
        <Field label="Disponible hasta" hint="Opcional"><Input name="availableTo" type="datetime-local" defaultValue={initial?.availableTo ?? ""} /></Field>
      </div>

      <Field label="Instrucciones"><Textarea name="instructions" rows={2} defaultValue={initial?.instructions ?? ""} placeholder="Lea cada pregunta con atención…" /></Field>

      <div>
        <div className="mb-2 text-sm font-medium text-slate-700">Reglas de comportamiento</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {FLAGS.map((f) => (
            <label key={f.name} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" name={f.name} defaultChecked={!!initial?.[f.name]} />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end"><SubmitButton>{submitLabel ?? "Guardar"}</SubmitButton></div>
    </form>
  );
}
