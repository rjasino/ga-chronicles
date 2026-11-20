import Link from "next/link";
import type { PublicResultsView, SessionParticipant } from "@/features/go-force/types";

function nameFor(participants: SessionParticipant[], accountId: string): string {
  return participants.find((participant) => participant.account_id === accountId)?.display_name_snapshot ?? "Player";
}

export function GoForceResultsPage({ data }: { data: PublicResultsView }) {
  const { session, participants, rounds, selections, finalists, winners, finalBallotVotes, result } = data;
  const submittedBallots = finalBallotVotes.filter((vote) => vote.submitted_at);

  return (
    <div className="grid gap-8">
      <section className="border-b-[3px] border-blue pb-6">
        <p className="article-type m-0 mb-2 text-[.78rem] font-bold tracking-[.06em] text-red uppercase">GOTY {session.goty_year}</p>
        <h1 className="m-0 font-display text-[clamp(2.8rem,7vw,5rem)] leading-[1] tracking-[-.05em] text-blue">
          {winners.map((winner) => winner.title).join(" / ") || "GOTY results"}
        </h1>
        <p className="mt-3 text-muted">
          {winners.length > 1 ? "Co-winners after a tied final ballot." : "Winner of the final ballot."}
          {" "}Vote completion: {session.vote_completion_percentage ?? 0}%.
          {session.completed_at ? ` Published after the ${new Date(session.completed_at).toLocaleDateString()} show.` : ""}
        </p>
        <p className="m-0 mt-2">
          <Link className="text-link" href="/go-force">Back to Go Force</Link>
        </p>
      </section>

      <section className="go-force-card border border-line p-5" aria-labelledby="go-force-finalists">
        <h2 id="go-force-finalists" className="m-0 font-display text-[1.6rem] text-blue">Final ballot</h2>
        <p className="m-0 mt-1 text-muted">Every Round 3 finalist, with the final vote count.</p>
        <ul className="m-4 grid list-none gap-2 p-0">
          {finalists.map((finalist) => {
            const isWinner = result?.winner_game_ids.includes(finalist.gameId);
            return (
              <li key={finalist.gameId} className={`flex items-baseline justify-between gap-3 border px-4 py-3 ${isWinner ? "border-gold bg-notice-bg font-bold" : "border-line"}`}>
                <span>{finalist.title}{isWinner ? " — GOTY" : ""}</span>
                <span>{finalist.votes} vote{finalist.votes === 1 ? "" : "s"}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {rounds.map((round) => {
        const roundSelections = selections.filter((selection) => selection.round_id === round.id);
        return (
          <section key={round.id} className="go-force-card border border-line p-5" aria-labelledby={`go-force-round-${round.id}`}>
            <h2 id={`go-force-round-${round.id}`} className="m-0 font-display text-[1.6rem] text-blue">Round {round.round_number}</h2>
            <p className="m-0 mt-1 text-muted">
              {round.round_number === 1 ? "All eligible games." : `Games that advanced from Round ${round.round_number - 1}.`}
              {" "}{round.go_limit} go vote{round.go_limit === 1 ? "" : "s"} per player.
            </p>
            {roundSelections.length ? (
              <ul className="m-4 grid list-none gap-4 p-0">
                {roundSelections.map((selection) => {
                  const goCount = selection.votes.filter((vote) => vote.choice === "go").length;
                  return (
                    <li key={selection.id} className="border border-line bg-paper p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <strong className="font-display text-[1.15rem] text-blue">{selection.game?.title_snapshot ?? "Game"}</strong>
                        <span className={selection.advancement_outcome === "advanced" ? "font-semibold text-success-ink" : "font-semibold text-danger-ink"}>
                          {selection.advancement_outcome === "advanced" ? `Advanced · ${goCount} go` : "Eliminated · no go votes"}
                        </span>
                      </div>
                      <ul className="m-2 grid list-none gap-1 p-0 text-[.92rem]">
                        {participants.map((participant) => {
                          const vote = selection.votes.find((row) => row.participant_account_id === participant.account_id);
                          return (
                            <li key={participant.account_id} className="flex justify-between gap-3 border-b border-line pb-1">
                              <span>{participant.display_name_snapshot}</span>
                              <span>{vote?.choice ?? "abstain"}{vote && !vote.submitted_at ? " (missing)" : ""}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted">No games were selected in this round.</p>
            )}
          </section>
        );
      })}

      <section className="go-force-card border border-line p-5" aria-labelledby="go-force-remarks">
        <h2 id="go-force-remarks" className="m-0 font-display text-[1.6rem] text-blue">Submitted remarks</h2>
        {submittedBallots.length ? (
          <ul className="m-4 grid list-none gap-3 p-0">
            {submittedBallots.map((vote) => {
              const finalist = finalists.find((row) => row.gameId === vote.finalist_game_id);
              return (
                <li key={vote.id} className="border-l-4 border-blue bg-paper px-4 py-3">
                  <p className="m-0 font-semibold">{nameFor(participants, vote.participant_account_id)}</p>
                  <p className="m-0 text-[.9rem] text-muted">Voted for {finalist?.title ?? "a finalist"}</p>
                  {vote.remark && <p className="m-0 mt-1">{vote.remark}</p>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted">No submitted ballots were recorded for this session.</p>
        )}
      </section>
    </div>
  );
}
