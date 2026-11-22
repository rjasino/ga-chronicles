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
      selection_id: "selection-0",
      participant_account_id: `participant-${index}`,
      choice: "go",
      submitted_at: "2026-01-01T00:00:00Z",
      closed_at: null,
      created_at: "2026-01-01T00:00:00Z",
    }));
    const ranges: Record<string, Array<[number, number]>> = {};
    const inFilters: Array<{ table: string; column: string; values: unknown[] }> = [];
    const rowsByTable: Record<string, unknown> = {
      go_force_sessions: { id: "session-1" },
      go_force_session_participants: [],
      go_force_session_games: [],
      go_force_rounds: [{ id: "round-1", session_id: "session-1", round_number: 1 }],
      go_force_selections: [
        ...Array.from({ length: 1001 }, (_, index) => ({
          id: `selection-${index}`,
          round_id: "round-1",
          session_game_id: `game-${index}`,
          selection_order: index + 1,
        })),
        { id: "unrelated-selection", round_id: "other-round", session_game_id: "other-game", selection_order: 1 },
      ],
      go_force_final_ballot_votes: [],
      go_force_results: null,
    };

    const from = vi.fn((table: string) => {
      const result = { data: rowsByTable[table], error: null };
      const query: Record<string, (...args: unknown[]) => unknown> = {};
      let filterColumn: string | null = null;
      let filterValues: unknown[] = [];
      query.select = () => query;
      query.eq = () => query;
      query.order = () => query;
      query.in = (...args) => {
        filterColumn = args[0] as string;
        filterValues = args[1] as unknown[];
        inFilters.push({ table, column: filterColumn, values: filterValues });
        return query;
      };
      query.maybeSingle = () => Promise.resolve(result);
      query.then = (...args) =>
        Promise.resolve(result).then(
          args[0] as (value: typeof result) => unknown,
          args[1] as ((reason: unknown) => unknown) | undefined,
        );
      query.range = (...args) => {
        const start = args[0] as number;
        const end = args[1] as number;
        (ranges[table] ??= []).push([start, end]);
        const tableRows = table === "go_force_game_votes"
          ? gameVotes.filter((vote) => filterValues.includes(vote.selection_id))
          : (rowsByTable[table] as Record<string, unknown>[]).filter((row) =>
              filterColumn === null || filterValues.includes(row[filterColumn]),
            );
        return Promise.resolve({
          data: tableRows.slice(start, end + 1),
          error: null,
        });
      };
      return query;
    });
    mocks.createClient.mockResolvedValue({ from });

    const view = await getSessionView("00000000-0000-0000-0000-000000000001");

    expect(ranges.go_force_selections).toEqual([[0, 999], [1000, 1999]]);
    expect(ranges.go_force_game_votes).toEqual([[0, 999], [1000, 1999], [0, 999]]);
    expect(inFilters[0]).toEqual({
      table: "go_force_selections",
      column: "round_id",
      values: ["round-1"],
    });
    expect(inFilters.at(-1)).toEqual({
      table: "go_force_game_votes",
      column: "selection_id",
      values: ["selection-1000"],
    });
    expect(view?.selections).toHaveLength(1001);
    expect(view?.selections[0].votes).toHaveLength(1001);
  });
});
