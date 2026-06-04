"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  hint,
  children,
  required,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

const baseInput =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea {...props} className={`${baseInput} ${props.className ?? ""}`} />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${baseInput} ${props.className ?? ""}`} />
  );
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
      {error}
    </div>
  );
}

export function SubmitButton({
  children = "Guardar",
  pendingText = "Guardando…",
}: {
  children?: ReactNode;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg btn-grad-navy px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
    >
      {pending ? pendingText : children}
    </button>
  );
}
