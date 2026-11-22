"use client";

import Link from "next/link";
import { useActionState } from "react";
import { GoForceLiveRefresh } from "@/components/go-force/live-refresh";
import { GameDetailsCard } from "@/components/go-force/game-details-card";
import { VotingCountdown } from "@/components/go-force/voting-countdown";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ui/message";
import { Select, TextArea } from "@/components/ui/text-field";
import { submitGoForceGameVote, type GameActionState } from "@/features/go-force/game-actions";
import { submitGoForceFinalBallot, type BallotActionState } from "@/features/go-force/ballot-actions";
import { goLimitForRound, remainingGoVotes } from "@/features/go-force/rules";
import type { PlayerSessionView } from "@/features/go-force/types";

function VoteForm({ selectionId, canGo, remaining }: { selectionId: string; canGo: boolean; remaining: number }) {
  const [state, action, pending] = useActionState(submitGoForceGameVote, {} satisfies GameActionState);
  return (
    <form className="form-stack go-force-vote" action={action}>
      <input type="hidden" name="selectionId" value={selectionId} />
      <div className="form-actions">
        <Button purpose="success" name="choice" value="go" pending={pending} disabled={!canGo}>
          Go
        </Button>
        <Button purpose="error" name="choice" value="no-go" pending={pending}>
          No-go
        </Button>
      </div>
      <p className="m-0 text-[.88rem] text-muted">
        {canGo ? `${remaining} go vote${remaining === 1 ? "" : "s"} left this round.` : "No go votes left this round. You can still vote no-go."}
      </p>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
    </form>
  );
}

function BallotForm({ sessionId, finalists }: { sessionId: string; finalists: { gameId: string; title: string }[] }) {
  const [state, action, pending] = useActionState(submitGoForceFinalBallot, {} satisfies BallotActionState);
  return (
    <form className="form-stack go-force-ballot" action={action}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <Select label="Your GOTY finalist" name="finalistGameId" required defaultValue="">
        <option value="" disabled>Choose a finalist</option>
        {finalists.map((finalist) => (
          <option key={finalist.gameId} value={finalist.gameId}>{finalist.title}</option>
        ))}
      </Select>
      <TextArea label="Optional remark" name="remark" rows={3} maxLength={500} hint="Shown on the published results page with your vote." />
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      <Button purpose="primary" pending={pending}>Submit final ballot</Button>
    </form>
  );
}

function ClosedSelectionSummary({ data }: { data: PlayerSessionView }) {
  if (!data.currentRound) return null;
  const closed = data.selections
    .filter((selection) => selection.round_id === data.currentRound?.id && selection.voting_closed_at)
    .slice(-1)[0];
  if (!closed) return null;
  const ownVote = closed.votes.find((vote) => vote.participant_account_id === data.participant?.account_id);
  const goVotes = closed.votes.filter((vote) => vote.choice === "go").length;
  return (
    <section className="go-force-card border border-line bg-paper p-5" aria-live="polite">
      <p className="article-type m-0 mb-1 text-[.75rem] font-bold tracking-[.06em] text-red uppercase">Last selection</p>
      <h3 className="m-0 font-display text-[1.35rem] text-blue">{closed.game?.title_snapshot ?? "Selected game"}</h3>
      <p className="m-0 mt-2">
        {closed.advancement_outcome === "advanced"
          ? `Advanced with ${goVotes} go vote${goVotes === 1 ? "" : "s"}.`
          : "Eliminated: no player voted go."}
      </p>
      {ownVote && <p className="m-0 mt-2 text-muted">Your vote: <strong>{ownVote.choice}</strong></p>}
    </section>
  );
}

