"use client";

import { useActionState } from "react";
import { createInternalAccount } from "@/features/admin/account-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Message } from "@/components/ui/message";
import { TextField } from "@/components/ui/text-field";

export function NewAccountForm() {
  const [state, action, pending] = useActionState(createInternalAccount, {});
  return <form className="form-stack admin-form" action={action}>
    <TextField label="Username" name="username" minLength={3} maxLength={32} required />
    <TextField label="Email" name="email" type="email" required />
    <TextField label="Temporary password" name="password" type="password" minLength={12} required hint="Share this temporary password privately. The account holder can change it after signing in." />
    <fieldset className="grid gap-2"><legend>Roles</legend><Checkbox name="roles" value="contributor" label="Contributor" /><Checkbox name="roles" value="moderator" label="Moderator" /></fieldset>
    {state.error && <Message tone="error">{state.error}</Message>}
    {state.success && <Message tone="success">{state.success}</Message>}
    <Button purpose="primary" pending={pending}>{pending ? "Creating…" : "Create account"}</Button>
  </form>;
}
