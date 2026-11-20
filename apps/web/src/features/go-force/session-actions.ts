"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/session";
import { canManageGoForce } from "@/features/go-force/access";
import { createSessionSchema } from "@/features/go-force/admin-schemas";
import { goForceErrorMessage } from "@/features/go-force/messages";
import { publishGoForceSessionUpdate } from "@/features/go-force/realtime-broadcast";

export type SessionActionState = { error?: string; success?: string; sessionId?: string };

function revalidateSession(sessionId: string) {
  revalidatePath("/go-force");
  revalidatePath("/admin/go-force");
  revalidatePath(`/admin/go-force/sessions/${sessionId}`);
  revalidatePath(`/go-force/session/${sessionId}`);
  revalidatePath(`/go-force/results/${sessionId}`);
}

export async function createGoForceSession(_state: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const session = await getVerifiedSession();
  if (!session || !canManageGoForce(session.roles)) return { error: "Only an admin can create a Go Force session." };

  const parsed = createSessionSchema.safeParse({
    gotyYear: formData.get("gotyYear"),
    participantIds: Array.from(new Set(formData.getAll("participantIds").map(String))),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the session details." };

  const supabase = await createClient();
  const { data: accounts, error: accountError } = await supabase
    .from("accounts")
    .select("id,username,display_name")
    .in("id", parsed.data.participantIds)
    .eq("status", "active");
  if (accountError) return { error: "Could not confirm the selected players." };
  if ((accounts ?? []).length !== parsed.data.participantIds.length) {
    return { error: "Every selected player must have an active account." };
  }

  const accountsById = new Map((accounts ?? []).map((account) => [account.id, account]));
  const { data: created, error: createError } = await supabase
    .from("go_force_sessions")
    .insert({ goty_year: parsed.data.gotyYear, game_master_id: session.userId, status: "ready" })
    .select("id")
    .single();
  if (createError || !created) {
    if (createError?.code === "23505") {
      return { error: "A Go Force session for that year is already ready, live, or on the final ballot. Finish or stop it before creating another." };
    }
    return { error: "The Go Force session could not be created." };
  }

  const roster = parsed.data.participantIds.map((accountId, index) => {
    const account = accountsById.get(accountId);
    return {
      session_id: created.id as string,
      account_id: accountId,
      display_name_snapshot: account?.display_name?.trim() || account?.username || "Player",
      roster_order: index + 1,
      active: true,
    };
  });
  const { error: rosterError } = await supabase.from("go_force_session_participants").insert(roster);
  if (rosterError) {
    await supabase.from("go_force_sessions").delete().eq("id", created.id);
    return { error: "The player roster could not be saved. Create the session again." };
  }

  revalidateSession(created.id);
  return { sessionId: created.id, success: "Session ready. Confirm the roster and start it when the show begins." };
}

export async function startGoForceSession(_state: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to start this session." };
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return { error: "Choose a Go Force session." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("go_force_start_session", { target_session: sessionId });
  if (error) return { error: goForceErrorMessage(error, "The session could not be started.") };

  await publishGoForceSessionUpdate(sessionId);
  revalidateSession(sessionId);
  return { success: "Session started. The roster and game list are now locked." };
}

export async function deleteReadyGoForceSession(_state: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const session = await getVerifiedSession();
  if (!session || !canManageGoForce(session.roles)) return { error: "Only an admin can remove a ready session." };
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return { error: "Choose a Go Force session." };

  const supabase = await createClient();
  const { error } = await supabase.from("go_force_sessions").delete().eq("id", sessionId).eq("status", "ready");
  if (error) return { error: "Only a session that has not started can be removed." };

  revalidateSession(sessionId);
  return { success: "Ready session removed." };
}
