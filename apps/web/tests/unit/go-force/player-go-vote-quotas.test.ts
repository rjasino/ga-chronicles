import { describe, expect, it } from "vitest";
import { buildPlayerGoVoteQuotas } from "@/features/go-force/player-go-vote-quotas";
import type { GoForceRound, SelectionWithVotes } from "@/features/go-force/types";

const participantId = "10000000-0000-4000-8000-000000000001";
const time = "2026-11-24T12:00:00.000Z";

function makeRound(id: string, round_number: 1 | 2): GoForceRound {
  return {
    id,
    session_id: "40000000-0000-4000-8000-000000000001",
    round_number,
    status: round_number === 1 ? "active" : "pending",
    go_limit: 4 - round_number,
    started_at: round_number === 1 ? time : null,
    ended_at: null,
    created_at: time,
  };
}

describe("buildPlayerGoVoteQuotas", () => {
  it("returns usage for started rounds and limits for future rounds", () => {
    const rounds = [makeRound("round-1", 1), makeRound("round-2", 2)];
    const selections: SelectionWithVotes[] = [
      {
        id: "selection-1",
        round_id: "round-1",
        session_game_id: "game-1",
        selection_order: 1,
        selected_at: time,
        voting_deadline_at: time,
        voting_closed_at: time,
        advancement_outcome: "advanced",
        round: rounds[0]!,
        game: null,
        votes: [
          {
            id: "vote-1",
            selection_id: "selection-1",
            participant_account_id: participantId,
            choice: "go",
            submitted_at: time,
            closed_at: time,
            created_at: time,
          },
          {
            id: "vote-2",
            selection_id: "selection-1",
            participant_account_id: "other-player",
            choice: "go",
            submitted_at: time,
            closed_at: time,
            created_at: time,
          },
        ],
      },
    ];

    expect(buildPlayerGoVoteQuotas(participantId, rounds, selections)).toEqual([
      { roundNumber: 1, limit: 3, used: 1, remaining: 2, started: true },
      { roundNumber: 2, limit: 2, used: 0, remaining: 2, started: true },
      { roundNumber: 3, limit: 1, used: 0, remaining: 1, started: false },
    ]);
  });
});
