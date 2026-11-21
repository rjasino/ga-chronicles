import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GameDetailsCard } from "@/components/go-force/game-details-card";

describe("Go Force game details card", () => {
  afterEach(cleanup);

  it("renders optional metadata and uploaded or URL-based cover art", () => {
    render(
      <GameDetailsCard
        title="Hades II"
        developer="Supergiant Games"
        publisher="Supergiant Games"
        genre="Roguelike"
        coverArtUrl="https://cdn.example.test/hades-ii.webp"
      />,
    );

    expect(screen.getByRole("heading", { name: "Hades II" })).toBeVisible();
    expect(screen.getByText("Developer:")).toBeVisible();
    expect(screen.getByText("Publisher:")).toBeVisible();
    expect(screen.getByText("Genre:")).toBeVisible();
    expect(screen.getByRole("img", { name: "Cover art for Hades II" })).toHaveAttribute(
      "src",
      "https://cdn.example.test/hades-ii.webp",
    );
  });

  it("shows an explicit fallback when optional details and cover art are missing", () => {
    render(<GameDetailsCard title="Unlisted Game" />);

    expect(screen.getByText("Game details have not been added.")).toBeVisible();
    expect(screen.getByLabelText("No cover art for Unlisted Game")).toBeVisible();
  });
});
