import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, Ref } from "react";
import { cn } from "./cn";

export type ButtonPurpose = "primary" | "secondary" | "error" | "success" | "text";
export type ButtonSize = "default" | "toolbar";

const base =
  "inline-flex items-center justify-center font-body font-semibold cursor-pointer no-underline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-gold disabled:opacity-65 disabled:cursor-wait";

const purposeClasses: Record<ButtonPurpose, string> = {
  primary: "min-h-11 px-4 py-2.5 text-[0.95rem] border-2 border-blue bg-blue text-white hover:bg-blue-hover hover:border-blue-hover",
  secondary: "min-h-11 px-4 py-2.5 text-[0.95rem] border-2 border-blue bg-transparent text-blue hover:bg-paper",
  error: "min-h-11 px-4 py-2.5 text-[0.95rem] border-2 border-red bg-red text-white hover:opacity-90",
  success: "min-h-11 px-4 py-2.5 text-[0.95rem] border-2 border-success bg-success text-white hover:opacity-90",
  text: "min-h-11 px-1 text-[0.95rem] border-0 bg-transparent text-blue underline hover:text-red",
};

const toolbarClasses = "min-h-[34px] px-2.5 py-1 text-[0.85rem] border border-field-line bg-white text-ink hover:border-blue";
const toolbarActiveClasses = "border-blue bg-blue text-white";

export function buttonClasses({
  purpose = "secondary",
  size = "default",
  active = false,
}: {
  purpose?: ButtonPurpose;
  size?: ButtonSize;
  active?: boolean;
}): string {
  if (size === "toolbar") return cn(base, toolbarClasses, active && toolbarActiveClasses);
  return cn(base, purposeClasses[purpose]);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  purpose?: ButtonPurpose;
  size?: ButtonSize;
  pending?: boolean;
  active?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({ purpose = "secondary", size = "default", pending = false, active = false, disabled, className, ref, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      ref={ref}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(buttonClasses({ purpose, size, active }), className)}
    />
  );
}

export type ButtonLinkProps = ComponentProps<typeof Link> & {
  purpose?: ButtonPurpose;
};

export function ButtonLink({ purpose = "secondary", className, ...props }: ButtonLinkProps) {
  return <Link {...props} className={cn(buttonClasses({ purpose }), className)} />;
}
