import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GoForceResultsPage } from "@/components/go-force/results-page";
import type { PublicResultsView } from "@/features/go-force/types";

const game = {
  id: "60000000-0000-4000-8000-000000000001",
  session_id: "40000000-0000-4000-8000-000000000001",
  annual_game_id: null,
  title_snapshot: "Game One",
  developer_snapshot: "Fixture Studio",
  publisher_snapshot: "Fixture Publisher",
  genre_snapshot: "Adventure",
  cover_art_url_snapshot: "https://cdn.example.test/game-one.webp",
  source_year: 2025,
  display_order: 1,
  created_at: "2025-01-01T00:00:00.000Z",
};

const finalist = {
  gameId: game.id,
  title: "Game One",
  votes: 2,
  developer: "Fixture Studio",
  publisher: "Fixture Publisher",
  genre: "Adventure",
  coverArtUrl: game.cover_art_url_snapshot,
};

const selection = {
  id: "80000000-0000-4000-8000-000000000001",
  round_id: "70000000-0000-4000-8000-000000000001",
  session_game_id: game.id,
  selection_order: 1,
  selected_at: "2025-01-01T00:00:00.000Z",
  voting_deadline_at: "2025-01-01T00:00:10.000Z",
  voting_closed_at: "2025-01-01T00:00:10.000Z",
  advancement_outcome: "advanced" as const,
  round: null,
  game,
  votes: [],
};

const results = {
  session: {
    id: "40000000-0000-4000-8000-000000000001",
    goty_year: 2025,
    game_master_id: "10000000-0000-4000-8000-000000000001",
    status: "complete",
    wheel_fallback_enabled: false,
    started_at: null,
    final_ballot_deadline_at: null,
    completed_at: "2025-01-02T00:00:00.000Z",
    vote_completion_percentage: 100,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-02T00:00:00.000Z",
  },
  participants: [],
  games: [game],
  rounds: [
    {
      id: "70000000-0000-4000-8000-000000000001",
      session_id: "40000000-0000-4000-8000-000000000001",
      round_number: 1,
      status: "complete",
      go_limit: 3,
      started_at: null,
      ended_at: null,
      created_at: "2025-01-01T00:00:00.000Z",
    },
  ],
  selections: [selection],
  finalBallotVotes: [],
  result: {
    id: "90000000-0000-4000-8000-000000000001",
    session_id: "40000000-0000-4000-8000-000000000001",
    winner_game_ids: [game.id],
    final_vote_totals: { [game.id]: 2 },
    results_visible: true,
    published_at: "2025-01-02T00:00:00.000Z",
    created_at: "2025-01-02T00:00:00.000Z",
    updated_at: "2025-01-02T00:00:00.000Z",
  },
  finalists: [finalist],
  winners: [finalist],
  roundThreeSelections: [selection],
} satisfies PublicResultsView;

describe("Go Force public results page", () => {
  afterEach(cleanup);

  it("renders cover art for finalists and round selection results", () => {
    render(<GoForceResultsPage data={results} />);

    const coverArt = screen.getAllByRole("img", { name: /Cover art for Game One/ });
    expect(coverArt).toHaveLength(2);
    expect(coverArt[0]).toHaveAttribute("src", "https://cdn.example.test/game-one.webp");
  });
});
