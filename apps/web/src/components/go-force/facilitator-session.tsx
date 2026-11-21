"use client";

import Link from "next/link";
import { useActionState } from "react";
import { GoForceLiveRefresh } from "@/components/go-force/live-refresh";
import { GameDetailsCard } from "@/components/go-force/game-details-card";
import { RouletteReveal } from "@/components/go-force/roulette-reveal";
import { VotingCountdown } from "@/components/go-force/voting-countdown";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ui/message";
import { closeGoForceSelection, drawGoForceSelection, type GameActionState } from "@/features/go-force/game-actions";
import { startGoForceSession, type SessionActionState } from "@/features/go-force/session-actions";
import { closeGoForceFinalBallot, type BallotActionState } from "@/features/go-force/ballot-actions";
import { goLimitForRound } from "@/features/go-force/rules";
import type { FacilitatorSessionView, GameVote, SelectionWithVotes, SessionParticipant } from "@/features/go-force/types";

function StartSessionForm({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(startGoForceSession, {} satisfies SessionActionState);
  return (
    <form className="form-stack" action={action}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <p className="m-0">Starting locks the roster and the eligible-game snapshot for this session. No late players can join.</p>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      <Button purpose="primary" pending={pending}>Start session</Button>
    </form>
  );
}

function DrawForm({
  sessionId,
  disabled,
  state,
  action,
  pending,
}: {
  sessionId: string;
  disabled: boolean;
  state: GameActionState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  return (
    <form className="form-stack" action={action}>
      <input type="hidden" name="sessionId" value={sessionId} />
      {state.error && <RouletteReveal status="error" error={state.error} />}
      {pending && <RouletteReveal status="pending" />}
      <Button purpose="primary" pending={pending} disabled={disabled}>Spin the roulette</Button>
    </form>
  );
}

function CloseSelectionForm({ sessionId, selectionId }: { sessionId: string; selectionId: string }) {
  const [state, action, pending] = useActionState(closeGoForceSelection, {} satisfies GameActionState);
  return (
    <form className="form-stack" action={action}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="selectionId" value={selectionId} />
      {state.error && <Message tone="error">{state.error}</Message>}
      <Button purpose="primary" pending={pending}>Close voting</Button>
    </form>
  );
}

function CloseBallotForm({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(closeGoForceFinalBallot, {} satisfies BallotActionState);
  return (
    <form className="form-stack" action={action}>
      <input type="hidden" name="sessionId" value={sessionId} />
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      <Button purpose="primary" pending={pending}>Close final ballot</Button>
    </form>
  );
}

function VoteBreakdown({ selection, participants }: { selection: SelectionWithVotes; participants: SessionParticipant[] }) {
  const count = (choice: GameVote["choice"]) => selection.votes.filter((vote) => vote.choice === choice).length;
  return (
    <div className="go-force-card border border-line bg-paper p-5" aria-live="polite">
      <p className="article-type m-0 mb-1 text-[.75rem] font-bold tracking-[.06em] text-red uppercase">Selection result</p>
      <h3 className="m-0 font-display text-[1.5rem] text-blue">{selection.game?.title_snapshot ?? "Selected game"}</h3>
      <p className="mt-2">
        <strong>{selection.advancement_outcome === "advanced" ? "Advances" : "Eliminated"}</strong>
        {" · "}{count("go")} go · {count("no-go")} no-go · {count("abstain")} abstain
      </p>
      <ul className="m-3 grid list-none gap-1.5 p-0">
        {participants.map((participant) => {
          const vote = selection.votes.find((row) => row.participant_account_id === participant.account_id);
          return (
            <li key={participant.account_id} className="flex justify-between gap-3 border-b border-line pb-1">
              <span>{participant.display_name_snapshot}</span>
              <strong>{vote?.choice ?? "abstain"}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RoundThreeGoStatus({ data }: { data: FacilitatorSessionView }) {
  if (data.currentRound?.round_number !== 3) return null;
  return (
    <div className="go-force-card border border-line bg-paper p-5">
      <h3 className="m-0 font-display text-[1.2rem] text-blue">Round 3 go check</h3>
      <p className="m-0 mt-1 text-muted">Every player must spend exactly one go before the final ballot.</p>
      <ul className="m-3 grid list-none gap-1 p-0">
        {data.participants.filter((participant) => participant.active).map((participant) => (
          <li key={participant.account_id} className="flex justify-between gap-3">
            <span>{participant.display_name_snapshot}</span>
            <strong>{data.roundThreeGoCounts[participant.account_id] ? "Used" : "Not used"}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FacilitatorSession({ data }: { data: FacilitatorSessionView }) {
  const [drawState, drawAction, drawPending] = useActionState(
    drawGoForceSelection,
    {} satisfies GameActionState,
  );
  const { session, participants, currentRound, currentSelection, closingSelection, remainingGames, finalists, ballotSubmittedCount } = data;
  const activeParticipants = participants.filter((participant) => participant.active);
  const submittedVotes = currentSelection?.votes.filter((vote) => vote.submitted_at).length ?? 0;
  const winnerTitles = (data.result?.winner_game_ids ?? []).map(
    (gameId) => data.games.find((game) => game.id === gameId)?.title_snapshot ?? "Winner",
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 font-semibold">GOTY {session.goty_year} · {session.status.replaceAll("_", " ")}</p>
        <GoForceLiveRefresh sessionId={session.id} />
      </div>

      {session.status === "ready" && (
        <section className="go-force-card border border-line p-5">
          <h2 className="m-0 font-display text-[1.7rem] text-blue">Roster confirmed</h2>
          <ol className="m-4 list-decimal pl-5">
            {activeParticipants.map((participant) => <li key={participant.account_id}>{participant.display_name_snapshot}</li>)}
          </ol>
          <StartSessionForm sessionId={session.id} />
        </section>
      )}

      {session.status === "live" && currentRound && (
        <section className="go-force-card border border-line p-5">
          <p className="article-type m-0 mb-1 text-[.75rem] font-bold tracking-[.06em] text-red uppercase">Round {currentRound.round_number} of 3</p>
          <h2 className="m-0 font-display text-[1.7rem] text-blue">Roulette and vote control</h2>
          <p className="mt-2 text-muted">
            {goLimitForRound(currentRound.round_number)} go vote{goLimitForRound(currentRound.round_number) === 1 ? "" : "s"} per player.
            {" "}{remainingGames.length} game{remainingGames.length === 1 ? "" : "s"} left to select in this round.
          </p>

          {currentSelection ? (
            <div className="mt-4 grid gap-4">
              <div className="border-l-4 border-blue bg-paper px-4 py-3">
                <p className="m-0 text-[.75rem] font-bold tracking-[.06em] text-red uppercase">Voting open</p>
                <RouletteReveal
                  key={currentSelection.id}
                  title={currentSelection.game?.title_snapshot ?? "Selected game"}
                  animation={drawState.selectionId === currentSelection.id ? drawState.animation : undefined}
                />
                <GameDetailsCard
                  title={currentSelection.game?.title_snapshot ?? "Selected game"}
                  developer={currentSelection.game?.developer_snapshot}
                  publisher={currentSelection.game?.publisher_snapshot}
                  genre={currentSelection.game?.genre_snapshot}
                  coverArtUrl={currentSelection.game?.cover_art_url_snapshot}
                />
                <p className="m-0 mt-1">{submittedVotes} of {activeParticipants.length} players have submitted. Individual votes stay hidden on player screens.</p>
                {currentSelection.voting_deadline_at && (
                  <div className="mt-3">
                    <VotingCountdown
                      kind="round"
                      deadlineAt={currentSelection.voting_deadline_at}
                      sessionId={session.id}
                      selectionId={currentSelection.id}
                    />
                  </div>
                )}
              </div>
              <CloseSelectionForm sessionId={session.id} selectionId={currentSelection.id} />
            </div>
          ) : (
            <DrawForm
              sessionId={session.id}
              disabled={remainingGames.length === 0}
              state={drawState}
              action={drawAction}
              pending={drawPending}
            />
          )}

          {closingSelection && <VoteBreakdown selection={closingSelection} participants={activeParticipants} />}
          <RoundThreeGoStatus data={data} />
        </section>
      )}

      {session.status === "final_ballot" && (
        <section className="go-force-card border border-line p-5">
          <h2 className="m-0 font-display text-[1.7rem] text-blue">Final ballot</h2>
          <p>{ballotSubmittedCount} of {activeParticipants.length} players have submitted a final ballot.</p>
          {session.final_ballot_deadline_at && (
            <VotingCountdown kind="final" deadlineAt={session.final_ballot_deadline_at} sessionId={session.id} />
          )}
          <ul className="m-3 grid list-none gap-3 p-0">
            {finalists.map((finalist) => (
              <li key={finalist.gameId}>
                <GameDetailsCard
                  title={finalist.title}
                  developer={finalist.developer}
                  publisher={finalist.publisher}
                  genre={finalist.genre}
                  coverArtUrl={finalist.coverArtUrl}
                />
              </li>
            ))}
          </ul>
          <CloseBallotForm sessionId={session.id} />
        </section>
      )}

      {session.status === "complete" && (
        <section className="go-force-card border border-line bg-paper p-5">
          <p className="article-type m-0 mb-1 text-[.75rem] font-bold tracking-[.06em] text-red uppercase">GOTY {session.goty_year}</p>
          <h2 className="m-0 font-display text-[1.7rem] text-blue">{winnerTitles.join(" / ") || "Winner recorded"}</h2>
          <p>Vote completion: {session.vote_completion_percentage ?? 0}%.</p>
          <p>{data.result?.results_visible ? "The results page is public." : "The results page is hidden until an admin publishes it."}</p>
          {data.result?.results_visible ? (
            <Link className="text-link" href={`/go-force/results/${session.id}`}>Open results page</Link>
          ) : (
            <Link className="text-link" href="/admin/go-force">Publish results from the admin page</Link>
          )}
        </section>
      )}

      {session.status === "stopped_no_finalists" && (
        <section className="go-force-card border border-line bg-paper p-5">
          <h2 className="m-0 font-display text-[1.7rem] text-blue">Session stopped: no finalists</h2>
          <p>No game advanced from the round. This session has no GOTY result. Start a fresh session from the admin page.</p>
          <Link className="text-link" href="/admin/go-force">Return to Go Force admin</Link>
        </section>
      )}

      {session.status === "incomplete_vote_threshold" && (
        <section className="go-force-card border border-line bg-paper p-5">
          <h2 className="m-0 font-display text-[1.7rem] text-blue">Session incomplete</h2>
          <p>At least 80% of expected votes and every player&apos;s Round 3 go are required. No GOTY result was published.</p>
          <Link className="text-link" href="/admin/go-force">Return to Go Force admin</Link>
        </section>
      )}

      <section className="go-force-card border border-line p-5">
        <h2 className="m-0 font-display text-[1.3rem] text-blue">Confirmed roster</h2>
        <p className="m-0 mt-1 text-muted">The roster is locked for this session.</p>
        <ul className="m-3 grid list-none gap-1 p-0">
          {activeParticipants.map((participant) => <li key={participant.account_id}>{participant.display_name_snapshot}</li>)}
        </ul>
      </section>
    </div>
  );
}
