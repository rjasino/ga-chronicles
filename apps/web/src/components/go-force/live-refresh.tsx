"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { connectGoForceSession } from "@/features/go-force/realtime";

/**
 * A broadcast is only a signal to reload the current route. The server still
 * applies RLS when the refreshed view is fetched, so private ballot data stays
 * hidden from player screens until the facilitator closes a selection.
 */
export function GoForceLiveRefresh({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void connectGoForceSession(supabase, sessionId, () => router.refresh()).then((disconnect) => {
      if (cancelled) disconnect();
      else cleanup = disconnect;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [router, sessionId]);

  return <p className="live-status m-0 text-[.85rem] font-semibold text-muted" role="status">Live updates on</p>;
}
