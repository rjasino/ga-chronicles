import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
};

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={cn("inline-flex items-center gap-2 font-semibold text-ink cursor-pointer", className)}>
      <input
        {...props}
        type="checkbox"
        className="size-5 accent-blue focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold"
      />
      <span>{label}</span>
    </label>
  );
}
