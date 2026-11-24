import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  createClient: vi.fn(),
  getVerifiedSession: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  publishGoForceSessionUpdate: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: actions.refresh }));
vi.mock("@/lib/supabase/server", () => ({ createClient: actions.createClient }));
vi.mock("@/lib/supabase/session", () => ({ getVerifiedSession: actions.getVerifiedSession }));
vi.mock("@/features/go-force/realtime-broadcast", () => ({
  publishGoForceSessionUpdate: actions.publishGoForceSessionUpdate,
}));

import {
  closeGoForceFinalBallot,
  submitGoForceFinalBallot,
} from "@/features/go-force/ballot-actions";

const sessionId = "40000000-0000-4000-8000-000000000101";
const finalistGameId = "51000000-0000-4000-8000-000000000101";

function lookupQuery(data: unknown, error: unknown = null) {
  const query: Record<string, (...args: unknown[]) => unknown> = {};
  query.select = () => query;
  query.eq = () => query;
  query.maybeSingle = () => Promise.resolve({ data, error });
  return query;
}

function finalBallotForm() {
  const formData = new FormData();
  formData.set("sessionId", sessionId);
  formData.set("finalistGameId", finalistGameId);
  formData.set("remark", "A great co-op game.");
  return formData;
}

describe("final ballot session invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actions.getVerifiedSession.mockResolvedValue({
      userId: "10000000-0000-4000-8000-000000000001",
      username: "localreader",
      roles: [],
    });
    actions.from.mockReturnValue(lookupQuery({ id: sessionId }));
    actions.createClient.mockResolvedValue({ from: actions.from, rpc: actions.rpc });
    actions.rpc.mockResolvedValue({ data: { sessionId }, error: null });
  });

  it("publishes the resolved session only after a successful final vote", async () => {
    await expect(submitGoForceFinalBallot({}, finalBallotForm())).resolves.toEqual({
      success: "Final ballot submitted.",
    });

    expect(actions.rpc).toHaveBeenCalledWith("go_force_submit_final_ballot", {
      target_session: sessionId,
      target_game: finalistGameId,
      target_remark: "A great co-op game.",
    });
    expect(actions.publishGoForceSessionUpdate).toHaveBeenCalledWith(sessionId);
    expect(actions.refresh).not.toHaveBeenCalled();
  });

  it("does not publish when the final ballot mutation fails", async () => {
    actions.rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "BALLOT_NOT_OPEN" },
    });

    await expect(submitGoForceFinalBallot({}, finalBallotForm())).resolves.toMatchObject({
      error: "The final ballot is not open.",
    });
    expect(actions.publishGoForceSessionUpdate).not.toHaveBeenCalled();
  });

  it("publishes a completed final ballot only after the database transition succeeds", async () => {
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    actions.rpc.mockResolvedValue({
      data: { status: "complete", completion: 100 },
      error: null,
    });

    await expect(closeGoForceFinalBallot({}, formData)).resolves.toMatchObject({
      success: expect.stringContaining("Vote completion: 100%"),
    });
    expect(actions.publishGoForceSessionUpdate).toHaveBeenCalledWith(sessionId);
  });
});
