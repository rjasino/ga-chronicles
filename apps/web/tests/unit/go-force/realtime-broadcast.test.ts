import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicEnv: vi.fn(),
  getServiceRoleKey: vi.fn(),
  reportFailure: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getPublicEnv: mocks.getPublicEnv,
  getServiceRoleKey: mocks.getServiceRoleKey,
}));
vi.mock("@/lib/error-logging", () => ({ reportFailure: mocks.reportFailure }));

import { publishGoForceSessionUpdate } from "@/features/go-force/realtime-broadcast";

describe("publishGoForceSessionUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPublicEnv.mockReturnValue({ NEXT_PUBLIC_SUPABASE_URL: "http://localhost:55321" });
    mocks.getServiceRoleKey.mockReturnValue("server-only-test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("broadcasts only the session identifier on a private session topic", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal("fetch", fetch);

    await publishGoForceSessionUpdate("40000000-0000-4000-8000-000000000101");

    expect(fetch).toHaveBeenCalledOnce();
    const [url, request] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:55321/realtime/v1/api/broadcast");
    const payload = JSON.parse(String(request.body));
    expect(payload).toEqual({
      messages: [
        {
          topic: "go-force:session:40000000-0000-4000-8000-000000000101",
          event: "session-updated",
          payload: { sessionId: "40000000-0000-4000-8000-000000000101" },
          private: true,
        },
      ],
    });
    expect(JSON.stringify(payload)).not.toMatch(/choice|vote|remark|account/i);
  });

  it("logs a delivery failure but does not throw after the database action committed", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("Realtime unavailable"));
    vi.stubGlobal("fetch", fetch);

    await expect(
      publishGoForceSessionUpdate("40000000-0000-4000-8000-000000000101"),
    ).resolves.toBeUndefined();
    expect(mocks.reportFailure).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "go-force.realtime.broadcast" }),
    );
  });
});
