"use client";

import { useActionState } from "react";
import { changePassword } from "@/features/auth/actions";

export function PasswordChangeForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  return <form className="form-stack" action={action}><label>New password<input name="password" type="password" minLength={12} autoComplete="new-password" required /></label><label>Confirm password<input name="confirm" type="password" minLength={12} autoComplete="new-password" required /></label>{state.error && <p role="alert" className="form-error">{state.error}</p>}{state.success && <p role="status" className="form-success">{state.success}</p>}<button disabled={pending}>Update password</button></form>;
}
