import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { getGoForceAdminData, listEligibleAnnualGames } from "@/features/go-force/admin-queries";

describe("Go Force admin queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads admin collections and participant counts beyond the Supabase row limit", async () => {
    const annualGames = Array.from({ length: 1001 }, (_, index) => ({
      id: `game-${index}`,
      goty_year: 2026,
      title: `Game ${index}`,
      eligibility_state: "eligible",
      display_order: index,
    }));
    const accounts = Array.from({ length: 1001 }, (_, index) => ({
      id: `account-${index}`,
      username: `player-${index}`,
      display_name: `Player ${index}`,
      status: "active",
    }));
    const sessions = Array.from({ length: 1001 }, (_, index) => ({
      id: `session-${index}`,
      created_at: `2026-01-${String((index % 28) + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    const participants = Array.from({ length: 1001 }, (_, index) => ({
      session_id: "session-0",
      account_id: `account-${index}`,
      active: true,
    }));
    const results = sessions.map((session, index) => ({
      session_id: session.id,
      results_visible: index === 0,
    }));
    const tables: Record<string, Record<string, unknown>[]> = {
      go_force_annual_games: annualGames,
      accounts,
      go_force_sessions: sessions,
      go_force_session_participants: participants,
      go_force_results: results,
    };
    const settings = {
      id: true,
      page_visible: true,
      round_voting_seconds: 10,
      round_voting_timed: true,
      final_ballot_seconds: 10,
      final_ballot_timed: true,
      minimum_round_three_go_voters: 2,
      updated_by: null,
      updated_at: "2026-01-01T00:00:00Z",
    };
    const ranges: Record<string, Array<[number, number]>> = {};
    const inFilters: Array<{ table: string; values: unknown[] }> = [];
    const from = vi.fn((table: string) => {
      const filters: Array<{ column: string; value: unknown }> = [];
      const query: Record<string, (...args: unknown[]) => unknown> = {};
      query.select = () => query;
      query.order = () => query;
      query.eq = (...args) => {
        filters.push({ column: args[0] as string, value: args[1] });
        return query;
      };
      query.in = (...args) => {
        const values = args[1] as unknown[];
        filters.push({ column: args[0] as string, value: values });
        inFilters.push({ table, values });
        return query;
      };
      query.maybeSingle = () => Promise.resolve({ data: settings, error: null });
      query.range = (...args) => {
        const start = args[0] as number;
        const end = args[1] as number;
        (ranges[table] ??= []).push([start, end]);
        const data = (tables[table] ?? []).filter((row) =>
          filters.every(({ column, value }) =>
            Array.isArray(value) ? value.includes(row[column]) : row[column] === value,
          ),
        );
        return Promise.resolve({ data: data.slice(start, end + 1), error: null });
      };
      return query;
    });
    mocks.createClient.mockResolvedValue({ from });

    const adminData = await getGoForceAdminData();
    const eligibleGames = await listEligibleAnnualGames(2026);

    expect(adminData.games).toHaveLength(1001);
    expect(adminData.accounts).toHaveLength(1001);
    expect(adminData.sessions).toHaveLength(1001);
    expect(adminData.sessions[0]).toMatchObject({ participants: 1001, result_visible: true });
    expect(eligibleGames).toHaveLength(1001);
    expect(ranges.go_force_annual_games).toEqual([
      [0, 999],
      [1000, 1999],
      [0, 999],
      [1000, 1999],
    ]);
    expect(ranges.accounts).toEqual([[0, 999], [1000, 1999]]);
    expect(ranges.go_force_sessions).toEqual([[0, 999], [1000, 1999]]);
    expect(ranges.go_force_results).toEqual([[0, 999], [1000, 1999]]);
    expect(ranges.go_force_session_participants).toEqual([
      [0, 999],
      [1000, 1999],
      [0, 999],
    ]);
    expect(inFilters.map(({ values }) => values.length)).toEqual([1000, 1000, 1]);
  });
});
