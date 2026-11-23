"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/session";
import { getFacilitatorSessionView } from "@/features/go-force/session-queries";
import { withKnownGoForceFailure } from "@/features/go-force/action-failures";
import { failureResult, reportFailure } from "@/lib/error-logging";
import { publishGoForceSessionUpdate } from "@/features/go-force/realtime-broadcast";
import { parseGameVoteForm } from "@/features/go-force/schemas";
import { spinWheelOfNames, WheelOfNamesError } from "@/features/go-force/wheel-of-names-client";
import { wheelAnimationDurationMs } from "@/features/go-force/wheel-animation";

export type GameActionState = {
  error?: string;
  errorId?: string;
  success?: string;
  selectionId?: string;
  gameId?: string;
  title?: string;
  animation?: string;
  animationFormat?: "gif" | "webp";
  animationDurationMs?: number;
};

function revalidateSession(sessionId: string) {
  revalidatePath(`/admin/go-force/sessions/${sessionId}`);
  revalidatePath(`/go-force/session/${sessionId}`);
  revalidatePath("/admin/go-force");
}

const COMMIT_FALLBACK = "The game could not be committed. Please retry.";
const VOTE_FALLBACK = "Your vote could not be recorded.";
const CLOSE_FALLBACK = "The selection could not be closed.";

export async function drawGoForceSelection(
  _state: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to run the roulette." };
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
    return { error: "Choose a valid Go Force session." };
  }

  let view;
  try {
    view = await getFacilitatorSessionView(sessionId);
  } catch (error) {
    return failureResult({
      operation: "go-force.selection.load",
      error,
      message: "The Go Force session could not be loaded. Please retry.",
      context: { sessionId },
    });
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
    if (error instanceof WheelOfNamesError) {
      return {
        error: error.requestId ? `${error.message} (Reference ${error.requestId})` : error.message,
      };
    }
    return failureResult({
      operation: "go-force.selection.spin",
      error,
      message: "Wheel of Names could not complete the spin. Please retry.",
      context: { sessionId },
    });
  }

  return {
    gameId: spin.winner.id,
    title: spin.winner.text,
    ...(spin.animation ? { animation: spin.animation } : {}),
    animationFormat: spin.animationFormat,
    animationDurationMs: spin.animation
      ? wheelAnimationDurationMs(spin.animation, spin.animationFormat)
      : 0,
  };
}

export async function commitGoForceSelection(
  sessionId: string,
  gameId: string,
): Promise<GameActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to open voting." };
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(sessionId) || !uuidPattern.test(gameId)) {
    return { error: "Choose a valid Go Force selection." };
  }

  let view;
  try {
    view = await getFacilitatorSessionView(sessionId);
  } catch (error) {
    return failureResult({
      operation: "go-force.selection.load",
      error,
      message: "The Go Force session could not be loaded. Please retry.",
      context: { sessionId },
    });
  }
  if (!view) return { error: "That Go Force session could not be found." };
  if (view.session.game_master_id !== session.userId && !session.roles.includes("admin")) {
    return { error: "Only the game master or an admin can open voting." };
  }

  if (view.currentSelection) {
    if (view.currentSelection.session_game_id === gameId) {
      return {
        selectionId: view.currentSelection.id,
        gameId,
        title: view.currentSelection.game?.title_snapshot ?? "Selected game",
        success: "Voting is open.",
      };
    }
    return { error: "Another game selection is already open." };
  }
  if (view.session.status !== "live" || !view.currentRound) {
    return { error: "This session does not have an active round." };
  }
  if (!view.remainingGames.some((game) => game.id === gameId)) {
    return { error: "The selected game is no longer eligible. Please spin again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("go_force_commit_selection", {
    target_session: sessionId,
    target_game: gameId,
  });
  if (error) {
    // A pagehide callback and the animation-complete callback may race. If the
    // other request already committed this same candidate, treat it as success.
    try {
      const latestView = await getFacilitatorSessionView(sessionId);
      if (latestView?.currentSelection?.session_game_id === gameId) {
        return {
          selectionId: latestView.currentSelection.id,
          gameId,
          title: latestView.currentSelection.game?.title_snapshot ?? "Selected game",
          success: "Voting is open.",
        };
      }
    } catch {
      // Preserve the original database error as the user-facing result.
    }
    return withKnownGoForceFailure(error, "go-force.selection.commit", COMMIT_FALLBACK, { sessionId });
  }

  const selectionId = typeof data?.selectionId === "string" ? data.selectionId : undefined;
  const title = typeof data?.title === "string" ? data.title : undefined;
  if (!selectionId || !title) {
    return failureResult({
      operation: "go-force.selection.confirm",
      error: new Error("The selection commit returned no confirmation."),
      message: "The selected game could not be confirmed. Please refresh the session.",
      context: { sessionId, gameId },
    });
  }

  await publishGoForceSessionUpdate(sessionId);
  revalidateSession(sessionId);
  return {
    selectionId,
    gameId,
    title,
    success: `${title} is up for a vote.`,
  };
}

