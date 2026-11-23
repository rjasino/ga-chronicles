import { getPublicEnv, getServiceRoleKey } from "@/lib/env";
import { reportFailure } from "@/lib/error-logging";
import { GO_FORCE_UPDATED_EVENT, goForceSessionTopic } from "@/features/go-force/realtime";

/**
 * Publishes a private Broadcast after a session mutation has been persisted.
 * A broadcast failure is logged and never changes the authoritative result.
 */
export async function publishGoForceSessionUpdate(sessionId: string): Promise<void> {
  let serviceRoleKey: string;
  try {
    serviceRoleKey = getServiceRoleKey();
  } catch {
    console.warn("Go Force Realtime broadcast skipped: SUPABASE_SERVICE_ROLE_KEY is not configured.");
    return;
  }

  const url = `${getPublicEnv().NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/realtime/v1/api/broadcast`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: goForceSessionTopic(sessionId),
            event: GO_FORCE_UPDATED_EVENT,
            payload: { sessionId },
            private: true,
          },
        ],
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      reportFailure({
        operation: "go-force.realtime.broadcast",
        error: new Error("Realtime broadcast was rejected."),
        context: { status: response.status, sessionId },
      });
    }
  } catch (error) {
    reportFailure({
      operation: "go-force.realtime.broadcast",
      error,
      context: { sessionId },
    });
  }
}
