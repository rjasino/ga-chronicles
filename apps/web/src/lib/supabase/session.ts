import type { Role } from "@/lib/authz/permissions";
import { createClient } from "@/lib/supabase/server";

export type VerifiedSession = {
  userId: string;
  username: string;
  roles: Role[];
};

export async function getVerifiedSession(): Promise<VerifiedSession | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: account }, { data: assignments }] = await Promise.all([
    supabase.from("accounts").select("username,status").eq("id", user.id).maybeSingle(),
    supabase.from("account_roles").select("role").eq("account_id", user.id),
  ]);
  if (!account || account.status !== "active") return null;
  return {
    userId: user.id,
    username: account.username,
    roles: (assignments ?? []).map(({ role }) => role as Role),
  };
}
