"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/session";
import { getFacilitatorSessionView } from "@/features/go-force/session-queries";
import { goForceErrorMessage } from "@/features/go-force/messages";
import { publishGoForceSessionUpdate } from "@/features/go-force/realtime-broadcast";
import { parseGameVoteForm } from "@/features/go-force/schemas";
import { spinWheelOfNames, WheelOfNamesError } from "@/features/go-force/wheel-of-names-client";

export type GameActionState = {
  error?: string;
  success?: string;
  selectionId?: string;
  title?: string;
  animation?: string;
};

function revalidateSession(sessionId: string) {
  revalidatePath(`/admin/go-force/sessions/${sessionId}`);
  revalidatePath(`/go-force/session/${sessionId}`);
  revalidatePath("/admin/go-force");
}

export async function drawGoForceSelection(_state: GameActionState, formData: FormData): Promise<GameActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to run the roulette." };
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
    return { error: "Choose a valid Go Force session." };
  }

  let view;
  try {
    view = await getFacilitatorSessionView(sessionId);
  } catch {
    return { error: "The Go Force session could not be loaded. Please retry." };
  }
  if (!view) return { error: "That Go Force session could not be found." };
  if (view.session.game_master_id !== session.userId && !session.roles.includes("admin")) {
    return { error: "Only the game master or an admin can spin the roulette." };
  }
  if (view.session.status !== "live" || !view.currentRound) {
    return { error: "This session does not have an active round." };
  }
  if (view.currentSelection) return { error: "Close the current ballot before spinning again." };
  if (view.remainingGames.length === 0) {
    return { error: "Every game in this round has already been selected." };
  }

  let spin;
  try {
    spin = await spinWheelOfNames(
      view.remainingGames.map((game) => ({ id: game.id, text: game.title_snapshot })),
    );
  } catch (error) {
    return {
      error: error instanceof WheelOfNamesError || error instanceof Error
        ? error.message
        : "Wheel of Names could not complete the spin. Please retry.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("go_force_commit_selection", {
    target_session: sessionId,
    target_game: spin.winner.id,
  });
  if (error) return { error: goForceErrorMessage(error, "The game could not be committed. Please retry.") };

  const selectionId = typeof data?.selectionId === "string" ? data.selectionId : undefined;
  const title = typeof data?.title === "string" ? data.title : undefined;
  if (!selectionId || title !== spin.winner.text) {
    return { error: "The selected game could not be confirmed. Please refresh the session." };
  }

  await publishGoForceSessionUpdate(sessionId);
  revalidateSession(sessionId);
  return {
    selectionId,
    title,
    animation: spin.animation,
    success: `${title} is up for a vote.`,
  };
}

export async function submitGoForceGameVote(_state: GameActionState, formData: FormData): Promise<GameActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to vote." };
  const parsed = parseGameVoteForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your vote." };

  const supabase = await createClient();
  const { data: selection } = await supabase
    .from("go_force_selections")
    .select("round_id")
    .eq("id", parsed.data.selectionId)
    .maybeSingle();
  const { data: round } = selection
    ? await supabase.from("go_force_rounds").select("session_id").eq("id", selection.round_id).maybeSingle()
    : { data: null };
  const sessionId = round?.session_id ?? null;

  const { error } = await supabase.rpc("go_force_submit_game_vote", {
    target_selection: parsed.data.selectionId,
    vote_choice: parsed.data.choice,
  });
  if (error) return { error: goForceErrorMessage(error, "Your vote could not be recorded.") };

  if (sessionId) {
    await publishGoForceSessionUpdate(sessionId);
    revalidateSession(sessionId);
  }
  return {
    selectionId: parsed.data.selectionId,
    success: parsed.data.choice === "go" ? "Go vote recorded." : "No-go vote recorded.",
  };
}

export async function closeGoForceSelection(_state: GameActionState, formData: FormData): Promise<GameActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to close this selection." };
  const selectionId = String(formData.get("selectionId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!selectionId || !sessionId) return { error: "Choose a game selection to close." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("go_force_close_selection", { target_selection: selectionId });
  if (error) return { error: goForceErrorMessage(error, "The selection could not be closed.") };

  await publishGoForceSessionUpdate(sessionId);
  revalidateSession(sessionId);
  const goVotes = typeof data?.goVotes === "number" ? data.goVotes : 0;
  return {
    success: data?.outcome === "advanced" ? `Voting closed. The game advances with ${goVotes} go vote${goVotes === 1 ? "" : "s"}.` : "Voting closed. The game is eliminated.",
  };
}

export async function expireGoForceSelection(selectionId: string): Promise<{ closed: boolean }> {
  const session = await getVerifiedSession();
  if (!session || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectionId)) {
    return { closed: false };
  }

  const supabase = await createClient();
  const { data: selection } = await supabase
    .from("go_force_selections")
    .select("round_id")
    .eq("id", selectionId)
    .maybeSingle();
  if (!selection) return { closed: false };
  const { data: round } = await supabase.from("go_force_rounds").select("session_id").eq("id", selection.round_id).maybeSingle();
  const sessionId = round?.session_id;
  if (!sessionId) return { closed: false };

  const { data, error } = await supabase.rpc("go_force_expire_selection", { target_selection: selectionId });
  if (error) return { closed: false };
  if (data?.closed !== true) return { closed: false };

  await publishGoForceSessionUpdate(sessionId);
  revalidateSession(sessionId);
  return { closed: true };
}
