import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  createClient: vi.fn(),
  getVerifiedSession: vi.fn(),
  getFacilitatorSessionView: vi.fn(),
  spinWheelOfNames: vi.fn(),
  rpc: vi.fn(),
  publishGoForceSessionUpdate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: actions.revalidatePath }));
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

import { commitGoForceSelection, drawGoForceSelection } from "@/features/go-force/game-actions";

const sessionId = "40000000-0000-4000-8000-000000000001";
const gameId = "60000000-0000-4000-8000-000000000001";
const animation =
  "UklGRkAAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAIAAAAAAFZQOCAYAAAAMAEAnQEqAQABAAFAJiWkAANwAP79NmgA";

function drawForm() {
  const formData = new FormData();
  formData.set("sessionId", sessionId);
  return formData;
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
    expect(actions.revalidatePath).not.toHaveBeenCalled();
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
    expect(actions.revalidatePath).toHaveBeenCalledWith(`/admin/go-force/sessions/${sessionId}`);
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
