"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getVerifiedSession } from "@/lib/supabase/session";
import { getPublicEnv, getServiceRoleKey } from "@/lib/env";
import { accountInputSchema } from "@/features/admin/account-schema";

export type AccountActionState = { error?: string; success?: string };

function serviceClient() {
  const env = getPublicEnv();
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, getServiceRoleKey(), { auth: { autoRefreshToken: false, persistSession: false } });
}

async function isAdmin() {
  const session = await getVerifiedSession();
  return session?.roles.includes("admin") ? session : null;
}

export async function createInternalAccount(_state: AccountActionState, formData: FormData): Promise<AccountActionState> {
  if (!await isAdmin()) return { error: "Only admins can provision accounts." };
  const parsed = accountInputSchema.safeParse({
    username: formData.get("username"), email: formData.get("email"), password: formData.get("password"),
    roles: formData.getAll("roles"),
  });
  if (!parsed.success) return { error: "Enter a unique username, valid email, temporary password, and at least one role." };
  const admin = serviceClient();
  const { data: existing } = await admin.from("accounts").select("id").eq("username", parsed.data.username).maybeSingle();
  if (existing) return { error: "That username is already in use." };
  if (!parsed.data.password) return { error: "A temporary password is required." };
  const { data, error } = await admin.auth.admin.createUser({ email: parsed.data.email, password: parsed.data.password, email_confirm: true });
  if (error || !data.user) return { error: "The account could not be created. Check the email and try again." };
  const { error: accountError } = await admin.from("accounts").insert({ id: data.user.id, username: parsed.data.username });
  const { error: lookupError } = accountError ? { error: accountError } : await admin.from("account_auth_lookup").insert({ account_id: data.user.id, email: parsed.data.email });
  const { error: roleError } = accountError || lookupError ? { error: accountError ?? lookupError } : await admin.from("account_roles").insert(parsed.data.roles.map((role) => ({ account_id: data.user.id, role })));
  if (accountError || lookupError || roleError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "The account could not be created. Check the username and roles." };
  }
  revalidatePath("/admin/users");
  return { success: "Internal account created. Share the temporary password through a secure channel." };
}

export async function assignRoles(_state: AccountActionState, formData: FormData): Promise<AccountActionState> {
  if (!await isAdmin()) return { error: "Only admins can change roles." };
  const accountId = String(formData.get("accountId") ?? "");
  const roles = formData.getAll("roles").filter((role): role is "contributor" | "moderator" => role === "contributor" || role === "moderator");
  const admin = serviceClient();
  const { error: deleteError } = await admin.from("account_roles").delete().eq("account_id", accountId).in("role", ["contributor", "moderator"]);
  if (deleteError) return { error: "Role grants could not be updated." };
  const { error } = roles.length ? await admin.from("account_roles").insert(roles.map((role) => ({ account_id: accountId, role }))) : { error: null };
  if (error) return { error: "Role grants could not be updated." };
  revalidatePath("/admin/users");
  return { success: "Role grants updated." };
}

export async function listManagedAccounts() {
  if (!await isAdmin()) return [];
  const admin = serviceClient();
  const { data } = await admin.from("accounts").select("id,username,status,account_roles(role)").order("username");
  return data ?? [];
}
