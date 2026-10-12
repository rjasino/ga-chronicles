"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

const labelClass = "grid gap-1.5 font-semibold text-ink";
const controlClass =
  "w-full min-h-[46px] px-3 py-2.5 border border-field-line bg-white text-ink font-body text-base rounded-none hover:border-blue focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-gold disabled:opacity-65 aria-[invalid=true]:border-red";
const hintClass = "m-0 text-muted text-[0.88rem]";
const errorClass = "m-0 text-danger-ink text-[0.88rem] font-semibold";

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
};

function useFieldIds() {
  const id = useId();
  return { hintId: `${id}-hint`, errorId: `${id}-error` };
}

function describedBy(ids: { hintId: string; errorId: string }, hint: ReactNode, error?: string) {
  const parts = [hint ? ids.hintId : null, error ? ids.errorId : null].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & FieldProps;

export function TextField({ label, hint, error, className, ...props }: TextFieldProps) {
  const ids = useFieldIds();
  return (
    <div className="grid gap-1.5">
      <label className={labelClass}>
        <span>{label}</span>
        <input {...props} aria-invalid={error ? true : undefined} aria-describedby={describedBy(ids, hint, error)} className={cn(controlClass, className)} />
      </label>
      {hint && <p id={ids.hintId} className={hintClass}>{hint}</p>}
      {error && <p id={ids.errorId} className={errorClass}>{error}</p>}
    </div>
  );
}

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps;

export function TextArea({ label, hint, error, className, ...props }: TextAreaProps) {
  const ids = useFieldIds();
  return (
    <div className="grid gap-1.5">
      <label className={labelClass}>
        <span>{label}</span>
        <textarea {...props} aria-invalid={error ? true : undefined} aria-describedby={describedBy(ids, hint, error)} className={cn(controlClass, "resize-y leading-relaxed", className)} />
      </label>
      {hint && <p id={ids.hintId} className={hintClass}>{hint}</p>}
      {error && <p id={ids.errorId} className={errorClass}>{error}</p>}
    </div>
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldProps;

export function Select({ label, hint, error, className, children, ...props }: SelectProps) {
  const ids = useFieldIds();
  return (
    <div className="grid gap-1.5">
      <label className={labelClass}>
        <span>{label}</span>
        <select {...props} aria-invalid={error ? true : undefined} aria-describedby={describedBy(ids, hint, error)} className={cn(controlClass, "min-h-11 text-[0.95rem]", className)}>
          {children}
        </select>
      </label>
      {hint && <p id={ids.hintId} className={hintClass}>{hint}</p>}
      {error && <p id={ids.errorId} className={errorClass}>{error}</p>}
    </div>
  );
}
