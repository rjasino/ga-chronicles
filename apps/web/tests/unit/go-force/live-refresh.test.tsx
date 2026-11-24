import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  removeChannel: vi.fn(),
  setAuth: vi.fn(),
  getSession: vi.fn(),
  channel: vi.fn(),
}));

vi.mock("next/navigation", () => {
  const router = { refresh: mocks.refresh };
  return { useRouter: () => router };
});
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: mocks.getSession },
    realtime: { setAuth: mocks.setAuth },
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  }),
}));

import { GoForceLiveRefresh } from "@/components/go-force/live-refresh";

describe("GoForceLiveRefresh", () => {
  let channel: {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  };
  let broadcastHandler: (() => void) | undefined;
  let statusHandler: ((status: string) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    broadcastHandler = undefined;
    statusHandler = undefined;
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "player-jwt" } },
      error: null,
    });
    mocks.setAuth.mockResolvedValue(undefined);
    channel = {
      on: vi.fn((_type: string, _filter: unknown, callback: () => void) => {
        broadcastHandler = callback;
        return channel;
      }),
      subscribe: vi.fn((callback: (status: string) => void) => {
        statusHandler = callback;
        return channel;
      }),
    };
    mocks.channel.mockReturnValue(channel);
  });

  afterEach(() => {
    cleanup();
  });

  it("refreshes on broadcasts, successful resubscription, browser reconnect, and return to the page", async () => {
    const view = render(<GoForceLiveRefresh sessionId="session-id" />);
    await waitFor(() => expect(channel.subscribe).toHaveBeenCalledOnce());
    expect(mocks.setAuth).toHaveBeenCalledWith("player-jwt");
    expect(mocks.channel).toHaveBeenCalledWith("go-force:session:session-id", {
      config: { private: true },
    });

    act(() => statusHandler?.("SUBSCRIBED"));
    act(() => statusHandler?.("SUBSCRIBED"));
    act(() => broadcastHandler?.());
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("focus"));

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(4));
    expect(view.getByText("Live updates on")).toBeVisible();
    view.unmount();
    expect(mocks.removeChannel).toHaveBeenCalledWith(channel);
  });
});
