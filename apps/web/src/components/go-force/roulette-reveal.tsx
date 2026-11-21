type RouletteRevealProps = {
  status?: "pending" | "success" | "error";
  title?: string;
  animation?: string;
  error?: string;
};

export function RouletteReveal({
  status = "success",
  title,
  animation,
  error,
}: RouletteRevealProps) {
  if (status === "pending") {
    return (
      <div className="go-force-roulette" aria-live="polite">
        <div className="go-force-roulette__wheel" aria-hidden="true">
          <span className="go-force-roulette__pointer" />
          <span className="go-force-roulette__center">Spinning…</span>
        </div>
        <p className="go-force-roulette__caption" role="status">
          Wheel of Names spin in progress. No game is selected until the result is committed.
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
      {animation && (
        <img
          className="go-force-roulette__animation"
          src={`data:image/gif;base64,${animation}`}
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
            <span className="go-force-roulette__animated-note">Animated reveal of the server-selected game.</span>
            <span className="go-force-roulette__reduced-motion-note">Static result shown because reduced motion is enabled.</span>
          </>
        ) : (
          "The committed server-selected result."
        )}
      </figcaption>
    </figure>
  );
}
