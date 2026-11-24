import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  getVerifiedSession: vi.fn(),
  getFacilitatorSessionView: vi.fn(),
  spinWheelOfNames: vi.fn(),
  rpc: vi.fn(),
  publishGoForceSessionUpdate: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: actions.refresh }));
vi.mock("@/lib/supabase/server", () => ({ createClient: actions.createClient }));
vi.mock("@/lib/supabase/session", () => ({ getVerifiedSession: actions.getVerifiedSession }));
vi.mock("@/features/go-force/session-queries", () => ({
  getFacilitatorSessionView: actions.getFacilitatorSessionView,
}));
vi.mock("@/features/go-force/realtime-broadcast", () => ({
  publishGoForceSessionUpdate: actions.publishGoForceSessionUpdate,
}));
vi.mock("@/features/go-force/wheel-of-names-client", () => ({
  spinWheelOfNames: actions.spinWheelOfNames,
  WheelOfNamesError: class WheelOfNamesError extends Error {
    constructor(
      message: string,
      readonly requestId?: string,
    ) {
      super(message);
      this.name = "WheelOfNamesError";
    }
  },
}));

import {
  closeGoForceSelection,
  commitGoForceSelection,
  drawGoForceSelection,
  submitGoForceGameVote,
} from "@/features/go-force/game-actions";

const sessionId = "40000000-0000-4000-8000-000000000001";
const gameId = "60000000-0000-4000-8000-000000000001";
const animation =
  "UklGRkAAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAIAAAAAAFZQOCAYAAAAMAEAnQEqAQABAAFAJiWkAANwAP79NmgA";

function drawForm() {
  const formData = new FormData();
  formData.set("sessionId", sessionId);
  return formData;
}

function voteForm(selectionId: string, choice: "go" | "no-go") {
  const formData = new FormData();
  formData.set("selectionId", selectionId);
  formData.set("choice", choice);
  return formData;
}

function lookupQuery(data: unknown, error: unknown = null) {
  const query: Record<string, (...args: unknown[]) => unknown> = {};
  query.select = () => query;
  query.eq = () => query;
  query.maybeSingle = () => Promise.resolve({ data, error });
  return query;
}

describe("drawGoForceSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actions.getVerifiedSession.mockResolvedValue({
      userId: "facilitator-id",
      username: "facilitator",
      roles: ["admin"],
    });
    actions.getFacilitatorSessionView.mockResolvedValue({
      session: { game_master_id: "facilitator-id", status: "live" },
      currentRound: { id: "round-id", round_number: 1 },
      currentSelection: null,
      remainingGames: [{ id: gameId, title_snapshot: "Game One" }],
    });
    actions.createClient.mockResolvedValue({ rpc: actions.rpc });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not commit or publish when provider response processing fails", async () => {
    actions.spinWheelOfNames.mockRejectedValue(new Error("Maximum call stack size exceeded"));

    await expect(drawGoForceSelection({}, drawForm())).resolves.toMatchObject({
      error: "Wheel of Names could not complete the spin. Please retry.",
      errorId: expect.any(String),
    });

    expect(actions.createClient).not.toHaveBeenCalled();
    expect(actions.rpc).not.toHaveBeenCalled();
    expect(actions.publishGoForceSessionUpdate).not.toHaveBeenCalled();
    expect(actions.refresh).not.toHaveBeenCalled();
  });

  it("returns the validated provider winner and animation without committing or publishing", async () => {
    actions.spinWheelOfNames.mockResolvedValue({
      animation,
      animationFormat: "webp",
      winner: { id: gameId, text: "Game One" },
    });
    await expect(drawGoForceSelection({}, drawForm())).resolves.toEqual({
      gameId,
      title: "Game One",
      animation,
      animationFormat: "webp",
      animationDurationMs: 0,
    });

    expect(actions.createClient).not.toHaveBeenCalled();
    expect(actions.rpc).not.toHaveBeenCalled();
    expect(actions.publishGoForceSessionUpdate).not.toHaveBeenCalled();
  });

  it("commits a still-eligible winner only when the facilitator opens voting", async () => {
    actions.rpc.mockResolvedValue({
      data: { selectionId: "selection-id", title: "Game One" },
      error: null,
    });

    await expect(commitGoForceSelection(sessionId, gameId)).resolves.toEqual({
      selectionId: "selection-id",
      gameId,
      title: "Game One",
      success: "Game One is up for a vote.",
    });

    expect(actions.rpc).toHaveBeenCalledWith("go_force_commit_selection", {
      target_session: sessionId,
      target_game: gameId,
    });
    expect(actions.publishGoForceSessionUpdate).toHaveBeenCalledWith(sessionId);
    expect(actions.refresh).not.toHaveBeenCalled();
  });

  it("does not commit a candidate that is no longer in the active round pool", async () => {
    actions.getFacilitatorSessionView.mockResolvedValue({
      session: { game_master_id: "facilitator-id", status: "live" },
      currentRound: { id: "round-id", round_number: 1 },
      currentSelection: null,
      remainingGames: [],
    });

    await expect(commitGoForceSelection(sessionId, gameId)).resolves.toEqual({
      error: "The selected game is no longer eligible. Please spin again.",
    });
    expect(actions.rpc).not.toHaveBeenCalled();
    expect(actions.publishGoForceSessionUpdate).not.toHaveBeenCalled();
  });
});

