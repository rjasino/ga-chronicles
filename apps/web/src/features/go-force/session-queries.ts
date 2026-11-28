import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/session";
import { reportFailure } from "@/lib/error-logging";
import { finalistVoteTotals } from "@/features/go-force/rules";
import { buildPlayerGoVoteQuotas } from "@/features/go-force/player-go-vote-quotas";
import { buildRoundAdvancementSummaries } from "@/features/go-force/round-advancement-summary";
import type {
  ActiveGoForceAccountOption,
  FacilitatorSessionView,
  FinalBallotVote,
  FinalistWithTitle,
  GameSelection,
  GameVote,
  GoForceRound,
  GOTYResult,
  PlayerSessionView,
  SessionGameSnapshot,
  SessionParticipant,
  SessionView,
  GoForceSession,
  SelectionWithVotes,
} from "@/features/go-force/types";

const PAGE_SIZE = 1000;
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getActiveGoForceAccountOptions(
  sessionId: string,
): Promise<{ accounts: ActiveGoForceAccountOption[]; canAdd: boolean }> {
  if (!SESSION_ID_PATTERN.test(sessionId)) return { accounts: [], canAdd: false };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("go_force_active_account_options", {
    target_session: sessionId,
  });
  if (error?.message.includes("BALLOT_CLOSED") || error?.message.includes("SESSION_NOT_ACTIVE")) {
    return { accounts: [], canAdd: false };
  }
  if (error) {
    reportFailure({
      operation: "go-force.session.addable-account-options",
      error,
      context: { sessionId },
    });
    return { accounts: [], canAdd: false };
  }

  return { accounts: (data ?? []) as ActiveGoForceAccountOption[], canAdd: true };
}

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown | null }>,
  errorMessage: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(errorMessage, { cause: error });
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function roundPoolGameIds(
  roundNumber: number,
  games: SessionGameSnapshot[],
  rounds: GoForceRound[],
  selections: GameSelection[],
): Set<string> {
  if (roundNumber === 1) return new Set(games.map((game) => game.id));
  const priorRound = rounds.find((round) => round.round_number === roundNumber - 1);
  if (!priorRound) return new Set();
  return new Set(
    selections
      .filter(
        (selection) =>
          selection.round_id === priorRound.id && selection.advancement_outcome === "advanced",
      )
      .map((selection) => selection.session_game_id),
  );
}

function withSelections(
  selections: GameSelection[],
  rounds: GoForceRound[],
  games: SessionGameSnapshot[],
  votes: GameVote[],
): SelectionWithVotes[] {
  const roundsById = new Map(rounds.map((round) => [round.id, round]));
  const gamesById = new Map(games.map((game) => [game.id, game]));
  return selections.map((selection) => ({
    ...selection,
    round: roundsById.get(selection.round_id) ?? null,
    game: gamesById.get(selection.session_game_id) ?? null,
    votes: votes.filter((vote) => vote.selection_id === selection.id),
  }));
}

function finalistsFrom(
  selections: SelectionWithVotes[],
  rounds: GoForceRound[],
  finalBallotVotes: FinalBallotVote[],
): FinalistWithTitle[] {
  const roundThree = rounds.find((round) => round.round_number === 3);
  if (!roundThree) return [];
  const finalists = selections
    .filter(
      (selection) =>
        selection.round_id === roundThree.id && selection.advancement_outcome === "advanced",
    )
    .map((selection) => ({
      gameId: selection.session_game_id,
      title: selection.game?.title_snapshot ?? "Unknown game",
      developer: selection.game?.developer_snapshot ?? null,
      publisher: selection.game?.publisher_snapshot ?? null,
      genre: selection.game?.genre_snapshot ?? null,
      coverArtUrl: selection.game?.cover_art_url_snapshot ?? null,
    }));
  const tally = finalBallotVotes.reduce<Record<string, number>>((counts, vote) => {
    if (!vote.submitted_at || !vote.finalist_game_id) return counts;
    counts[vote.finalist_game_id] = (counts[vote.finalist_game_id] ?? 0) + 1;
    return counts;
  }, {});
  return finalistVoteTotals(finalists, tally);
}

export function finalistsForView(view: SessionView): FinalistWithTitle[] {
  return finalistsFrom(view.selections, view.rounds, view.finalBallotVotes);
}

