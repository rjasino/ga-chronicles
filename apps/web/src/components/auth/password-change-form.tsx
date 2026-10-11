"use client";

import { useActionState } from "react";
import { changePassword } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ui/message";
import { TextField } from "@/components/ui/text-field";

export function PasswordChangeForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  return <form className="form-stack" action={action}>
    <TextField label="New password" name="password" type="password" minLength={12} autoComplete="new-password" required />
    <TextField label="Confirm password" name="confirm" type="password" minLength={12} autoComplete="new-password" required />
    {state.error && <Message tone="error">{state.error}</Message>}
    {state.success && <Message tone="success">{state.success}</Message>}
    <Button purpose="primary" pending={pending}>Update password</Button>
  </form>;
}
