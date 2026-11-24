import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
  getVerifiedSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/session", () => ({ getVerifiedSession: mocks.getVerifiedSession }));

import {
  getActiveGoForceAccountOptions,
  getFacilitatorSessionView,
  getPlayerSessionView,
  getSessionView,
} from "@/features/go-force/session-queries";

function queryClient(rowsByTable: Record<string, unknown>, rpc = mocks.rpc) {
  const from = vi.fn((table: string) => {
    const filters: Array<{ column: string; value: unknown; kind: "eq" | "in" }> = [];
    const query: Record<string, (...args: unknown[]) => unknown> = {};
    const rows = () => {
      const tableRows = (rowsByTable[table] ?? []) as Record<string, unknown>[];
      return tableRows.filter((row) =>
        filters.every(({ column, value, kind }) =>
          kind === "eq" ? row[column] === value : (value as unknown[]).includes(row[column]),
        ),
      );
    };
    query.select = () => query;
    query.order = () => query;
    query.eq = (column, value) => {
      filters.push({ column: column as string, value, kind: "eq" });
      return query;
    };
    query.in = (column, value) => {
      filters.push({ column: column as string, value, kind: "in" });
      return query;
    };
    query.maybeSingle = () => Promise.resolve({ data: rows()[0] ?? null, error: null });
    query.range = (fromIndex, toIndex) =>
      Promise.resolve({
        data: rows().slice(fromIndex as number, (toIndex as number) + 1),
        error: null,
      });
    query.then = (...args) =>
      Promise.resolve({ data: rows(), error: null }).then(
        args[0] as (value: { data: unknown[]; error: null }) => unknown,
        args[1] as ((reason: unknown) => unknown) | undefined,
      );
    return query;
  });
  return { from, rpc };
}

