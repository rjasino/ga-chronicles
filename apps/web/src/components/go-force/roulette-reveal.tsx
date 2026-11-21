export function RouletteReveal({ title }: { title: string }) {
  return (
    <div className="go-force-roulette" role="group" aria-label={`Roulette reveal for ${title}`}>
      <div className="go-force-roulette__wheel" aria-hidden="true">
        <span className="go-force-roulette__pointer" />
        <span className="go-force-roulette__center">
          <span className="go-force-roulette__spinning">Spinning…</span>
          <span className="go-force-roulette__selected">{title}</span>
        </span>
      </div>
      <p className="go-force-roulette__caption">Animated reveal of the server-selected game.</p>
    </div>
  );
}
