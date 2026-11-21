"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { expireGoForceFinalBallot } from "@/features/go-force/ballot-actions";
import { expireGoForceSelection } from "@/features/go-force/game-actions";

type CountdownProps = {
  deadlineAt: string;
  sessionId: string;
} & ({ kind: "round"; selectionId: string } | { kind: "final" });

export function VotingCountdown(props: CountdownProps) {
  const { deadlineAt, sessionId, kind } = props;
  const selectionId = props.kind === "round" ? props.selectionId : undefined;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const attempting = useRef(false);
  const retryTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
    },
    [],
  );

  useEffect(() => {
    const update = () => {
      const remaining = Math.max(0, Math.ceil((Date.parse(deadlineAt) - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [deadlineAt]);

  useEffect(() => {
    if (secondsLeft !== 0 || attempting.current) return;
    attempting.current = true;

    startTransition(async () => {
      try {
        const result =
          kind === "round" && selectionId
            ? await expireGoForceSelection(selectionId)
            : kind === "final"
              ? await expireGoForceFinalBallot(sessionId)
              : { closed: false };
        if (!result.closed) {
          retryTimer.current = window.setTimeout(() => setRetry((value) => value + 1), 1000);
        }
      } catch {
        retryTimer.current = window.setTimeout(() => setRetry((value) => value + 1), 1000);
      } finally {
        attempting.current = false;
      }
    });
  }, [kind, retry, secondsLeft, selectionId, sessionId]);

  const label = kind === "round" ? "Round voting" : "Final ballot";
  return (
    <p
      className="go-force-countdown m-0 font-semibold text-blue"
      role="timer"
      aria-label={
        secondsLeft === 0
          ? `${label} timer expired`
          : `${label} closes in ${secondsLeft ?? "…"} seconds`
      }
    >
      {secondsLeft === null
        ? `${label} timer starting…`
        : secondsLeft === 0
          ? "Time is up. Closing voting…"
          : `${label} closes in ${secondsLeft} second${secondsLeft === 1 ? "" : "s"}.`}
    </p>
  );
}
