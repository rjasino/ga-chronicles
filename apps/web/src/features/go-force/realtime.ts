import type { SupabaseClient } from "@supabase/supabase-js";

export const GO_FORCE_UPDATED_EVENT = "session-updated";
export const GO_FORCE_LOCAL_MUTATION_STARTED_EVENT = "go-force-local-mutation-started";
export const GO_FORCE_LOCAL_MUTATION_FINISHED_EVENT = "go-force-local-mutation-finished";

export function markGoForceLocalMutationStarted(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GO_FORCE_LOCAL_MUTATION_STARTED_EVENT));
  }
}

export function markGoForceLocalMutationFinished(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GO_FORCE_LOCAL_MUTATION_FINISHED_EVENT));
  }
}

export function goForceSessionTopic(sessionId: string): string {
  return `go-force:session:${sessionId}`;
}

/**
 * Subscribes to a private Go Force session channel. Payloads are only a change
 * signal: views reload the authorized, persisted session state after every event.
 */
export async function connectGoForceSession(
  client: SupabaseClient,
  sessionId: string,
  onUpdate: () => void,
  onSubscribed?: () => void,
  onConnectionChange?: (connected: boolean) => void,
  onConnectionError?: (status: string, error?: Error) => void,
  signal?: AbortSignal,
): Promise<() => void> {
  const {
    data: { session },
    error,
  } = await client.auth.getSession();
  if (signal?.aborted) return () => {};
  if (error || !session?.access_token) {
    onConnectionError?.("UNAUTHENTICATED", error ?? undefined);
    return () => {};
  }

  // Private topic authorization requires the signed-in user's JWT, not the
  // public anon API key, so install it before joining the channel.
  await client.realtime.setAuth(session.access_token);
  if (signal?.aborted) return () => {};
  const channel = client.channel(goForceSessionTopic(sessionId), { config: { private: true } });
  let hasSubscribed = false;
  channel
    .on("broadcast", { event: GO_FORCE_UPDATED_EVENT }, () => onUpdate())
    .subscribe((status, error) => {
      if (status === "SUBSCRIBED") {
        onConnectionChange?.(true);
        if (hasSubscribed) onSubscribed?.();
        hasSubscribed = true;
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onConnectionChange?.(false);
        onConnectionError?.(status, error);
      } else if (status === "CLOSED") {
        // removeChannel during unmount reports CLOSED; it is cleanup, not a
        // failed subscription. The browser online/focus handlers reconcile state.
        onConnectionChange?.(false);
      }
    });
  return () => {
    void client.removeChannel(channel);
  };
}
