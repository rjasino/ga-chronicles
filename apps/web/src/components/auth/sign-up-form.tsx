"use client";

import { useActionState } from "react";
import { signUpWithCredentials, type AuthState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ui/message";
import { TextField } from "@/components/ui/text-field";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpWithCredentials, {} satisfies AuthState);
  return <form className="form-stack" action={action}>
    <TextField label="Username" name="username" autoComplete="username" minLength={3} maxLength={32} required />
    <TextField label="Email" name="email" type="email" autoComplete="email" required />
    <TextField label="Password" name="password" type="password" autoComplete="new-password" minLength={12} required hint="Passwords must be at least 12 characters. Public signup creates a reader account." />
    {state.error && <Message tone="error">{state.error}</Message>}
    <Button purpose="primary" pending={pending}>{pending ? "Creating account…" : "Create account"}</Button>
  </form>;
}
