"use server";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/session";
import { failureResult, reportFailure } from "@/lib/error-logging";
import { withKnownGoForceFailure } from "@/features/go-force/action-failures";
import { publishGoForceSessionUpdate } from "@/features/go-force/realtime-broadcast";
import { parseFinalBallotForm } from "@/features/go-force/schemas";

export type BallotActionState = { error?: string; errorId?: string; success?: string };

export async function submitGoForceFinalBallot(
  _state: BallotActionState,
  formData: FormData,
): Promise<BallotActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to submit a final ballot." };
  const parsed = parseFinalBallotForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your ballot." };

  const supabase = await createClient();
  const { data: target, error: lookupError } = await supabase
    .from("go_force_sessions")
    .select("id")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (lookupError) {
    return failureResult({
      operation: "go-force.ballot.lookup-session",
      error: lookupError,
      message: "The Go Force session could not be loaded. Please retry.",
      context: { sessionId: parsed.data.sessionId },
    });
  }
  if (!target) return { error: "That Go Force session could not be found." };
  const sessionId = target.id;

  const { error } = await supabase.rpc("go_force_submit_final_ballot", {
    target_session: sessionId,
    target_game: parsed.data.finalistGameId,
    target_remark: parsed.data.remark,
  });
  if (error) {
    return withKnownGoForceFailure(
      error,
      "go-force.ballot.submit",
      "Your final ballot could not be submitted.",
      { sessionId },
    );
  }

  await publishGoForceSessionUpdate(sessionId);
  return { success: "Final ballot submitted." };
}

export async function closeGoForceFinalBallot(
  _state: BallotActionState,
  formData: FormData,
): Promise<BallotActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to close the final ballot." };
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return { error: "Choose a Go Force session." };

  const supabase = await createClient();
  const { data: target, error: lookupError } = await supabase
    .from("go_force_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();
  if (lookupError) {
    return failureResult({
      operation: "go-force.ballot.lookup-session",
      error: lookupError,
      message: "The Go Force session could not be loaded. Please retry.",
      context: { sessionId },
    });
  }
  if (!target) return { error: "That Go Force session could not be found." };
  const resolvedSessionId = target.id;

  const { data, error } = await supabase.rpc("go_force_close_final_ballot", {
    target_session: resolvedSessionId,
  });
  if (error) {
    return withKnownGoForceFailure(
      error,
      "go-force.ballot.close",
      "The final ballot could not be closed.",
      { sessionId: resolvedSessionId },
    );
  }

  await publishGoForceSessionUpdate(resolvedSessionId);
  if (data?.status === "complete") {
    return {
      success: `Final ballot closed. Vote completion: ${data.completion}%. The GOTY result is ready for review.`,
    };
  }
  return {
    success: `Final ballot closed at ${data?.completion ?? 0}% vote completion. This session does not meet the completion requirements, so no GOTY result was published.`,
  };
}

export async function expireGoForceFinalBallot(sessionId: string): Promise<{ closed: boolean }> {
  const session = await getVerifiedSession();
  if (
    !session ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)
  ) {
    return { closed: false };
  }

  const supabase = await createClient();
  const { data: target, error: lookupError } = await supabase
    .from("go_force_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();
  if (lookupError) {
    reportFailure({
      operation: "go-force.ballot.expire-lookup",
      error: lookupError,
      context: { sessionId },
    });
    return { closed: false };
  }
  if (!target) return { closed: false };
  const resolvedSessionId = target.id;

  const { data, error } = await supabase.rpc("go_force_expire_final_ballot", {
    target_session: resolvedSessionId,
  });
  if (error) {
    reportFailure({
      operation: "go-force.ballot.expire",
      error,
      context: { sessionId: resolvedSessionId },
    });
    return { closed: false };
  }
  if (data?.closed !== true) return { closed: false };

  await publishGoForceSessionUpdate(resolvedSessionId);
  return { closed: true };
}
