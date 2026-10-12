import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient(): SupabaseClient {
  if (!url || !key) throw new Error("Supabase URL/service-role key are not configured for e2e tests.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export type CreatePersonOptions = {
  username: string;
  email: string;
  password?: string;
  roles?: string[];
  /** When false, no auth-lookup row is inserted, so the person has "no email on file". */
  withEmail?: boolean;
  status?: "active" | "disabled";
  /** Explicit accounts.created_at value (ISO string) for deterministic created-order tests. */
  createdAt?: string;
};

/** Creates an auth identity + accounts/lookup/roles row and returns its id. */
export async function createPerson(options: CreatePersonOptions): Promise<string> {
  const admin = adminClient();
  const password = options.password ?? "Temp-Password-95x!";
  const { data, error } = await admin.auth.admin.createUser({ email: options.email, password, email_confirm: true });
  if (error) throw error;
  const id = data.user.id;

  const { error: accountError } = await admin
    .from("accounts")
    .insert({ id, username: options.username, ...(options.createdAt ? { created_at: options.createdAt } : {}) });
  if (accountError) throw accountError;

  if (options.withEmail !== false) {
    const { error: lookupError } = await admin.from("account_auth_lookup").insert({ account_id: id, email: options.email.toLowerCase() });
    if (lookupError) throw lookupError;
  }

  if (options.roles?.length) {
    const { error: rolesError } = await admin.from("account_roles").insert(options.roles.map((role) => ({ account_id: id, role })));
    if (rolesError) throw rolesError;
  }

  if (options.status && options.status !== "active") {
    const { error: statusError } = await admin.from("accounts").update({ status: options.status }).eq("id", id);
    if (statusError) throw statusError;
  }
  return id;
}

/** Creates `count` reader accounts with predictable usernames/emails for pagination data. */
export async function createManyPeople(count: number, prefix: string): Promise<string[]> {
  const ids: string[] = [];
  const password = "Temp-Password-95x!";
  for (let index = 0; index < count; index += 1) {
    const username = `${prefix}${String(index).padStart(2, "0")}`;
    ids.push(await createPerson({ username, email: `${username}@example.test`, password }));
  }
  return ids;
}

/** Removes created people by auth user id (accounts cascade). */
export async function deletePeople(ids: string[]) {
  const admin = adminClient();
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw error;
  }
}