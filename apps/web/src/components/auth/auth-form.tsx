"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signInWithCredentials, type AuthState } from "@/features/auth/actions";

const initialState: AuthState = {};

export function SignInForm() {
  const [state, action, pending] = useActionState(signInWithCredentials, initialState);
  const [username, setUsername] = useState("");
  return <form className="form-stack" action={action}>
    <label>Username<input name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    <p>New here? <Link href="/sign-up">Create an account</Link></p>
  </form>;
}
