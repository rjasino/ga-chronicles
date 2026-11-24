"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/session";
import { failureResult } from "@/lib/error-logging";
import { canManageGoForce, isGoForceAdmin, isGoForceGameMaster } from "@/features/go-force/access";
import {
  addSessionParticipantSchema,
  createSessionSchema,
} from "@/features/go-force/admin-schemas";
import { withKnownGoForceFailure } from "@/features/go-force/action-failures";
import { publishGoForceSessionUpdate } from "@/features/go-force/realtime-broadcast";

export type SessionActionState = {
  error?: string;
  errorId?: string;
  success?: string;
  sessionId?: string;
};

export async function createGoForceSession(
  _state: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const session = await getVerifiedSession();
  if (!session || !canManageGoForce(session.roles))
    return { error: "Only an admin can create a Go Force session." };

  const parsed = createSessionSchema.safeParse({
    gotyYear: formData.get("gotyYear"),
    participantIds: Array.from(new Set(formData.getAll("participantIds").map(String))),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Check the session details." };

  const supabase = await createClient();
  const { data: sessionId, error } = await supabase.rpc("go_force_create_session", {
    target_goty_year: parsed.data.gotyYear,
    target_participant_ids: parsed.data.participantIds,
  });
  if (error) {
    if (error.code === "23505") {
      return {
        error:
          "A Go Force session for that year is already ready, live, or on the final ballot. Finish or stop it before creating another.",
      };
    }
    return withKnownGoForceFailure(
      error,
      "go-force.session.create",
      "The Go Force session could not be created.",
    );
  }
  if (typeof sessionId !== "string" || !sessionId) {
    return failureResult({
      operation: "go-force.session.create-confirm",
      error: new Error("The session creation returned no confirmation."),
      message: "The Go Force session could not be created.",
    });
  }

  refresh();
  return {
    sessionId,
    success: "Session ready. Confirm the roster and start it when the show begins.",
  };
}

export async function startGoForceSession(
  _state: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to start this session." };
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return { error: "Choose a Go Force session." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("go_force_start_session", { target_session: sessionId });
  if (error) {
    return withKnownGoForceFailure(
      error,
      "go-force.session.start",
      "The session could not be started.",
      {
        sessionId,
      },
    );
  }

  await publishGoForceSessionUpdate(sessionId);
  return { success: "Session started. The roster and game list are now locked." };
}

export async function addGoForceParticipant(
  _state: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to add a player." };

  const parsed = addSessionParticipantSchema.safeParse({
    sessionId: formData.get("sessionId"),
    accountId: formData.get("accountId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Choose a valid player to add." };
  }

  const supabase = await createClient();
  const { data: target, error: lookupError } = await supabase
    .from("go_force_sessions")
    .select("id,game_master_id,status")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (lookupError) {
    return failureResult({
      operation: "go-force.session.add-participant-lookup",
      error: lookupError,
      message: "The Go Force session could not be loaded. Please retry.",
      context: { sessionId: parsed.data.sessionId },
    });
  }
  if (!target) return { error: "That Go Force session could not be found." };
  if (
    !isGoForceAdmin(session.roles) &&
    !isGoForceGameMaster(session.userId, target.game_master_id)
  ) {
    return { error: "Only the game master or an admin can add players." };
  }
  if (target.status !== "live" && target.status !== "final_ballot") {
    return { error: "This session is no longer accepting new players." };
  }

  const { error } = await supabase.rpc("go_force_add_session_participant", {
    target_session: parsed.data.sessionId,
    target_account: parsed.data.accountId,
  });
  if (error) {
    return withKnownGoForceFailure(
      error,
      "go-force.session.add-participant",
      "The player could not be added to this session.",
      { sessionId: parsed.data.sessionId },
    );
  }

  await publishGoForceSessionUpdate(parsed.data.sessionId);
  return { success: "Player added to the session.", sessionId: parsed.data.sessionId };
}

export async function deleteReadyGoForceSession(
  _state: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const session = await getVerifiedSession();
  if (!session || !canManageGoForce(session.roles))
    return { error: "Only an admin can remove a ready session." };
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return { error: "Choose a Go Force session." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("go_force_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("status", "ready");
  if (error) {
    return failureResult({
      operation: "go-force.session.delete-ready",
      error,
      message: "Only a session that has not started can be removed.",
      context: { sessionId },
    });
  }

  refresh();
  return { success: "Ready session removed." };
}
