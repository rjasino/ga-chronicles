type GameDetailsCardProps = {
  title: string;
  developer?: string | null;
  publisher?: string | null;
  genre?: string | null;
  coverArtUrl?: string | null;
};

export function GameDetailsCard({
  title,
  developer,
  publisher,
  genre,
  coverArtUrl,
}: GameDetailsCardProps) {
  const details = [
    ["Developer", developer],
    ["Publisher", publisher],
    ["Genre", genre],
  ].filter((detail): detail is [string, string] => Boolean(detail[1]));

  return (
    <article className="go-force-game-details grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 border border-line bg-card p-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:p-4">
      <div className="go-force-game-details__cover aspect-[3/4] overflow-hidden border border-line bg-brand-band">
        {coverArtUrl ? (
          // Native img allows admin-provided HTTPS URLs without widening Next's remote image allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="size-full object-cover"
            src={coverArtUrl}
            alt={`Cover art for ${title}`}
            width={224}
            height={298}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="grid size-full place-items-center font-display text-3xl font-bold text-yellow"
            role="img"
            aria-label={`No cover art for ${title}`}
          >
            {title.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="m-0 font-display text-[1.35rem] leading-tight text-blue">{title}</h3>
        {details.length > 0 ? (
          <dl className="mt-3 grid gap-1 text-[.92rem] sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="flex flex-wrap gap-x-1">
                <dt className="font-semibold">{label}:</dt>
                <dd className="m-0 text-muted">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="m-0 mt-2 text-[.9rem] text-muted">Game details have not been added.</p>
        )}
      </div>
    </article>
  );
}
