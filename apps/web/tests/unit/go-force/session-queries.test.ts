import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { getSessionView } from "@/features/go-force/session-queries";

describe("getSessionView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads game votes beyond the Supabase row limit", async () => {
    const gameVotes = Array.from({ length: 1001 }, (_, index) => ({
      id: `vote-${String(index).padStart(4, "0")}`,
      selection_id: "selection-1",
      participant_account_id: `participant-${index}`,
      choice: "go",
      submitted_at: "2026-01-01T00:00:00Z",
      closed_at: null,
      created_at: "2026-01-01T00:00:00Z",
    }));
    const ranges: Array<[number, number]> = [];
    const rowsByTable: Record<string, unknown> = {
      go_force_sessions: { id: "session-1" },
      go_force_session_participants: [],
      go_force_session_games: [],
      go_force_rounds: [{ id: "round-1", session_id: "session-1", round_number: 1 }],
      go_force_selections: [{ id: "selection-1", round_id: "round-1", session_game_id: "game-1" }],
      go_force_final_ballot_votes: [],
      go_force_results: null,
    };

    const from = vi.fn((table: string) => {
      const result = { data: rowsByTable[table], error: null };
      const query: Record<string, (...args: unknown[]) => unknown> = {};
      query.select = () => query;
      query.eq = () => query;
      query.order = () => query;
      query.in = () => query;
      query.maybeSingle = () => Promise.resolve(result);
      query.then = (...args) =>
        Promise.resolve(result).then(
          args[0] as (value: typeof result) => unknown,
          args[1] as ((reason: unknown) => unknown) | undefined,
        );
      query.range = (...args) => {
        const start = args[0] as number;
        const end = args[1] as number;
        ranges.push([start, end]);
        return Promise.resolve({
          data: gameVotes.slice(start, end + 1),
          error: null,
        });
      };
      return query;
    });
    mocks.createClient.mockResolvedValue({ from });

    const view = await getSessionView("00000000-0000-0000-0000-000000000001");

    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(view?.selections[0].votes).toHaveLength(1001);
  });
});