export async function getSessionView(sessionId: string): Promise<SessionView | null> {
  if (!SESSION_ID_PATTERN.test(sessionId)) return null;
  const supabase = await createClient();
  const { data: session, error } = await supabase
    .from("go_force_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error("Could not load this Go Force session.", { cause: error });
  if (!session) return null;

  const shouldLoadFinalBallotVotes =
    session.status === "final_ballot" || session.status === "complete";
  const shouldLoadResult = session.status === "complete";

  const [
    { data: participants },
    { data: games },
    { data: rounds },
    { data: finalBallotVotes },
    { data: result },
  ] = await Promise.all([
    supabase
      .from("go_force_session_participants")
      .select("*")
      .eq("session_id", sessionId)
      .order("roster_order", { ascending: true }),
    supabase
      .from("go_force_session_games")
      .select("*")
      .eq("session_id", sessionId)
      .order("display_order", { ascending: true }),
    supabase
      .from("go_force_rounds")
      .select("id,session_id,round_number,status,go_limit,started_at,ended_at,created_at")
      .eq("session_id", sessionId)
      .order("round_number", { ascending: true }),
    shouldLoadFinalBallotVotes
      ? supabase.from("go_force_final_ballot_votes").select("*").eq("session_id", sessionId)
      : Promise.resolve({ data: [] as FinalBallotVote[], error: null }),
    shouldLoadResult
      ? supabase.from("go_force_results").select("*").eq("session_id", sessionId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const roundRows = (rounds ?? []) as GoForceRound[];
  const roundIds = roundRows.map((round) => round.id);
  const sessionSelections = roundIds.length
    ? await fetchAllPages<GameSelection>(
        (from, to) =>
          supabase
            .from("go_force_selections")
            .select("*")
            .in("round_id", roundIds)
            .order("selection_order", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to),
        "Could not load Go Force selections.",
      )
    : [];
  const selectionIds = sessionSelections.map((selection) => selection.id);
  const votes: GameVote[] = [];
  for (let start = 0; start < selectionIds.length; start += PAGE_SIZE) {
    const selectionIdBatch = selectionIds.slice(start, start + PAGE_SIZE);
    votes.push(
      ...(await fetchAllPages<GameVote>(
        (from, to) =>
          supabase
            .from("go_force_game_votes")
            .select("*")
            .in("selection_id", selectionIdBatch)
            .order("id", { ascending: true })
            .range(from, to),
        "Could not load Go Force votes.",
      )),
    );
  }

  return {
    session: session as GoForceSession,
    participants: (participants ?? []) as SessionParticipant[],
    games: (games ?? []) as SessionGameSnapshot[],
    rounds: roundRows,
    selections: withSelections(
      sessionSelections,
      roundRows,
      (games ?? []) as SessionGameSnapshot[],
      votes,
    ),
    finalBallotVotes: (finalBallotVotes ?? []) as FinalBallotVote[],
    result: (result as GOTYResult | null) ?? null,
  };
}

export async function getFacilitatorSessionView(
  sessionId: string,
): Promise<FacilitatorSessionView | null> {
  const view = await getSessionView(sessionId);
  if (!view) return null;

  const account = await getVerifiedSession();
  const canManageSession = Boolean(
    account && (account.roles.includes("admin") || account.userId === view.session.game_master_id),
  );
  const currentRound = view.rounds.find((round) => round.status === "active") ?? null;
  const currentRoundSelections = currentRound
    ? view.selections.filter((selection) => selection.round_id === currentRound.id)
    : [];
  const currentSelection =
    currentRoundSelections.find((selection) => selection.voting_closed_at === null) ?? null;
  const closingSelection =
    !currentSelection && currentRoundSelections.length
      ? currentRoundSelections[currentRoundSelections.length - 1]
      : null;
  const pool = currentRound
    ? roundPoolGameIds(currentRound.round_number, view.games, view.rounds, view.selections)
    : new Set<string>();
  const selectedGameIds = new Set(
    currentRoundSelections.map((selection) => selection.session_game_id),
  );
  const remainingGames = view.games.filter(
    (game) => pool.has(game.id) && !selectedGameIds.has(game.id),
  );

  const roundThree = view.rounds.find((round) => round.round_number === 3);
  const roundThreeGoCounts = roundThree
    ? view.selections
        .filter((selection) => selection.round_id === roundThree.id)
        .flatMap((selection) => selection.votes)
        .filter((vote) => vote.choice === "go" && vote.submitted_at)
        .reduce<Record<string, number>>((counts, vote) => {
          counts[vote.participant_account_id] = (counts[vote.participant_account_id] ?? 0) + 1;
          return counts;
        }, {})
    : {};
  let minimumRoundThreeGoVoters = 2;
  if (currentRound?.round_number === 3) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("go_force_page_settings")
      .select("minimum_round_three_go_voters")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error("Could not load the Round 3 Go-vote minimum.", { cause: error });
    minimumRoundThreeGoVoters = data?.minimum_round_three_go_voters ?? 2;
  }

  let selectionProgress: FacilitatorSessionView["selectionProgress"] = null;
  let finalBallotProgress: FacilitatorSessionView["finalBallotProgress"] = null;
  if (canManageSession && (currentSelection || view.session.status === "final_ballot")) {
    const supabase = await createClient();
    if (currentSelection) {
      const { data, error } = await supabase.rpc("go_force_selection_progress", {
        target_selection: currentSelection.id,
      });
      if (error) throw new Error("Could not load current vote progress.", { cause: error });
      selectionProgress = (data as FacilitatorSessionView["selectionProgress"]) ?? null;
    }
    if (view.session.status === "final_ballot") {
      const { data, error } = await supabase.rpc("go_force_final_ballot_progress", {
        target_session: view.session.id,
      });
      if (error) throw new Error("Could not load final-ballot progress.", { cause: error });
      finalBallotProgress = (data as FacilitatorSessionView["finalBallotProgress"]) ?? null;
    }
  }

  return {
    ...view,
    currentRound,
    currentSelection,
    closingSelection,
    remainingGames,
    selectionProgress,
    finalBallotProgress,
    roundAdvancementSummaries: buildRoundAdvancementSummaries(view.rounds, view.selections),
    finalists: finalistsFrom(view.selections, view.rounds, view.finalBallotVotes),
    ballotSubmittedCount: finalBallotProgress?.submitted ?? 0,
    roundThreeGoCounts,
    minimumRoundThreeGoVoters,
  };
}

export async function getPlayerSessionView(
  sessionId: string,
  userId: string,
): Promise<PlayerSessionView | null> {
  const view = await getSessionView(sessionId);
  if (!view) return null;

  const participant =
    view.participants.find((row) => row.account_id === userId && row.active) ?? null;
  const currentRound = view.rounds.find((round) => round.status === "active") ?? null;
  const currentSelection = currentRound
    ? (view.selections.find(
        (selection) =>
          selection.round_id === currentRound.id && selection.voting_closed_at === null,
      ) ?? null)
    : null;
  const ownVote = currentSelection
    ? (currentSelection.votes.find((vote) => vote.participant_account_id === userId) ?? null)
    : null;
  const closedSelectionSummaries: PlayerSessionView["closedSelectionSummaries"] = {};
  if (participant && view.selections.some((selection) => selection.voting_closed_at !== null)) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("go_force_closed_selection_summaries", {
      target_session: sessionId,
    });
    if (error) {
      throw new Error("Could not load closed game result summaries.", { cause: error });
    }
    for (const { selectionId, ...summary } of (data ?? []) as Array<
      NonNullable<PlayerSessionView["closedSelectionSummaries"][string]> & { selectionId: string }
    >) {
      closedSelectionSummaries[selectionId] = summary;
    }
  }
  const goVotesUsedInRound = currentRound
    ? view.selections
        .filter((selection) => selection.round_id === currentRound.id)
        .flatMap((selection) => selection.votes)
        .filter(
          (vote) =>
            vote.participant_account_id === userId && vote.choice === "go" && vote.submitted_at,
        ).length
    : 0;

  return {
    ...view,
    participant,
    currentRound,
    currentSelection,
    ownVote,
    ownFinalBallotVote:
      view.finalBallotVotes.find((vote) => vote.participant_account_id === userId) ?? null,
    goVotesUsedInRound,
    goVoteQuotas: participant ? buildPlayerGoVoteQuotas(userId, view.rounds, view.selections) : [],
    roundAdvancementSummaries: buildRoundAdvancementSummaries(
      view.rounds,
      view.selections,
      closedSelectionSummaries,
    ),
    closedSelectionSummaries,
    finalists: finalistsFrom(view.selections, view.rounds, view.finalBallotVotes),
  };
}
