import type { SupabaseClient } from "@supabase/supabase-js";

export const GO_FORCE_UPDATED_EVENT = "session-updated";

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
): Promise<() => void> {
  try {
    await client.realtime.setAuth();
  } catch {
    // Anonymous or expired sessions fail closed; the channel policy still denies access.
  }
  const channel = client.channel(goForceSessionTopic(sessionId), { config: { private: true } });
  channel.on("broadcast", { event: GO_FORCE_UPDATED_EVENT }, () => onUpdate()).subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
