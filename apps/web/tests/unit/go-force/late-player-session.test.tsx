import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LatePlayerForm } from "@/components/go-force/late-player-form";
import { PlayerSession } from "@/components/go-force/player-session";
import { VoteBreakdown } from "@/components/go-force/facilitator-session";
import type { PlayerSessionView, SelectionWithVotes } from "@/features/go-force/types";

vi.mock("@/features/go-force/session-actions", () => ({
  addGoForceParticipant: vi.fn(),
}));
vi.mock("@/features/go-force/game-actions", () => ({
  commitGoForceSelection: vi.fn(),
  closeGoForceSelection: vi.fn(),
  drawGoForceSelection: vi.fn(),
}));
vi.mock("@/features/go-force/ballot-actions", () => ({
  closeGoForceFinalBallot: vi.fn(),
}));
vi.mock("@/components/go-force/live-refresh", () => ({
  GoForceLiveRefresh: () => null,
}));

const now = "2026-11-24T12:00:00.000Z";
const sessionId = "40000000-0000-4000-8000-000000000101";
const readerId = "10000000-0000-4000-8000-000000000001";
const latePlayerId = "10000000-0000-4000-8000-000000000005";

const selection = {
  id: "43000000-0000-4000-8000-000000000101",
  round_id: "42000000-0000-4000-8000-000000000101",
  session_game_id: "41000000-0000-4000-8000-000000000101",
  selection_order: 1,
  selected_at: "2026-11-24T11:00:00.000Z",
  voting_deadline_at: "2026-11-24T11:05:00.000Z",
  voting_closed_at: "2026-11-24T11:03:00.000Z",
  advancement_outcome: "advanced",
  round: null,
  game: null,
  votes: [],
} satisfies SelectionWithVotes;

const playerView = {
  session: {
    id: sessionId,
    goty_year: 2090,
    game_master_id: "10000000-0000-4000-8000-000000000003",
    status: "live",
    wheel_fallback_enabled: false,
    started_at: now,
    final_ballot_deadline_at: null,
    completed_at: null,
    vote_completion_percentage: null,
    created_at: now,
    updated_at: now,
  },
  participants: [],
  games: [],
  rounds: [],
  selections: [],
  finalBallotVotes: [],
  result: null,
  participant: null,
  currentRound: null,
  currentSelection: null,
  ownVote: null,
  ownFinalBallotVote: null,
  goVotesUsedInRound: 0,
  goVoteQuotas: [],
  roundAdvancementSummaries: [],
  closedSelectionSummaries: {},
  finalists: [],
} satisfies PlayerSessionView;

describe("late player session controls", () => {
  afterEach(cleanup);

  it("offers active accounts through an accessible add-player form", () => {
    render(
      <LatePlayerForm
        sessionId={sessionId}
        accounts={[
          { id: latePlayerId, username: "localmulti", display_name: "Local Multi" },
          { id: readerId, username: "localreader", display_name: null },
        ]}
        participantCount={2}
      />,
    );

    expect(screen.getByLabelText("Player to add")).toBeVisible();
    expect(screen.getByRole("option", { name: "Local Multi (localmulti)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "localreader" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add player" })).toBeEnabled();
  });

  it("shows a useful message when the current account is not yet on the roster", () => {
    render(<PlayerSession data={playerView} />);

    expect(
      screen.getByRole("heading", { name: "You are not on this session roster" }),
    ).toBeVisible();
    expect(screen.getByText(/ask the game master or an admin to add you/i)).toBeVisible();
  });

  it("shows every round's quota and the advancement summary to a player", () => {
    const activePlayerView = {
      ...playerView,
      participant: {
        session_id: sessionId,
        account_id: readerId,
        display_name_snapshot: "Local Reader",
        roster_order: 1,
        active: true,
        created_at: now,
      },
      goVoteQuotas: [
        { roundNumber: 1 as const, limit: 3, used: 2, remaining: 1, started: true },
        { roundNumber: 2 as const, limit: 2, used: 0, remaining: 2, started: false },
        { roundNumber: 3 as const, limit: 1, used: 0, remaining: 1, started: false },
      ],
      roundAdvancementSummaries: [
        {
          roundNumber: 1 as const,
          status: "complete" as const,
          games: [{ gameId: "game-1", title: "Advanced Game", goVotes: 2 }],
        },
      ],
    } satisfies PlayerSessionView;

    render(<PlayerSession data={activePlayerView} />);

    expect(screen.getByRole("region", { name: "Go-vote quota by round" })).toHaveTextContent(
      "2 of 3 used · 1 remaining",
    );
    expect(screen.getByText(/Round 2/)).toHaveTextContent("Not started");
    expect(screen.getByText(/Round 3/)).toHaveTextContent("Not started");
    expect(screen.getByRole("heading", { name: "Round 1 · Confirmed" })).toBeVisible();
    expect(screen.getByText("Advanced Game")).toBeVisible();
  });

  it("color-codes the player's own submitted choice on their active vote screen", () => {
    const activeSelection = {
      ...selection,
      voting_deadline_at: null,
      voting_closed_at: null,
      advancement_outcome: "pending" as const,
    };
    const activePlayerView = {
      ...playerView,
      participant: {
        session_id: sessionId,
        account_id: readerId,
        display_name_snapshot: "Local Reader",
        roster_order: 1,
        active: true,
        created_at: now,
      },
      currentRound: {
        id: activeSelection.round_id,
        session_id: sessionId,
        round_number: 1 as const,
        status: "active" as const,
        go_limit: 3,
        started_at: now,
        ended_at: null,
        created_at: now,
      },
      currentSelection: activeSelection,
      ownVote: {
        id: "vote-1",
        selection_id: activeSelection.id,
        participant_account_id: readerId,
        choice: "no-go" as const,
        submitted_at: now,
        closed_at: null,
        created_at: now,
      },
    } satisfies PlayerSessionView;

    render(<PlayerSession data={activePlayerView} />);

    expect(document.querySelector('[data-vote-choice="no-go"]')).toHaveTextContent("No-go");
  });

  it("does not label a late entrant's prior closed ballot as an abstention", () => {
    render(
      <VoteBreakdown
        selection={selection}
        participants={[
          {
            session_id: sessionId,
            account_id: latePlayerId,
            display_name_snapshot: "Local Multi",
            roster_order: 3,
            active: true,
            created_at: "2026-11-24T11:04:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("Not eligible")).toBeVisible();
    expect(screen.queryByText("abstain")).not.toBeInTheDocument();
  });
});
