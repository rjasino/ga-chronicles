import type { GoForceSessionStatus, GoForceVoteChoice, GoForceRoundNumber } from "@/features/go-force/types";

const GO_LIMITS: Record<GoForceRoundNumber, number> = { 1: 3, 2: 2, 3: 1 };
const COMPLETION_THRESHOLD = 80;

export function goLimitForRound(round: number): number {
  if (round === 1 || round === 2 || round === 3) return GO_LIMITS[round];
  throw new Error(`Unknown Go Force round: ${round}`);
}

export function remainingGoVotes(round: number, usedGo: number): number {
  return Math.max(0, goLimitForRound(round) - Math.max(0, usedGo));
}

export function canSpendGo(round: number, usedGo: number): boolean {
  return remainingGoVotes(round, usedGo) > 0;
}

export function gameAdvances(goVotes: number): boolean {
  return goVotes > 0;
}

export function roundPoolSize(round: number, sessionGameCount: number, priorRoundAdvancedCount: number): number {
  return round === 1 ? sessionGameCount : priorRoundAdvancedCount;
}

export function roundIsComplete(poolSize: number, selectedCount: number): boolean {
  return poolSize > 0 && selectedCount >= poolSize;
}

export type RoundCompletionStatus =
  | { status: "live"; nextRound: GoForceRoundNumber }
  | { status: "stopped_no_finalists"; nextRound: null }
  | { status: "final_ballot"; nextRound: null }
  | { status: "incomplete_vote_threshold"; nextRound: null };

/**
 * Applies the round-end rules. A round with no advancing game stops the session;
 * Round 3 ends in the final ballot only when every active player spent their go.
 */
export function roundCompletionStatus(
  roundNumber: number,
  advancedCount: number,
  missingRoundThreeGo: number,
): RoundCompletionStatus {
  if (advancedCount <= 0) return { status: "stopped_no_finalists", nextRound: null };
  if (roundNumber === 1) return { status: "live", nextRound: 2 };
  if (roundNumber === 2) return { status: "live", nextRound: 3 };
  if (roundNumber === 3) {
    if (missingRoundThreeGo > 0) return { status: "incomplete_vote_threshold", nextRound: null };
    return { status: "final_ballot", nextRound: null };
  }
  return { status: "stopped_no_finalists", nextRound: null };
}

export function expectedVoteOpportunities(participantCount: number, selectionCount: number) {
  const roster = Math.max(0, participantCount);
  const selections = Math.max(0, selectionCount);
  const gameVotes = roster * selections;
  const finalBallot = roster;
  return { gameVotes, finalBallot, total: gameVotes + finalBallot };
}

export function completionPercentage(submitted: number, expected: number): number {
  if (expected <= 0) return 0;
  const clamped = Math.max(0, Math.min(submitted, expected));
  return Math.round((clamped / expected) * 10000) / 100;
}

export function meetsCompletionThreshold(
  submitted: number,
  expected: number,
  roundThreeGoComplete: boolean,
): boolean {
  return roundThreeGoComplete && completionPercentage(submitted, expected) >= COMPLETION_THRESHOLD;
}

export function ballotCloseStatus(
  submitted: number,
  expected: number,
  roundThreeGoComplete: boolean,
  winnerCount: number,
): GoForceSessionStatus {
  return meetsCompletionThreshold(submitted, expected, roundThreeGoComplete) && winnerCount > 0
    ? "complete"
    : "incomplete_vote_threshold";
}

export type CastVote = { participantId: string; choice: GoForceVoteChoice };

/** Missing player votes become abstentions at close rather than no-go votes. */
export function votesWithAbstentions(participantIds: readonly string[], castVotes: readonly CastVote[]): CastVote[] {
  const byParticipant = new Map(castVotes.map((vote) => [vote.participantId, vote]));
  return participantIds.map((participantId) => byParticipant.get(participantId) ?? { participantId, choice: "abstain" });
}

export function finalistsFromRoundThree(
  selections: readonly { gameId: string; goVotes: number }[],
): string[] {
  return selections.filter((selection) => gameAdvances(selection.goVotes)).map((selection) => selection.gameId);
}

export function tallyFinalBallot(
  votes: readonly { finalistGameId: string | null; submitted: boolean }[],
): Record<string, number> {
  return votes.reduce<Record<string, number>>((tally, vote) => {
    if (!vote.submitted || !vote.finalistGameId) return tally;
    tally[vote.finalistGameId] = (tally[vote.finalistGameId] ?? 0) + 1;
    return tally;
  }, {});
}

/** Every game tied for the highest final-ballot count is a co-winner. */
export function winnersFromTally(tally: Readonly<Record<string, number>>): string[] {
  const entries = Object.entries(tally);
  if (!entries.length) return [];
  const highest = Math.max(...entries.map(([, votes]) => votes));
  if (highest <= 0) return [];
  return entries.filter(([, votes]) => votes === highest).map(([gameId]) => gameId);
}

export function finalistVoteTotals<T extends { gameId: string; title: string }>(
  finalists: readonly T[],
  tally: Readonly<Record<string, number>>,
): (T & { votes: number })[] {
  return finalists.map((finalist) => ({
    ...finalist,
    votes: tally[finalist.gameId] ?? 0,
  }));
}
