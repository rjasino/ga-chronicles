import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoteBreakdown } from "@/components/go-force/facilitator-session";
import type { SelectionWithVotes } from "@/features/go-force/types";

vi.mock("@/features/go-force/game-actions", () => ({
  commitGoForceSelection: vi.fn(),
  closeGoForceSelection: vi.fn(),
  drawGoForceSelection: vi.fn(),
}));
vi.mock("@/features/go-force/session-actions", () => ({ startGoForceSession: vi.fn() }));
vi.mock("@/features/go-force/ballot-actions", () => ({ closeGoForceFinalBallot: vi.fn() }));

const selection = {
  id: "80000000-0000-4000-8000-000000000001",
  round_id: "70000000-0000-4000-8000-000000000001",
  session_game_id: "60000000-0000-4000-8000-000000000001",
  selection_order: 1,
  selected_at: "2025-01-01T00:00:00.000Z",
  voting_deadline_at: "2025-01-01T00:00:10.000Z",
  voting_closed_at: "2025-01-01T00:00:10.000Z",
  advancement_outcome: "eliminated",
  round: null,
  game: {
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
  },
  votes: [],
} satisfies SelectionWithVotes;

describe("Facilitator selection result", () => {
  afterEach(cleanup);

  it("shows the selected game's cover art and metadata with the closed result", () => {
    render(<VoteBreakdown selection={selection} participants={[]} />);

    expect(screen.getByText("Selection result")).toBeVisible();
    expect(screen.getByRole("img", { name: "Cover art for Game One" })).toHaveAttribute(
      "src",
      "https://cdn.example.test/game-one.webp",
    );
    expect(screen.getByText("Fixture Studio")).toBeVisible();
    expect(screen.getByText("Fixture Publisher")).toBeVisible();
  });

  it("color-codes labeled go and no-go choices in each participant's closed result", () => {
    const withVotes = {
      ...selection,
      advancement_outcome: "advanced" as const,
      votes: [
        {
          id: "vote-1",
          selection_id: selection.id,
          participant_account_id: "participant-1",
          choice: "go" as const,
          submitted_at: "2025-01-01T00:00:01.000Z",
          closed_at: "2025-01-01T00:00:10.000Z",
          created_at: "2025-01-01T00:00:01.000Z",
        },
        {
          id: "vote-2",
          selection_id: selection.id,
          participant_account_id: "participant-2",
          choice: "no-go" as const,
          submitted_at: "2025-01-01T00:00:02.000Z",
          closed_at: "2025-01-01T00:00:10.000Z",
          created_at: "2025-01-01T00:00:02.000Z",
        },
      ],
    } satisfies SelectionWithVotes;

    render(
      <VoteBreakdown
        selection={withVotes}
        participants={[
          {
            session_id: "40000000-0000-4000-8000-000000000001",
            account_id: "participant-1",
            display_name_snapshot: "Player One",
            roster_order: 1,
            active: true,
            created_at: "2025-01-01T00:00:00.000Z",
          },
          {
            session_id: "40000000-0000-4000-8000-000000000001",
            account_id: "participant-2",
            display_name_snapshot: "Player Two",
            roster_order: 2,
            active: true,
            created_at: "2025-01-01T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(document.querySelector('[data-vote-choice="go"]')).toHaveTextContent("Go");
    expect(document.querySelector('[data-vote-choice="no-go"]')).toHaveTextContent("No-go");
  });
});
