"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signInWithCredentials, type AuthState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ui/message";
import { TextField } from "@/components/ui/text-field";

const initialState: AuthState = {};

export function SignInForm() {
  const [state, action, pending] = useActionState(signInWithCredentials, initialState);
  const [username, setUsername] = useState("");
  return <form className="form-stack" action={action}>
    <TextField label="Username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
    <TextField label="Password" name="password" type="password" autoComplete="current-password" required />
    {state.error && <Message tone="error">{state.error}</Message>}
    <Button purpose="primary" pending={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    <p>New here? <Link href="/sign-up">Create an account</Link></p>
  </form>;
}