export async function submitGoForceGameVote(
  _state: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to vote." };
  const parsed = parseGameVoteForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your vote." };

  const supabase = await createClient();
  const { data: selection, error: selectionError } = await supabase
    .from("go_force_selections")
    .select("round_id")
    .eq("id", parsed.data.selectionId)
    .maybeSingle();
  if (selectionError) {
    reportFailure({
      operation: "go-force.vote.lookup-selection",
      error: selectionError,
      context: { selectionId: parsed.data.selectionId },
    });
  }
  const { data: round, error: roundError } = selection
    ? await supabase
        .from("go_force_rounds")
        .select("session_id")
        .eq("id", selection.round_id)
        .maybeSingle()
    : { data: null, error: null };
  if (roundError) {
    reportFailure({
      operation: "go-force.vote.lookup-round",
      error: roundError,
      context: { selectionId: parsed.data.selectionId },
    });
  }
  const sessionId = round?.session_id ?? null;

  const { error } = await supabase.rpc("go_force_submit_game_vote", {
    target_selection: parsed.data.selectionId,
    vote_choice: parsed.data.choice,
  });
  if (error) {
    return withKnownGoForceFailure(error, "go-force.vote.game", VOTE_FALLBACK);
  }

  if (sessionId) {
    await publishGoForceSessionUpdate(sessionId);
    revalidateSession(sessionId);
  }
  return {
    selectionId: parsed.data.selectionId,
    success: parsed.data.choice === "go" ? "Go vote recorded." : "No-go vote recorded.",
  };
}

export async function closeGoForceSelection(
  _state: GameActionState,
  formData: FormData,
): Promise<GameActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to close this selection." };
  const selectionId = String(formData.get("selectionId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!selectionId || !sessionId) return { error: "Choose a game selection to close." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("go_force_close_selection", {
    target_selection: selectionId,
  });
  if (error) {
    return withKnownGoForceFailure(error, "go-force.selection.close", CLOSE_FALLBACK, { sessionId });
  }

  await publishGoForceSessionUpdate(sessionId);
  revalidateSession(sessionId);
  const goVotes = typeof data?.goVotes === "number" ? data.goVotes : 0;
  return {
    success:
      data?.outcome === "advanced"
        ? `Voting closed. The game advances with ${goVotes} go vote${goVotes === 1 ? "" : "s"}.`
        : "Voting closed. The game is eliminated.",
  };
}

export async function expireGoForceSelection(selectionId: string): Promise<{ closed: boolean }> {
  const session = await getVerifiedSession();
  if (
    !session ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectionId)
  ) {
    return { closed: false };
  }

  const supabase = await createClient();
  const { data: selection, error: selectionError } = await supabase
    .from("go_force_selections")
    .select("round_id")
    .eq("id", selectionId)
    .maybeSingle();
  if (selectionError) {
    reportFailure({
      operation: "go-force.selection.expire-lookup",
      error: selectionError,
      context: { selectionId },
    });
  }
  if (!selection) return { closed: false };
  const { data: round, error: roundError } = await supabase
    .from("go_force_rounds")
    .select("session_id")
    .eq("id", selection.round_id)
    .maybeSingle();
  if (roundError) {
    reportFailure({
      operation: "go-force.selection.expire-lookup",
      error: roundError,
      context: { selectionId },
    });
  }
  const sessionId = round?.session_id;
  if (!sessionId) return { closed: false };

  const { data, error } = await supabase.rpc("go_force_expire_selection", {
    target_selection: selectionId,
  });
  if (error) {
    reportFailure({
      operation: "go-force.selection.expire",
      error,
      context: { selectionId, sessionId },
    });
    return { closed: false };
  }
  if (data?.closed !== true) return { closed: false };

  await publishGoForceSessionUpdate(sessionId);
  revalidateSession(sessionId);
  return { closed: true };
}
