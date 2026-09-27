"use client";

import { useActionState } from "react";
import { createInternalAccount } from "@/features/admin/account-actions";

export function NewAccountForm() {
  const [state, action, pending] = useActionState(createInternalAccount, {});
  return <form className="form-stack admin-form" action={action}>
    <label>Username<input name="username" minLength={3} maxLength={32} required /></label>
    <label>Email<input name="email" type="email" required /></label>
    <label>Temporary password<input name="password" type="password" minLength={12} required /><span className="field-hint">Share this temporary password privately. The account holder can change it after signing in.</span></label>
    <fieldset><legend>Roles</legend><label className="check-label"><input type="checkbox" name="roles" value="contributor" /> Contributor</label><label className="check-label"><input type="checkbox" name="roles" value="moderator" /> Moderator</label></fieldset>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}{state.success && <p role="status" className="form-success">{state.success}</p>}
    <button disabled={pending}>{pending ? "Creating…" : "Create account"}</button>
  </form>;
}
