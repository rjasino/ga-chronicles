import { describe, expect, it } from "vitest";
import {
  ballotCloseStatus,
  canSpendGo,
  completionPercentage,
  expectedVoteOpportunities,
  finalistsFromRoundThree,
  gameAdvances,
  goLimitForRound,
  meetsCompletionThreshold,
  remainingGoVotes,
  roundCompletionStatus,
  roundIsComplete,
  roundPoolSize,
  tallyFinalBallot,
  votesWithAbstentions,
  winnersFromTally,
} from "@/features/go-force/rules";

describe("Go Force round quotas", () => {
  it("limits go votes to 3, 2, and 1 by round", () => {
    expect(goLimitForRound(1)).toBe(3);
    expect(goLimitForRound(2)).toBe(2);
    expect(goLimitForRound(3)).toBe(1);
    expect(remainingGoVotes(1, 2)).toBe(1);
    expect(remainingGoVotes(2, 3)).toBe(0);
    expect(canSpendGo(3, 0)).toBe(true);
    expect(canSpendGo(3, 1)).toBe(false);
  });

  it("rejects an unknown round", () => {
    expect(() => goLimitForRound(4)).toThrow(/Unknown Go Force round/);
  });
});

describe("Go Force advancement and round completion", () => {
  it("advances only games with at least one go vote", () => {
    expect(gameAdvances(0)).toBe(false);
    expect(gameAdvances(1)).toBe(true);
    expect(finalistsFromRoundThree([
      { gameId: "a", goVotes: 1 },
      { gameId: "b", goVotes: 0 },
      { gameId: "c", goVotes: 2 },
    ])).toEqual(["a", "c"]);
  });

  it("ends a round only after every pool game is selected", () => {
    expect(roundPoolSize(1, 8, 0)).toBe(8);
    expect(roundPoolSize(2, 8, 3)).toBe(3);
    expect(roundPoolSize(3, 8, 2)).toBe(2);
    expect(roundIsComplete(3, 2)).toBe(false);
    expect(roundIsComplete(3, 3)).toBe(true);
  });

  it("forfeits unused go allowances and opens the next round", () => {
    expect(roundCompletionStatus(1, 3, 0)).toEqual({ status: "live", nextRound: 2 });
    expect(roundCompletionStatus(2, 2, 0)).toEqual({ status: "live", nextRound: 3 });
    expect(roundCompletionStatus(3, 1, 2)).toEqual({ status: "final_ballot", nextRound: null });
  });

  it("stops with no result when no game advances from round 1 or 2", () => {
    expect(roundCompletionStatus(1, 0, 0)).toEqual({ status: "stopped_no_finalists", nextRound: null });
    expect(roundCompletionStatus(2, 0, 0)).toEqual({ status: "stopped_no_finalists", nextRound: null });
  });

  it("requires the configured minimum number of round 3 go voters", () => {
    expect(roundCompletionStatus(3, 2, 1)).toEqual({
      status: "incomplete_vote_threshold",
      nextRound: null,
    });
    expect(roundCompletionStatus(3, 2, 2, 3)).toEqual({
      status: "incomplete_vote_threshold",
      nextRound: null,
    });
  });
});

describe("Go Force abstentions and completion", () => {
  it("turns missing player votes into abstentions at close", () => {
    expect(votesWithAbstentions(["a", "b", "c"], [
      { participantId: "a", choice: "go" },
      { participantId: "c", choice: "no-go" },
    ])).toEqual([
      { participantId: "a", choice: "go" },
      { participantId: "b", choice: "abstain" },
      { participantId: "c", choice: "no-go" },
    ]);
  });

  it("counts game votes and one final ballot per participant", () => {
    expect(expectedVoteOpportunities(4, 6)).toEqual({ gameVotes: 24, finalBallot: 4, total: 28 });
    expect(completionPercentage(28, 28)).toBe(100);
    expect(completionPercentage(22, 28)).toBe(78.57);
    expect(meetsCompletionThreshold(23, 28, true)).toBe(true);
    expect(meetsCompletionThreshold(22, 28, true)).toBe(false);
    expect(meetsCompletionThreshold(28, 28, false)).toBe(false);
  });

  it("marks a below-threshold or incomplete-go session as incomplete", () => {
    expect(ballotCloseStatus(28, 28, true, 1)).toBe("complete");
    expect(ballotCloseStatus(21, 28, true, 1)).toBe("incomplete_vote_threshold");
    expect(ballotCloseStatus(28, 28, false, 1)).toBe("incomplete_vote_threshold");
    expect(ballotCloseStatus(28, 28, true, 0)).toBe("incomplete_vote_threshold");
  });
});

describe("Go Force final ballot winners", () => {
  it("ignores abstentions and tallies submitted finalists", () => {
    const tally = tallyFinalBallot([
      { finalistGameId: "a", submitted: true },
      { finalistGameId: "b", submitted: true },
      { finalistGameId: "a", submitted: true },
      { finalistGameId: null, submitted: false },
    ]);
    expect(tally).toEqual({ a: 2, b: 1 });
  });

  it("declares every top-vote tie a co-winner", () => {
    expect(winnersFromTally({ a: 2, b: 2, c: 1 }).sort()).toEqual(["a", "b"]);
    expect(winnersFromTally({ a: 1, b: 0 })).toEqual(["a"]);
    expect(winnersFromTally({})).toEqual([]);
  });
});
