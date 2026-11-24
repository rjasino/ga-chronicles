import { describe, expect, it } from "vitest";
import { buildRoundAdvancementSummaries } from "@/features/go-force/round-advancement-summary";
import type { GameVote, GoForceRound, SelectionWithVotes } from "@/features/go-force/types";

const sessionId = "40000000-0000-4000-8000-000000000101";
const roundOneId = "42000000-0000-4000-8000-000000000101";
const roundTwoId = "42000000-0000-4000-8000-000000000102";
const time = "2026-11-24T12:00:00.000Z";

function makeRound(
  id: string,
  round_number: 1 | 2 | 3,
  status: GoForceRound["status"],
): GoForceRound {
  return {
    id,
    session_id: sessionId,
    round_number,
    status,
    go_limit: 4 - round_number,
    started_at: time,
    ended_at: status === "complete" ? time : null,
    created_at: time,
  };
}

function makeVote(
  id: string,
  selectionId: string,
  accountId: string,
  choice: GameVote["choice"],
  submitted: boolean,
): GameVote {
  return {
    id,
    selection_id: selectionId,
    participant_account_id: accountId,
    choice,
    submitted_at: submitted ? time : null,
    closed_at: time,
    created_at: time,
  };
}

function makeSelection({
  id,
  round,
  order,
  title,
  closed = true,
  outcome,
  votes,
}: {
  id: string;
  round: GoForceRound;
  order: number;
  title: string;
  closed?: boolean;
  outcome: SelectionWithVotes["advancement_outcome"];
  votes: GameVote[];
}): SelectionWithVotes {
  const gameId = `60000000-0000-4000-8000-${String(order).padStart(12, "0")}`;
  return {
    id,
    round_id: round.id,
    session_game_id: gameId,
    selection_order: order,
    selected_at: time,
    voting_deadline_at: time,
    voting_closed_at: closed ? time : null,
    advancement_outcome: outcome,
    round,
    game: {
      id: gameId,
      session_id: sessionId,
      annual_game_id: null,
      title_snapshot: title,
      developer_snapshot: null,
      publisher_snapshot: null,
      genre_snapshot: null,
      cover_art_url_snapshot: null,
      source_year: 2090,
      display_order: order,
      created_at: time,
    },
    votes,
  };
}

describe("buildRoundAdvancementSummaries", () => {
  it("returns the latest completed round and current provisional round with accurate submitted go totals", () => {
    const roundOne = makeRound(roundOneId, 1, "complete");
    const roundTwo = makeRound(roundTwoId, 2, "active");
    const selected = makeSelection({
      id: "43000000-0000-4000-8000-000000000101",
      round: roundOne,
      order: 1,
      title: "Advanced Game",
      outcome: "advanced",
      votes: [
        makeVote("vote-1", "selection-1", "player-1", "go", true),
        makeVote("vote-2", "selection-1", "player-2", "go", true),
        makeVote("vote-3", "selection-1", "player-3", "no-go", true),
      ],
    });
    const eliminated = makeSelection({
      id: "43000000-0000-4000-8000-000000000102",
      round: roundOne,
      order: 2,
      title: "Eliminated Game",
      outcome: "eliminated",
      votes: [makeVote("vote-4", "selection-2", "player-1", "no-go", true)],
    });
    const currentAdvanced = makeSelection({
      id: "43000000-0000-4000-8000-000000000103",
      round: roundTwo,
      order: 1,
      title: "Current Round Advance",
      outcome: "advanced",
      votes: [makeVote("vote-5", "selection-3", "player-1", "go", true)],
    });
    const currentOpen = makeSelection({
      id: "43000000-0000-4000-8000-000000000104",
      round: roundTwo,
      order: 2,
      title: "Still Voting",
      closed: false,
      outcome: "pending",
      votes: [makeVote("vote-6", "selection-4", "player-2", "go", true)],
    });

    const summaries = buildRoundAdvancementSummaries(
      [roundOne, roundTwo],
      [selected, eliminated, currentAdvanced, currentOpen],
    );

    expect(summaries).toEqual([
      {
        roundNumber: 1,
        status: "complete",
        games: [{ gameId: selected.session_game_id, title: "Advanced Game", goVotes: 2 }],
      },
      {
        roundNumber: 2,
        status: "active",
        games: [
          { gameId: currentAdvanced.session_game_id, title: "Current Round Advance", goVotes: 1 },
        ],
      },
    ]);
  });

  it("keeps an explicit empty summary when a completed round has no advancing games", () => {
    const round = makeRound(roundOneId, 1, "complete");
    const selection = makeSelection({
      id: "43000000-0000-4000-8000-000000000105",
      round,
      order: 1,
      title: "No Go Game",
      outcome: "eliminated",
      votes: [makeVote("vote-7", "selection-5", "player-1", "no-go", true)],
    });

    expect(buildRoundAdvancementSummaries([round], [selection])).toEqual([
      { roundNumber: 1, status: "complete", games: [] },
    ]);
  });
});
