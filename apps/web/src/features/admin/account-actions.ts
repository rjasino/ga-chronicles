"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getVerifiedSession } from "@/lib/supabase/session";
import { getPublicEnv, getServiceRoleKey } from "@/lib/env";
import { accountInputSchema } from "@/features/admin/account-schema";
import { PAGE_SIZE, roleRank, type PeopleView } from "@/features/admin/people-view";

export type AccountActionState = { error?: string; success?: string };

export type ManagedAccountRow = {
  id: string;
  username: string;
  status: string;
  created_at: string;
  email: string | null;
  account_roles: { role: string }[];
};

/** Shape returned by Supabase for a full accounts row (email is 1:1). */
type RawAccountRow = {
  id: string;
  username: string;
  status: string;
  created_at: string | null;
  account_roles?: { role: string }[] | null;
  account_auth_lookup?: { email: string } | null;
};

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

export async function listManagedAccounts(view: PeopleView): Promise<{ rows: ManagedAccountRow[]; total: number }> {
  if (!(await isAdmin())) return { rows: [], total: 0 };
  const admin = serviceClient();
  const from = (view.page - 1) * PAGE_SIZE;
  const emailIds = view.q.trim() ? await resolveEmailIds(admin, view.q) : [];
  const grantedIds = view.role === "reader" ? await resolveGrantedIds(admin) : [];

  // Deterministic role ordering and email-null-last ordering need computed ranks
  // / null handling, so those two sorts fetch the matched set in slim form
  // (id/username/roles/email), sort in code, then fetch only the requested page
  // of full rows by id to keep payloads bounded.
  if (view.sort === "role" || view.sort === "email") {
    const select = `id,username,${rolesEmbed(view.role)},account_auth_lookup(email)`;
    const matched: Array<{
      id: string;
      username: string;
      account_roles?: { role: string }[] | null;
      account_auth_lookup?: { email: string } | null;
    }> = [];
    const batchSize = 1000;
    for (let offset = 0; ; offset += batchSize) {
      const query = admin.from("accounts").select(select);
      applyCriteria(query, view, emailIds, grantedIds);
      const { data } = await query.range(offset, offset + batchSize - 1);
      const batch = (data ?? []) as unknown as typeof matched;
      matched.push(...batch);
      if (batch.length < batchSize) break;
    }
    const total = matched.length;
    const decorated = matched.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.account_auth_lookup?.email ?? null,
      rank: roleRank((row.account_roles ?? []).map((grant) => grant.role)),
    }));
    if (view.sort === "email") {
      // Accounts with no email on file sort last regardless of direction.
      decorated.sort((a, b) => {
        if (a.email === null && b.email !== null) return 1;
        if (a.email !== null && b.email === null) return -1;
        const byEmail = (a.email ?? "").localeCompare(b.email ?? "");
        if (byEmail !== 0) return view.dir === "asc" ? byEmail : -byEmail;
        return a.username.localeCompare(b.username);
      });
    } else {
      // Fixed hierarchy asc (or desc), with username as an always-stable tie-breaker.
      decorated.sort((a, b) => {
        const rankOrder = view.dir === "asc" ? a.rank - b.rank : b.rank - a.rank;
        return rankOrder || a.username.localeCompare(b.username);
      });
    }
    const pageIds = decorated.slice(from, from + PAGE_SIZE).map((row) => row.id);
    if (pageIds.length === 0) return { rows: [], total };
    const { data: full } = await admin.from("accounts").select(fullSelect(view.role)).in("id", pageIds);
    const byId = new Map(((full ?? []) as unknown as RawAccountRow[]).map((row) => [row.id, normalizeRow(row)]));
    const rows = pageIds
      .map((id) => byId.get(id))
      .filter((row): row is ManagedAccountRow => row !== undefined);
    return { rows, total };
  }

  const query = admin.from("accounts").select(fullSelect(view.role), { count: "exact" });
  applyCriteria(query, view, emailIds, grantedIds);
  query.order(view.sort === "created" ? "created_at" : view.sort, { ascending: view.dir === "asc" });
  if (view.sort !== "username") query.order("username", { ascending: true });
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  return { rows: ((data ?? []) as unknown as RawAccountRow[]).map(normalizeRow), total: count ?? data?.length ?? 0 };
}

/** Use a separate inner embed for filtering so returned grants remain unfiltered. */
function rolesEmbed(role: PeopleView["role"]): string {
  return role !== "any" && role !== "reader"
    ? "role_filter:account_roles!inner(role),account_roles(role)"
    : "account_roles(role)";
}

function fullSelect(role: PeopleView["role"]): string {
  return `id,username,status,created_at,${rolesEmbed(role)},account_auth_lookup(email)`;
}

/** Account ids whose email matches the search text (case-insensitive, partial). */
async function resolveEmailIds(admin: ReturnType<typeof serviceClient>, q: string): Promise<string[]> {
  // Strip characters that would corrupt the PostgREST logic tree (none of which
  // can occur in a username or a well-formed email).
  const pattern = q.trim().replace(/[,()<>]/g, "");
  const { data } = await admin
    .from("accounts")
    .select("id,account_auth_lookup!inner(email)")
    .filter("account_auth_lookup.email", "ilike", `%${pattern}%`);
  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

/** Account ids that hold at least one explicit role grant. */
async function resolveGrantedIds(admin: ReturnType<typeof serviceClient>): Promise<string[]> {
  const { data } = await admin.from("account_roles").select("account_id");
  return ((data ?? []) as Array<{ account_id: string }>).map((row) => row.account_id);
}

/**
 * Applies search, role, and status criteria to an accounts query (no order/range).
 * PostgREST logic trees cannot reference embedded columns, so email matches are
 * folded in as a top-level `id.in.(...)` clause inside the `or` group; the
 * implicit reader role is expressed as `id=not.in.( granted ids )`.
 */
function applyCriteria(
  query: { or: (clause: string) => void; ilike: (column: string, pattern: string) => void; filter: (column: string, operator: string, value: string) => void; eq: (column: string, value: string) => void },
  view: PeopleView,
  emailIds: string[],
  grantedIds: string[],
) {
  const q = view.q.trim();
  if (q) {
    const pattern = q.replace(/[,()<>]/g, "");
    if (emailIds.length > 0) {
      query.or(`username.ilike.*${pattern}*,id.in.(${emailIds.join(",")})`);
    } else {
      query.ilike("username", `%${pattern}%`);
    }
  }
  if (view.role === "reader") {
    if (grantedIds.length > 0) query.filter("id", "not.in", `(${grantedIds.join(",")})`);
  } else if (view.role !== "any") {
    query.filter("role_filter.role", "eq", view.role);
  }
  if (view.status !== "any") query.eq("status", view.status);
}

function normalizeRow(raw: RawAccountRow): ManagedAccountRow {
  return {
    id: raw.id,
    username: raw.username,
    status: raw.status,
    created_at: raw.created_at ?? "",
    email: raw.account_auth_lookup?.email ?? null,
    account_roles: raw.account_roles ?? [],
  };
}