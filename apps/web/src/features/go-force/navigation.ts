import { canSeeGoForceNavigation } from "@/features/go-force/access";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/authz/permissions";

const ACTIVE_SESSION_STATUSES = ["ready", "live", "final_ballot"] as const;

export async function shouldShowGoForceNavigation(
  userId: string,
  roles: readonly Role[],
): Promise<boolean> {
  if (canSeeGoForceNavigation(false, false, roles)) return true;

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("go_force_page_settings")
    .select("page_visible")
    .eq("id", true)
    .maybeSingle();
  if (!settings?.page_visible) return false;

  const [{ data: memberships }, { data: gameMasterSessions }] = await Promise.all([
    supabase
      .from("go_force_session_participants")
      .select("session_id")
      .eq("account_id", userId)
      .eq("active", true),
    supabase
      .from("go_force_sessions")
      .select("id")
      .eq("game_master_id", userId)
      .in("status", [...ACTIVE_SESSION_STATUSES]),
  ]);

  const sessionIds = [
    ...new Set([
      ...(memberships ?? []).map((row) => row.session_id),
      ...(gameMasterSessions ?? []).map((row) => row.id),
    ]),
  ];
  if (sessionIds.length === 0) return false;

  const { data: activeSessions } = await supabase
    .from("go_force_sessions")
    .select("id")
    .in("id", sessionIds)
    .in("status", [...ACTIVE_SESSION_STATUSES]);

  return canSeeGoForceNavigation(true, (activeSessions?.length ?? 0) > 0, roles);
}
