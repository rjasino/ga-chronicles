import { VoteChoiceLabel } from "@/components/go-force/vote-choice-label";
import type { RoundAdvancementSummary } from "@/features/go-force/types";

export function RoundAdvancementCard({ summaries }: { summaries: RoundAdvancementSummary[] }) {
  if (summaries.length === 0) return null;

  return (
    <section
      className="go-force-card border border-line bg-paper p-5"
      aria-label="Round advancement summary"
    >
      <h2 className="m-0 font-display text-[1.3rem] text-blue">
        Games advancing to the next round
      </h2>
      <div className="mt-4 grid gap-4">
        {summaries.map((summary) => {
          const statusLabel = summary.status === "complete" ? "Confirmed" : "Advancing so far";
          return (
            <section
              key={summary.roundNumber}
              className="border-t border-line pt-3"
              aria-label={`Round ${summary.roundNumber} · ${statusLabel}`}
            >
              <h3 className="m-0 font-display text-[1.1rem] text-blue">
                Round {summary.roundNumber} · {statusLabel}
              </h3>
              {summary.games.length > 0 ? (
                <ul className="m-3 grid list-none gap-2 p-0">
                  {summary.games.map((game) => (
                    <li
                      key={game.gameId}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2"
                    >
                      <span className="font-semibold">{game.title}</span>
                      <span className="inline-flex items-center gap-2">
                        <span className="font-semibold text-success-ink">{game.goVotes}</span>{" "}
                        <VoteChoiceLabel choice="go" />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 mt-2 text-muted">
                  {summary.status === "complete"
                    ? "No games advanced from this round."
                    : "No games have qualified from this round yet."}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
