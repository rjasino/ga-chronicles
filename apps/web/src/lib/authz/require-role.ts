import { redirect } from "next/navigation";
import type { Permission, Role } from "@/lib/authz/permissions";
import { can } from "@/lib/authz/permissions";
import { getVerifiedSession } from "@/lib/supabase/session";

export async function requirePermission(permission: Permission) {
  const session = await getVerifiedSession();
  if (!session) redirect("/sign-in");
  if (!can(session.roles, permission)) redirect("/");
  return session;
}

export async function requireAnyRole(roles: readonly Role[]) {
  const session = await getVerifiedSession();
  if (!session) redirect("/sign-in");
  if (!roles.some((role) => session.roles.includes(role))) redirect("/");
  return session;
}
