"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RouletteRevealProps = {
  status?: "pending" | "spinning" | "success" | "error";
  title?: string;
  animation?: string;
  animationFormat?: "gif" | "webp";
  animationDurationMs?: number;
  error?: string;
  onAnimationComplete?: () => void;
};

export function RouletteReveal({
  status = "success",
  title,
  animation,
  animationFormat = "gif",
  animationDurationMs = 0,
  error,
  onAnimationComplete,
}: RouletteRevealProps) {
  const [animationLoaded, setAnimationLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const completed = useRef(false);
  const currentStatus = useRef(status);
  const callback = useRef(onAnimationComplete);
  const pendingUnmount = useRef<number | null>(null);

  useEffect(() => {
    currentStatus.current = status;
    callback.current = onAnimationComplete;
  });

  const finishAnimation = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    callback.current?.();
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (status === "spinning" && (reducedMotion || !animation)) finishAnimation();
  }, [animation, finishAnimation, reducedMotion, status]);

  useEffect(() => {
    if (status !== "spinning" || !animationLoaded || reducedMotion) return;
    if (animationDurationMs <= 0) {
      finishAnimation();
      return;
    }
    const timer = window.setTimeout(finishAnimation, animationDurationMs);
    return () => window.clearTimeout(timer);
  }, [animationDurationMs, animationLoaded, finishAnimation, reducedMotion, status]);

  useEffect(() => {
    if (pendingUnmount.current !== null) {
      window.clearTimeout(pendingUnmount.current);
      pendingUnmount.current = null;
    }
    return () => {
      if (currentStatus.current !== "spinning") return;
      // Deferring one task avoids treating React Strict Mode's development
      // effect cleanup/replay as an interrupted presentation.
      pendingUnmount.current = window.setTimeout(() => {
        pendingUnmount.current = null;
        if (completed.current) return;
        completed.current = true;
        callback.current?.();
      }, 0);
    };
  }, []);

  useEffect(() => {
    if (status !== "spinning") return;
    const finishWhenInterrupted = () => finishAnimation();
    const finishWhenHidden = () => {
      if (document.visibilityState === "hidden") finishAnimation();
    };
    window.addEventListener("pagehide", finishWhenInterrupted);
    document.addEventListener("visibilitychange", finishWhenHidden);
    return () => {
      window.removeEventListener("pagehide", finishWhenInterrupted);
      document.removeEventListener("visibilitychange", finishWhenHidden);
    };
  }, [finishAnimation, status]);

  if (status === "pending") {
    return (
      <div className="go-force-roulette" aria-busy="true">
        <p className="go-force-roulette__caption" role="status">
          Waiting for the Wheel of Names animation…
        </p>
      </div>
    );
  }

  if (status === "spinning") {
    return (
      <div className="go-force-roulette" aria-live="polite" aria-busy="true">
        {animation && !reducedMotion && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="go-force-roulette__animation"
            src={`data:image/${animationFormat};base64,${animation}`}
            alt="Wheel of Names is spinning"
            onLoad={() => setAnimationLoaded(true)}
            onError={finishAnimation}
          />
        )}
        <p className="go-force-roulette__caption" role="status">
          {reducedMotion
            ? "Reduced motion is enabled. Showing the result."
            : animation
              ? "Wheel of Names spin in progress. The result will appear when it stops."
              : "The animation is unavailable. Showing the result."}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="go-force-roulette" aria-live="polite">
        <p className="go-force-roulette__error" role="alert">
          {error ?? "The spin could not be completed. Please retry."}
        </p>
      </div>
    );
  }

  const selectedTitle = title ?? "Selected game";
  return (
    <figure
      className="go-force-roulette"
      role="group"
      aria-label={`Roulette reveal for ${selectedTitle}`}
    >
      {animation && !reducedMotion && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="go-force-roulette__animation"
          src={`data:image/${animationFormat};base64,${animation}`}
          alt={`Wheel of Names spin animation ending with ${selectedTitle}`}
        />
      )}
      <p className="go-force-roulette__result" aria-live="polite">
        <span className="go-force-roulette__result-label">Selected game</span>
        <strong>{selectedTitle}</strong>
      </p>
      <figcaption className="go-force-roulette__caption">
        {animation ? (
          <>
            <span className="go-force-roulette__animated-note">
              Animated reveal of the server-selected game.
            </span>
            <span className="go-force-roulette__reduced-motion-note">
              Static result shown because reduced motion is enabled.
            </span>
          </>
        ) : (
          "The committed server-selected result."
        )}
      </figcaption>
    </figure>
  );
}
