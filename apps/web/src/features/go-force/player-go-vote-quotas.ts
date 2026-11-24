import {
  GO_FORCE_ROUND_NUMBERS,
  type GoForceRound,
  type GoVoteQuotaUsage,
  type SelectionWithVotes,
} from "@/features/go-force/types";
import { goLimitForRound } from "@/features/go-force/rules";

export function buildPlayerGoVoteQuotas(
  participantId: string,
  rounds: GoForceRound[],
  selections: SelectionWithVotes[],
): GoVoteQuotaUsage[] {
  const roundIds = new Map(rounds.map((round) => [round.id, round.round_number]));

  return GO_FORCE_ROUND_NUMBERS.map((roundNumber) => {
    const used = selections
      .filter((selection) => roundIds.get(selection.round_id) === roundNumber)
      .flatMap((selection) => selection.votes)
      .filter(
        (vote) =>
          vote.participant_account_id === participantId &&
          vote.choice === "go" &&
          vote.submitted_at !== null,
      ).length;
    const limit = goLimitForRound(roundNumber);

    return {
      roundNumber,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      started: rounds.some((round) => round.round_number === roundNumber),
    };
  });
}
