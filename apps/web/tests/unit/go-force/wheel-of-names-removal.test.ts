import { describe, expect, it } from "vitest";
import { buildWheelConfig } from "@/features/go-force/wheel-of-names-client";

const roundRemainingGames = [
  { id: "60000000-0000-4000-8000-000000000001", text: "Remaining Game One" },
  { id: "60000000-0000-4000-8000-000000000002", text: "Remaining Game Two" },
  { id: "60000000-0000-4000-8000-000000000003", text: "Remaining Game Three" },
];

describe("Wheel of Names round-scoped removal", () => {
  it("enables provider winner removal and maps the current remaining pool exactly", () => {
    expect(buildWheelConfig(roundRemainingGames)).toEqual({
      title: "Go Force",
      autoRemoveWinner: true,
      entries: roundRemainingGames,
    });
  });

  it("builds a fresh wheel without the game committed by an earlier spin", () => {
    const afterFirstSelection = roundRemainingGames.filter(
      (game) => game.id !== "60000000-0000-4000-8000-000000000001",
    );

    expect(buildWheelConfig(afterFirstSelection).entries).toEqual([
      { id: "60000000-0000-4000-8000-000000000002", text: "Remaining Game Two" },
      { id: "60000000-0000-4000-8000-000000000003", text: "Remaining Game Three" },
    ]);
    expect(buildWheelConfig(afterFirstSelection).autoRemoveWinner).toBe(true);
  });
});
