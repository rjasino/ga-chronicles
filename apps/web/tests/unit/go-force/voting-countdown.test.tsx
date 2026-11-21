import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const expiryActions = vi.hoisted(() => ({
  expireSelection: vi.fn(),
  expireFinalBallot: vi.fn(),
}));

vi.mock("@/features/go-force/game-actions", () => ({
  expireGoForceSelection: expiryActions.expireSelection,
}));
vi.mock("@/features/go-force/ballot-actions", () => ({
  expireGoForceFinalBallot: expiryActions.expireFinalBallot,
}));

import { VotingCountdown } from "@/components/go-force/voting-countdown";

describe("Go Force voting countdown", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("requests server-side closure when a round timer expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T12:00:00.000Z"));
    expiryActions.expireSelection.mockResolvedValue({ closed: true });

    render(
      <VotingCountdown
        kind="round"
        deadlineAt="2026-11-21T12:00:01.000Z"
        sessionId="40000000-0000-4000-8000-000000000001"
        selectionId="80000000-0000-4000-8000-000000000001"
      />,
    );

    expect(screen.getByRole("timer")).toHaveTextContent("Round voting closes in 1 second.");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1250);
    });
    expect(expiryActions.expireSelection).toHaveBeenCalledWith(
      "80000000-0000-4000-8000-000000000001",
    );
    expect(expiryActions.expireFinalBallot).not.toHaveBeenCalled();
  });

  it("uses the final-ballot expiry action separately", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T12:00:00.000Z"));
    expiryActions.expireFinalBallot.mockResolvedValue({ closed: true });

    render(
      <VotingCountdown
        kind="final"
        deadlineAt="2026-11-21T12:00:00.500Z"
        sessionId="40000000-0000-4000-8000-000000000002"
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(750);
    });
    expect(expiryActions.expireFinalBallot).toHaveBeenCalledWith(
      "40000000-0000-4000-8000-000000000002",
    );
    expect(expiryActions.expireSelection).not.toHaveBeenCalled();
  });
});
