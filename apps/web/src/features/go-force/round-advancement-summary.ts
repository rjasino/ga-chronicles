import type {
  ClosedSelectionSummary,
  GoForceRound,
  RoundAdvancementSummary,
  SelectionWithVotes,
} from "@/features/go-force/types";

export function buildRoundAdvancementSummaries(
  rounds: GoForceRound[],
  selections: SelectionWithVotes[],
  closedSelectionSummaries?: Record<string, ClosedSelectionSummary>,
): RoundAdvancementSummary[] {
  const displayedRounds = rounds
    .filter((round) => round.status === "complete" || round.status === "active")
    .sort((left, right) => left.round_number - right.round_number);

  return displayedRounds.map((round) => {
    const roundSelections = selections
      .filter(
        (selection) =>
          selection.round_id === round.id &&
          selection.voting_closed_at !== null &&
          selection.advancement_outcome === "advanced",
      )
      .sort((left, right) => left.selection_order - right.selection_order);

    return {
      roundNumber: round.round_number,
      status: round.status as "active" | "complete",
      games: roundSelections
        .map((selection) => ({
          gameId: selection.session_game_id,
          title: selection.game?.title_snapshot ?? "Unknown game",
          goVotes:
            closedSelectionSummaries?.[selection.id]?.goVotes ??
            selection.votes.filter((vote) => vote.choice === "go" && vote.submitted_at !== null)
              .length,
        }))
        .filter((game) => game.goVotes > 0),
    };
  });
}
