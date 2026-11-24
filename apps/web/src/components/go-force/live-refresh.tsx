"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  connectGoForceSession,
  GO_FORCE_LOCAL_MUTATION_FINISHED_EVENT,
  GO_FORCE_LOCAL_MUTATION_STARTED_EVENT,
} from "@/features/go-force/realtime";

/**
 * A broadcast is only a signal to reload the current route. The server still
 * applies RLS when the refreshed view is fetched, so private ballot data stays
 * hidden from player screens until the facilitator closes a selection.
 */
export function GoForceLiveRefresh({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const controller = new AbortController();
    let cleanup: (() => void) | undefined;
    let activeLocalMutations = 0;
    const pendingRefreshTimers = new Set<number>();
    const refresh = () => router.refresh();
    const refreshIfNoLocalMutation = () => {
      if (activeLocalMutations === 0) refresh();
    };
    const scheduleRefreshIfNoLocalMutation = (delay = 0) => {
      const timer = window.setTimeout(() => {
        pendingRefreshTimers.delete(timer);
        refreshIfNoLocalMutation();
      }, delay);
      pendingRefreshTimers.add(timer);
    };
    const handlePageReturn = () => scheduleRefreshIfNoLocalMutation();
    const handleLocalMutationStarted = () => {
      activeLocalMutations += 1;
    };
    const handleLocalMutationFinished = () => {
      activeLocalMutations = Math.max(0, activeLocalMutations - 1);
      if (activeLocalMutations === 0) scheduleRefreshIfNoLocalMutation(50);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleRefreshIfNoLocalMutation();
    };

    window.addEventListener("online", handlePageReturn);
    window.addEventListener("focus", handlePageReturn);
    window.addEventListener(GO_FORCE_LOCAL_MUTATION_STARTED_EVENT, handleLocalMutationStarted);
    window.addEventListener(GO_FORCE_LOCAL_MUTATION_FINISHED_EVENT, handleLocalMutationFinished);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    void connectGoForceSession(
      supabase,
      sessionId,
      refreshIfNoLocalMutation,
      refresh,
      setConnected,
      (status, error) => {
        console.error("Go Force Realtime subscription failed", { status, error });
        setConnectionError(status);
      },
      controller.signal,
    )
      .then((disconnect) => {
        cleanup = disconnect;
      })
      .catch((error: unknown) => {
        console.error("Go Force Realtime connection failed", error);
        setConnectionError("CONNECTION_FAILED");
      });

    return () => {
      controller.abort();
      window.removeEventListener("online", handlePageReturn);
      window.removeEventListener("focus", handlePageReturn);
      window.removeEventListener(GO_FORCE_LOCAL_MUTATION_STARTED_EVENT, handleLocalMutationStarted);
      window.removeEventListener(
        GO_FORCE_LOCAL_MUTATION_FINISHED_EVENT,
        handleLocalMutationFinished,
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      pendingRefreshTimers.forEach((timer) => window.clearTimeout(timer));
      cleanup?.();
    };
  }, [router, sessionId]);

  return (
    <p className="live-status m-0 text-[.85rem] font-semibold text-muted" role="status">
      {connected
        ? "Live updates on"
        : connectionError
          ? "Live updates unavailable. Refresh to retry."
          : "Connecting live updates…"}
    </p>
  );
}