function queryFixture({
  sessionStatus = "live",
  selectionClosed = false,
}: {
  sessionStatus?: string;
  selectionClosed?: boolean;
} = {}) {
  const sessionId = "40000000-0000-4000-8000-000000000101";
  const roundId = "42000000-0000-4000-8000-000000000101";
  const selectionId = "43000000-0000-4000-8000-000000000101";
  const gameId = "41000000-0000-4000-8000-000000000101";
  const timestamp = "2026-11-24T12:00:00.000Z";
  const round = {
    id: roundId,
    session_id: sessionId,
    round_number: 1,
    status: "active",
    go_limit: 3,
    started_at: timestamp,
    ended_at: null,
    created_at: timestamp,
  };
  const game = {
    id: gameId,
    session_id: sessionId,
    annual_game_id: null,
    title_snapshot: "Query Fixture",
    developer_snapshot: null,
    publisher_snapshot: null,
    genre_snapshot: null,
    cover_art_url_snapshot: null,
    source_year: 2090,
    display_order: 1,
    created_at: timestamp,
  };
  const selection = {
    id: selectionId,
    round_id: roundId,
    session_game_id: gameId,
    selection_order: 1,
    selected_at: timestamp,
    voting_deadline_at: timestamp,
    voting_closed_at: selectionClosed ? timestamp : null,
    advancement_outcome: selectionClosed ? "advanced" : "pending",
  };
  const session = {
    id: sessionId,
    goty_year: 2090,
    game_master_id: "10000000-0000-4000-8000-000000000003",
    status: sessionStatus,
    started_at: timestamp,
    final_ballot_deadline_at: null,
    completed_at: null,
    vote_completion_percentage: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  const participants = [
    {
      session_id: sessionId,
      account_id: "10000000-0000-4000-8000-000000000001",
      display_name_snapshot: "Local Reader",
      roster_order: 1,
      active: true,
      created_at: timestamp,
    },
    {
      session_id: sessionId,
      account_id: "10000000-0000-4000-8000-000000000002",
      display_name_snapshot: "Local Contributor",
      roster_order: 2,
      active: true,
      created_at: timestamp,
    },
  ];
  const votes = selectionClosed
    ? [
        {
          id: "vote-1",
          selection_id: selectionId,
          participant_account_id: participants[0].account_id,
          choice: "go",
          submitted_at: timestamp,
          closed_at: timestamp,
          created_at: timestamp,
        },
      ]
    : [];

  return {
    ids: { sessionId, roundId, selectionId },
    session,
    round,
    game,
    selection,
    participants,
    votes,
    rowsByTable: {
      go_force_sessions: [session],
      go_force_session_participants: participants,
      go_force_session_games: [game],
      go_force_rounds: [round],
      go_force_selections: [selection],
      go_force_game_votes: votes,
      go_force_final_ballot_votes: [],
      go_force_results: [],
    },
  };
}

describe("getActiveGoForceAccountOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads only the account options returned by the authorized session function", async () => {
    const accounts = [{ id: "account-1", username: "player-one", display_name: "Player One" }];
    mocks.rpc.mockResolvedValue({ data: accounts, error: null });
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });

    await expect(
      getActiveGoForceAccountOptions("00000000-0000-0000-0000-000000000001"),
    ).resolves.toEqual({ accounts, canAdd: true });
    expect(mocks.rpc).toHaveBeenCalledWith("go_force_active_account_options", {
      target_session: "00000000-0000-0000-0000-000000000001",
    });
  });

  it("does not query for a malformed session id", async () => {
    await expect(getActiveGoForceAccountOptions("invalid")).resolves.toEqual({
      accounts: [],
      canAdd: false,
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});

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
        {
          id: "unrelated-selection",
          round_id: "other-round",
          session_game_id: "other-game",
          selection_order: 1,
        },
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
        const tableRows =
          table === "go_force_game_votes"
            ? gameVotes.filter((vote) => filterValues.includes(vote.selection_id))
            : (rowsByTable[table] as Record<string, unknown>[]).filter(
                (row) => filterColumn === null || filterValues.includes(row[filterColumn]),
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

    expect(ranges.go_force_selections).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(ranges.go_force_game_votes).toEqual([
      [0, 999],
      [1000, 1999],
      [0, 999],
    ]);
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

describe("authorized session aggregates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads open-ballot progress for the facilitator without relying on raw vote rows", async () => {
    const fixture = queryFixture();
    mocks.getVerifiedSession.mockResolvedValue({
      userId: fixture.session.game_master_id,
      roles: ["moderator"],
    });
    mocks.rpc.mockResolvedValue({ data: { eligible: 2, submitted: 1 }, error: null });
    mocks.createClient.mockResolvedValue(queryClient(fixture.rowsByTable));

    const view = await getFacilitatorSessionView(fixture.ids.sessionId);

    expect(view?.selectionProgress).toEqual({ eligible: 2, submitted: 1 });
    expect(view?.currentSelection?.votes).toEqual([]);
    expect(mocks.rpc).toHaveBeenCalledWith("go_force_selection_progress", {
      target_selection: fixture.ids.selectionId,
    });
  });

  it("loads a closed game aggregate for the player without exposing peer vote rows", async () => {
    const fixture = queryFixture({ selectionClosed: true });
    mocks.rpc.mockResolvedValue({
      data: [
        {
          selectionId: fixture.ids.selectionId,
          outcome: "advanced",
          goVotes: 2,
          noGoVotes: 1,
          abstainVotes: 0,
        },
      ],
      error: null,
    });
    mocks.createClient.mockResolvedValue(queryClient(fixture.rowsByTable));

    const view = await getPlayerSessionView(
      fixture.ids.sessionId,
      fixture.participants[0].account_id,
    );

    expect(view?.closedSelectionSummaries[fixture.ids.selectionId]).toEqual({
      outcome: "advanced",
      goVotes: 2,
      noGoVotes: 1,
      abstainVotes: 0,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("go_force_closed_selection_summaries", {
      target_session: fixture.ids.sessionId,
    });
    expect(view?.selections[0]?.votes).toHaveLength(1);
    expect(view?.roundAdvancementSummaries[0]?.games[0]?.goVotes).toBe(2);
    expect(view?.goVoteQuotas).toEqual([
      { roundNumber: 1, limit: 3, used: 1, remaining: 2, started: true },
      { roundNumber: 2, limit: 2, used: 0, remaining: 2, started: false },
      { roundNumber: 3, limit: 1, used: 0, remaining: 1, started: false },
    ]);
  });
});
