"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  markGoForceLocalMutationFinished,
  markGoForceLocalMutationStarted,
} from "@/features/go-force/realtime";

/** Defer same-tab refreshes until the action settles; the broadcast updates other tabs. */
export function useGoForceLocalMutation(pending: boolean) {
  const active = useRef(false);

  const onSubmit = useCallback(() => {
    if (active.current) return;
    active.current = true;
    markGoForceLocalMutationStarted();
  }, []);

  useEffect(() => {
    if (pending || !active.current) return;
    active.current = false;
    markGoForceLocalMutationFinished();
  }, [pending]);

  useEffect(
    () => () => {
      if (!active.current) return;
      active.current = false;
      markGoForceLocalMutationFinished();
    },
    [],
  );

  return onSubmit;
}
