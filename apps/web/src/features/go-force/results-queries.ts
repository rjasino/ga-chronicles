import { createClient } from "@/lib/supabase/server";
import { getSessionView, finalistsForView } from "@/features/go-force/session-queries";
import type { PublicResultsView } from "@/features/go-force/types";

export async function getPublishedResults(sessionId: string): Promise<PublicResultsView | null> {
  const view = await getSessionView(sessionId);
  if (!view) return null;
  if (view.session.status !== "complete" || !view.result?.results_visible) return null;

  const finalists = finalistsForView(view);
  const winners = view.result.winner_game_ids
    .map((gameId) => finalists.find((finalist) => finalist.gameId === gameId))
    .filter((finalist): finalist is NonNullable<typeof finalist> => Boolean(finalist));
  const roundThree = view.rounds.find((round) => round.round_number === 3);
  const roundThreeSelections = roundThree
    ? view.selections.filter((selection) => selection.round_id === roundThree.id)
    : [];

  return {
    ...view,
    finalists,
    winners,
    roundThreeSelections,
  };
}

export async function listPublishedResults(limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("go_force_results")
    .select("session_id,published_at,go_force_sessions(goty_year,completed_at)")
    .eq("results_visible", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load published Go Force results.", { cause: error });
  return (data ?? []).map((row) => {
    const session = Array.isArray(row.go_force_sessions) ? row.go_force_sessions[0] : row.go_force_sessions;
    return {
      sessionId: row.session_id as string,
      publishedAt: row.published_at as string | null,
      gotyYear: (session?.goty_year as number | undefined) ?? null,
      completedAt: (session?.completed_at as string | null | undefined) ?? null,
    };
  });
}