describe("game vote and close broadcasts", () => {
  const selectionId = "43000000-0000-4000-8000-000000000101";
  const otherSessionId = "40000000-0000-4000-8000-000000000102";

  beforeEach(() => {
    vi.clearAllMocks();
    actions.getVerifiedSession.mockResolvedValue({
      userId: "player-id",
      username: "player",
      roles: [],
    });
    actions.from.mockImplementation((table: string) => {
      if (table === "go_force_selections") {
        return lookupQuery({ round_id: "42000000-0000-4000-8000-000000000101" });
      }
      return lookupQuery({ session_id: sessionId });
    });
    actions.createClient.mockResolvedValue({ from: actions.from, rpc: actions.rpc });
    actions.rpc.mockResolvedValue({ data: { choice: "go" }, error: null });
  });

  it("resolves the session before committing a game vote and publishes after success", async () => {
    await expect(submitGoForceGameVote({}, voteForm(selectionId, "go"))).resolves.toMatchObject({
      success: "Go vote recorded.",
    });

    expect(actions.rpc).toHaveBeenCalledWith("go_force_submit_game_vote", {
      target_selection: selectionId,
      vote_choice: "go",
    });
    expect(actions.publishGoForceSessionUpdate).toHaveBeenCalledWith(sessionId);
  });

  it("uses the selection's server-resolved session when closing and publishing", async () => {
    actions.rpc.mockResolvedValue({
      data: { outcome: "advanced", goVotes: 2 },
      error: null,
    });
    const formData = new FormData();
    formData.set("selectionId", selectionId);
    formData.set("sessionId", otherSessionId);

    await expect(closeGoForceSelection({}, formData)).resolves.toMatchObject({
      success: "Voting closed. The game advances with 2 go votes.",
    });

    expect(actions.rpc).toHaveBeenCalledWith("go_force_close_selection", {
      target_selection: selectionId,
    });
    expect(actions.publishGoForceSessionUpdate).toHaveBeenCalledWith(sessionId);
    expect(actions.refresh).not.toHaveBeenCalled();
    expect(actions.publishGoForceSessionUpdate).not.toHaveBeenCalledWith(otherSessionId);
  });

  it("does not commit or publish a vote when its session lookup fails", async () => {
    actions.from.mockImplementationOnce(() => lookupQuery(null, new Error("lookup failed")));

    await expect(submitGoForceGameVote({}, voteForm(selectionId, "go"))).resolves.toMatchObject({
      error: "The selected game could not be loaded. Please retry.",
    });
    expect(actions.rpc).not.toHaveBeenCalled();
    expect(actions.publishGoForceSessionUpdate).not.toHaveBeenCalled();
  });
});
