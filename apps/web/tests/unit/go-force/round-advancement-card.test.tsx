import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoundAdvancementCard } from "@/components/go-force/round-advancement-card";
import type { RoundAdvancementSummary } from "@/features/go-force/types";

describe("RoundAdvancementCard", () => {
  afterEach(cleanup);

  it("shows provisional and confirmed round games with exact go counts", () => {
    const summaries: RoundAdvancementSummary[] = [
      {
        roundNumber: 1,
        status: "complete",
        games: [{ gameId: "game-1", title: "Confirmed Game", goVotes: 2 }],
      },
      {
        roundNumber: 2,
        status: "active",
        games: [{ gameId: "game-2", title: "Provisional Game", goVotes: 1 }],
      },
    ];
    render(<RoundAdvancementCard summaries={summaries} />);

    expect(screen.getByRole("region", { name: "Round advancement summary" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Round 1 · Confirmed" })).toBeVisible();
    expect(screen.getByText("Confirmed Game")).toBeVisible();
    expect(screen.getByText("Confirmed Game").closest("li")).toHaveTextContent(/2\s+Go/);
    expect(screen.getByRole("heading", { name: "Round 2 · Advancing so far" })).toBeVisible();
    expect(screen.getByText("Provisional Game")).toBeVisible();
    expect(screen.getByText("Provisional Game").closest("li")).toHaveTextContent(/1\s+Go/);
  });

  it("shows different empty states for an active and completed round", () => {
    render(
      <RoundAdvancementCard
        summaries={[
          { roundNumber: 2, status: "active", games: [] },
          { roundNumber: 1, status: "complete", games: [] },
        ]}
      />,
    );

    expect(screen.getByText("No games have qualified from this round yet.")).toBeVisible();
    expect(screen.getByText("No games advanced from this round.")).toBeVisible();
  });
});