export function PlayerSession({ data }: { data: PlayerSessionView }) {
  const { session, participant, currentRound, currentSelection, ownVote, ownFinalBallotVote, finalists } = data;

  if (!participant) {
    return (
      <section className="go-force-card border border-line bg-paper p-5">
        <h2 className="m-0 font-display text-[1.5rem] text-blue">You are not on this session roster</h2>
        <p>This Go Force session was locked before you joined. Ask the game master to include you in a future session.</p>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 font-semibold">Playing as {participant.display_name_snapshot}</p>
        <GoForceLiveRefresh sessionId={session.id} />
      </div>

      {session.status === "ready" && (
        <section className="go-force-card border border-line bg-paper p-5">
          <h2 className="m-0 font-display text-[1.7rem] text-blue">You are on the roster</h2>
          <p>The game master will start the {session.goty_year} Go Force session shortly. No late participants can join once it starts.</p>
        </section>
      )}

      {session.status === "live" && currentRound && (
        <section className="go-force-card border border-line p-5">
          <p className="article-type m-0 mb-1 text-[.75rem] font-bold tracking-[.06em] text-red uppercase">Round {currentRound.round_number} of 3</p>
          <h2 className="m-0 font-display text-[1.7rem] text-blue">Your vote screen</h2>
          <p className="mt-2 text-muted">This round allows {goLimitForRound(currentRound.round_number)} go vote{goLimitForRound(currentRound.round_number) === 1 ? "" : "s"} per player. No-go votes are unlimited.</p>

          {currentSelection ? (
            <div className="go-force-card mt-4 border border-line bg-paper p-5">
              <p className="article-type m-0 mb-1 text-[.75rem] font-bold tracking-[.06em] text-red uppercase">Now voting</p>
              <GameDetailsCard
                title={currentSelection.game?.title_snapshot ?? "Selected game"}
                developer={currentSelection.game?.developer_snapshot}
                publisher={currentSelection.game?.publisher_snapshot}
                genre={currentSelection.game?.genre_snapshot}
                coverArtUrl={currentSelection.game?.cover_art_url_snapshot}
              />
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
              {ownVote ? (
                <p className="mt-3">Your vote is recorded as <strong>{ownVote.choice}</strong>. Watch the game master&apos;s screen for the result.</p>
              ) : (
                <>
                  <p className="mt-2">Your vote stays hidden from other players until the game master closes this selection.</p>
                  <VoteForm
                    selectionId={currentSelection.id}
                    canGo={remainingGoVotes(currentRound.round_number, data.goVotesUsedInRound) > 0}
                    remaining={remainingGoVotes(currentRound.round_number, data.goVotesUsedInRound)}
                  />
                </>
              )}
            </div>
          ) : (
            <p className="mt-4 border-l-4 border-blue bg-paper px-4 py-3">Waiting for the game master to draw the next game.</p>
          )}

          <ClosedSelectionSummary data={data} />
        </section>
      )}

      {session.status === "final_ballot" && (
        <section className="go-force-card border border-line p-5">
          <p className="article-type m-0 mb-1 text-[.75rem] font-bold tracking-[.06em] text-red uppercase">Final ballot</p>
          <h2 className="m-0 font-display text-[1.7rem] text-blue">Pick your Game of the Year</h2>
          <p className="mt-2 text-muted">The final ballot contains every Round 3 finalist. You may add one optional remark.</p>
          {session.final_ballot_deadline_at && (
            <VotingCountdown kind="final" deadlineAt={session.final_ballot_deadline_at} sessionId={session.id} />
          )}
          <ul className="m-4 grid list-none gap-3 p-0">
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
          {ownFinalBallotVote ? (
            <div className="border-l-4 border-success-line bg-success-bg px-4 py-3 text-success-ink">
              <p className="m-0 font-semibold">Your ballot is submitted.</p>
              <p className="m-0 mt-1">{finalists.find((finalist) => finalist.gameId === ownFinalBallotVote.finalist_game_id)?.title ?? "Finalist"}</p>
              {ownFinalBallotVote.remark && <p className="m-0 mt-1">Remark: {ownFinalBallotVote.remark}</p>}
            </div>
          ) : (
            <BallotForm sessionId={session.id} finalists={finalists} />
          )}
        </section>
      )}

      {session.status === "complete" && (
        <section className="go-force-card border border-line bg-paper p-5">
          <h2 className="m-0 font-display text-[1.7rem] text-blue">The GOTY has been decided</h2>
          <p>The final ballot is closed and the result has been recorded. {data.result?.results_visible ? "The results page is public." : "The results page will be published after the show."}</p>
          {data.result?.results_visible && <Link className="text-link" href={`/go-force/results/${session.id}`}>See the full results</Link>}
        </section>
      )}

      {session.status === "stopped_no_finalists" && (
        <section className="go-force-card border border-line bg-paper p-5">
          <h2 className="m-0 font-display text-[1.7rem] text-blue">This session stopped without finalists</h2>
          <p>No game advanced from the round, so there is no GOTY result. The game master must start a fresh session.</p>
        </section>
      )}

      {session.status === "incomplete_vote_threshold" && (
        <section className="go-force-card border border-line bg-paper p-5">
          <h2 className="m-0 font-display text-[1.7rem] text-blue">This session did not meet completion requirements</h2>
          <p>At least 80% of expected votes and every player&apos;s Round 3 go are required. No GOTY result was published for this session.</p>
        </section>
      )}
    </div>
  );
}
