import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type MessageTone = "error" | "success" | "notice";

const toneClasses: Record<MessageTone, { className: string; hook: string; role: "alert" | "status" }> = {
  error: { className: "border-l-4 border-red bg-danger-bg text-danger-ink", hook: "form-error", role: "alert" },
  success: { className: "border-l-4 border-success-line bg-success-bg text-success-ink", hook: "form-success", role: "status" },
  notice: { className: "bg-notice-bg font-bold", hook: "preview-notice", role: "status" },
};

export type MessageProps = HTMLAttributes<HTMLParagraphElement> & {
  tone: MessageTone;
};

export function Message({ tone, role, className, ...props }: MessageProps) {
  const style = toneClasses[tone];
  return <p {...props} role={role ?? style.role} className={cn("m-0 px-3 py-2.5 text-[0.95rem]", style.className, style.hook, className)} />;
}
