"use client";

import { useActionState } from "react";
import { signUpWithCredentials, type AuthState } from "@/features/auth/actions";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpWithCredentials, {} satisfies AuthState);
  return <form className="form-stack" action={action}>
    <label>Username<input name="username" autoComplete="username" minLength={3} maxLength={32} required /></label>
    <label>Email<input name="email" type="email" autoComplete="email" required /></label>
    <label>Password<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
    <p className="field-hint">Passwords must be at least 12 characters. Public signup creates a reader account.</p>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
  </form>;
}
