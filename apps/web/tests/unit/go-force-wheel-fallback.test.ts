import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getVerifiedSession: vi.fn(),
  createClient: vi.fn(),
  getFacilitatorSessionView: vi.fn(),
  publishGoForceSessionUpdate: vi.fn(),
  spinWheelOfNames: vi.fn(),
  reportFailure: vi.fn(),
  failureResult: vi.fn((input: { message: string }) => ({ error: input.message })),
}));

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/supabase/session", () => ({ getVerifiedSession: mocks.getVerifiedSession }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/features/go-force/session-queries", () => ({
  getFacilitatorSessionView: mocks.getFacilitatorSessionView,
}));
vi.mock("@/features/go-force/realtime-broadcast", () => ({
  publishGoForceSessionUpdate: mocks.publishGoForceSessionUpdate,
}));
vi.mock("@/features/go-force/wheel-of-names-client", async () => {
  const actual = await vi.importActual<typeof import("@/features/go-force/wheel-of-names-client")>(
    "@/features/go-force/wheel-of-names-client",
  );
  return {
    ...actual,
    spinWheelOfNames: mocks.spinWheelOfNames,
  };
});
vi.mock("@/lib/error-logging", () => ({
  reportFailure: mocks.reportFailure,
  failureResult: mocks.failureResult,
}));

import { drawGoForceSelection } from "@/features/go-force/game-actions";
import { setGoForceWheelFallback } from "@/features/go-force/session-actions";
import { WheelOfNamesError } from "@/features/go-force/wheel-of-names-client";

const sessionId = "40000000-0000-4000-8000-000000000001";
const userId = "10000000-0000-4000-8000-000000000002";

describe("Wheel of Names fallback actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVerifiedSession.mockResolvedValue({ userId, roles: ["admin"] });
  });

  it("toggles fallback mode via go_force_set_wheel_fallback and broadcasts update", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    mocks.createClient.mockResolvedValue({ rpc });

    const formData = new FormData();
    formData.set("sessionId", sessionId);
    formData.set("wheelFallbackEnabled", "true");

    const result = await setGoForceWheelFallback({}, formData);

    expect(rpc).toHaveBeenCalledWith("go_force_set_wheel_fallback", {
      target_session: sessionId,
      fallback_enabled: true,
    });
    expect(mocks.publishGoForceSessionUpdate).toHaveBeenCalledWith(sessionId);
    expect(result.wheelFallbackEnabled).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("uses the pre-randomized fallback queue directly when wheel_fallback_enabled is true", async () => {
    mocks.getFacilitatorSessionView.mockResolvedValue({
      session: { id: sessionId, game_master_id: userId, status: "live", wheel_fallback_enabled: true },
      currentRound: { id: "70000000-0000-4000-8000-000000000001", round_number: 1 },
      currentSelection: null,
      remainingGames: [{ id: "60000000-0000-4000-8000-000000000001", title_snapshot: "Game A" }],
    });
    const rpc = vi.fn().mockResolvedValue({
      data: {
        selectionId: "80000000-0000-4000-8000-000000000001",
        gameId: "60000000-0000-4000-8000-000000000001",
        title: "Game A",
      },
      error: null,
    });
    mocks.createClient.mockResolvedValue({ rpc });

    const formData = new FormData();
    formData.set("sessionId", sessionId);
    const result = await drawGoForceSelection({}, formData);

    expect(mocks.spinWheelOfNames).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("go_force_draw_fallback_selection", {
      target_session: sessionId,
    });
    expect(mocks.publishGoForceSessionUpdate).toHaveBeenCalledWith(sessionId);
    expect(result).toMatchObject({
      selectionId: "80000000-0000-4000-8000-000000000001",
      gameId: "60000000-0000-4000-8000-000000000001",
      title: "Game A",
      fallbackUsed: true,
      fallbackReason: "manual",
    });
  });

  it("automatically falls back when Wheel of Names is unreachable", async () => {
    mocks.getFacilitatorSessionView.mockResolvedValue({
      session: { id: sessionId, game_master_id: userId, status: "live", wheel_fallback_enabled: false },
      currentRound: { id: "70000000-0000-4000-8000-000000000001", round_number: 1 },
      currentSelection: null,
      remainingGames: [{ id: "60000000-0000-4000-8000-000000000002", title_snapshot: "Game B" }],
    });
    mocks.spinWheelOfNames.mockRejectedValue(
      new WheelOfNamesError("Wheel of Names is unavailable right now. Please retry.", "req-123"),
    );
    const rpc = vi.fn().mockResolvedValue({
      data: {
        selectionId: "80000000-0000-4000-8000-000000000002",
        gameId: "60000000-0000-4000-8000-000000000002",
        title: "Game B",
      },
      error: null,
    });
    mocks.createClient.mockResolvedValue({ rpc });

    const formData = new FormData();
    formData.set("sessionId", sessionId);
    const result = await drawGoForceSelection({}, formData);

    expect(mocks.spinWheelOfNames).toHaveBeenCalledTimes(1);
    expect(mocks.reportFailure).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "go-force.selection.spin-fallback" }),
    );
    expect(rpc).toHaveBeenCalledWith("go_force_draw_fallback_selection", {
      target_session: sessionId,
    });
    expect(result).toMatchObject({
      selectionId: "80000000-0000-4000-8000-000000000002",
      gameId: "60000000-0000-4000-8000-000000000002",
      title: "Game B",
      fallbackUsed: true,
      fallbackReason: "unreachable",
    });
  });
});
