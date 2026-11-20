"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/session";
import { goForceErrorMessage } from "@/features/go-force/messages";
import { publishGoForceSessionUpdate } from "@/features/go-force/realtime-broadcast";
import { parseFinalBallotForm } from "@/features/go-force/schemas";

export type BallotActionState = { error?: string; success?: string };

function revalidateSession(sessionId: string) {
  revalidatePath("/go-force");
  revalidatePath("/admin/go-force");
  revalidatePath(`/admin/go-force/sessions/${sessionId}`);
  revalidatePath(`/go-force/session/${sessionId}`);
  revalidatePath(`/go-force/results/${sessionId}`);
}

export async function submitGoForceFinalBallot(_state: BallotActionState, formData: FormData): Promise<BallotActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to submit a final ballot." };
  const parsed = parseFinalBallotForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your ballot." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("go_force_submit_final_ballot", {
    target_session: parsed.data.sessionId,
    target_game: parsed.data.finalistGameId,
    target_remark: parsed.data.remark,
  });
  if (error) return { error: goForceErrorMessage(error, "Your final ballot could not be submitted.") };

  await publishGoForceSessionUpdate(parsed.data.sessionId);
  revalidateSession(parsed.data.sessionId);
  return { success: "Final ballot submitted." };
}

export async function closeGoForceFinalBallot(_state: BallotActionState, formData: FormData): Promise<BallotActionState> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in to close the final ballot." };
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return { error: "Choose a Go Force session." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("go_force_close_final_ballot", { target_session: sessionId });
  if (error) return { error: goForceErrorMessage(error, "The final ballot could not be closed.") };

  await publishGoForceSessionUpdate(sessionId);
  revalidateSession(sessionId);
  if (data?.status === "complete") {
    return { success: `Final ballot closed. Vote completion: ${data.completion}%. The GOTY result is ready for review.` };
  }
  return {
    success: `Final ballot closed at ${data?.completion ?? 0}% vote completion. This session does not meet the completion requirements, so no GOTY result was published.`,
  };
}
