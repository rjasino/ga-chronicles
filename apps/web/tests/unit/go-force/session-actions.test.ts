import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getVerifiedSession: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/session", () => ({ getVerifiedSession: mocks.getVerifiedSession }));

import { createGoForceSession } from "@/features/go-force/session-actions";

const participantId = "10000000-0000-4000-8000-000000000001";
const sessionId = "40000000-0000-4000-8000-000000000001";

function createForm() {
  const formData = new FormData();
  formData.set("gotyYear", "2026");
  formData.append("participantIds", participantId);
  return formData;
}

describe("createGoForceSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVerifiedSession.mockResolvedValue({
      userId: "admin-id",
      username: "admin",
      roles: ["admin"],
    });
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates the session and roster through the atomic RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: sessionId, error: null });

    await expect(createGoForceSession({}, createForm())).resolves.toEqual({
      sessionId,
      success: "Session ready. Confirm the roster and start it when the show begins.",
    });

    expect(mocks.rpc).toHaveBeenCalledWith("go_force_create_session", {
      target_goty_year: 2026,
      target_participant_ids: [participantId],
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/go-force/session/${sessionId}`);
  });

  it("maps an inactive selected account to its known domain message", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "ACTIVE_ACCOUNT_REQUIRED" },
    });

    await expect(createGoForceSession({}, createForm())).resolves.toEqual({
      error: "Every selected player must have an active account.",
    });

    expect(console.error).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
