"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv, getServiceRoleKey, getSiteUrl } from "@/lib/env";
import { normalizeUsername } from "@/lib/authz/permissions";
import { passwordChangeSchema } from "@/features/admin/account-schema";

export type AuthState = { error?: string; success?: string };

function serviceClient() {
  const env = getPublicEnv();
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function signInWithCredentials(_state: AuthState, formData: FormData): Promise<AuthState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Username or password is incorrect." };

  const admin = serviceClient();
  const { data: account } = await admin.from("accounts").select("id,status,account_auth_lookup(email)").eq("username", username).maybeSingle();
  if (account?.status !== "active") return { error: "Username or password is incorrect." };
  const lookup = Array.isArray(account.account_auth_lookup) ? account.account_auth_lookup[0] : account.account_auth_lookup;
  const email = lookup?.email;
  if (!email) return { error: "Username or password is incorrect." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Username or password is incorrect." };
  redirect("/");
}

export async function signUpWithCredentials(_state: AuthState, formData: FormData): Promise<AuthState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || !email || password.length < 12) {
    return { error: "Use a 3–32 character username, a valid email, and a password of at least 12 characters." };
  }
  const admin = serviceClient();
  const { data: existing } = await admin.from("accounts").select("id").eq("username", username).maybeSingle();
  if (existing) return { error: "That username is unavailable. Choose another." };
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return { error: "We could not create the account. Check the details and try again." };
  const { error: accountError } = await admin.from("accounts").insert({ id: data.user.id, username });
  const { error: lookupError } = accountError ? { error: accountError } : await admin.from("account_auth_lookup").insert({ account_id: data.user.id, email });
  if (accountError || lookupError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "We could not create the account. Check the details and try again." };
  }
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return { error: "Your account is ready. Sign in to continue." };
  redirect("/");
}

export async function startGoogleSignIn() {
  const supabase = await createClient();
  let siteUrl: string;
  try {
    siteUrl = getSiteUrl();
  } catch {
    redirect("/sign-in?error=oauth");
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });
  if (error || !data.url) redirect("/sign-in?error=oauth");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function changePassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = passwordChangeSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: "Passwords must match and be at least 12 characters." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to change your password." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  return error ? { error: "Password could not be updated. Try again." } : { success: "Password updated." };
}
