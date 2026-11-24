import type {
  GoForceRound,
  RoundAdvancementSummary,
  SelectionWithVotes,
} from "@/features/go-force/types";

export function buildRoundAdvancementSummaries(
  rounds: GoForceRound[],
  selections: SelectionWithVotes[],
): RoundAdvancementSummary[] {
  const activeRound = rounds.find((round) => round.status === "active") ?? null;
  const latestCompletedRound =
    [...rounds]
      .filter((round) => round.status === "complete")
      .sort((left, right) => right.round_number - left.round_number)[0] ?? null;

  const displayedRounds = [
    ...(latestCompletedRound ? [latestCompletedRound] : []),
    ...(activeRound && activeRound.id !== latestCompletedRound?.id ? [activeRound] : []),
  ];

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
          goVotes: selection.votes.filter(
            (vote) => vote.choice === "go" && vote.submitted_at !== null,
          ).length,
        }))
        .filter((game) => game.goVotes > 0),
    };
  });
}
