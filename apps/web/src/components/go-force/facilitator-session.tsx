"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { LatePlayerForm } from "@/components/go-force/late-player-form";
import { GoForceLiveRefresh } from "@/components/go-force/live-refresh";
import { GameDetailsCard } from "@/components/go-force/game-details-card";
import { RoundAdvancementCard } from "@/components/go-force/round-advancement-card";
import { RouletteReveal } from "@/components/go-force/roulette-reveal";
import { VoteChoiceLabel } from "@/components/go-force/vote-choice-label";
import { VotingCountdown } from "@/components/go-force/voting-countdown";
import { useGoForceLocalMutation } from "@/components/go-force/use-local-mutation";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ui/message";
import {
  commitGoForceSelection,
  closeGoForceSelection,
  drawGoForceSelection,
  type GameActionState,
} from "@/features/go-force/game-actions";
import {
  setGoForceWheelFallback,
  startGoForceSession,
  type SessionActionState,
} from "@/features/go-force/session-actions";
import {
  closeGoForceFinalBallot,
  type BallotActionState,
} from "@/features/go-force/ballot-actions";
import { goLimitForRound } from "@/features/go-force/rules";
import {
  markGoForceLocalMutationFinished,
  markGoForceLocalMutationStarted,
} from "@/features/go-force/realtime";
import type {
  ActiveGoForceAccountOption,
  FacilitatorSessionView,
  GameVote,
  SelectionWithVotes,
  SessionParticipant,
} from "@/features/go-force/types";

function StartSessionForm({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(
    startGoForceSession,
    {} satisfies SessionActionState,
  );
  const onSubmit = useGoForceLocalMutation(pending);
  return (
    <form className="form-stack" action={action} onSubmit={onSubmit}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <p className="m-0">
        Starting locks the eligible-game snapshot. The initial roster is locked, but authorized
        admins and the game master can add late players while voting is open.
      </p>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      <Button purpose="primary" pending={pending}>
        Start session
      </Button>
    </form>
  );
}

function WheelFallbackToggleForm({
  sessionId,
  enabled,
}: {
  sessionId: string;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    setGoForceWheelFallback,
    {} satisfies SessionActionState,
  );
  const onSubmit = useGoForceLocalMutation(pending);
  const currentEnabled = state.wheelFallbackEnabled ?? enabled;

  return (
    <form className="form-stack border border-line bg-paper p-4" action={action} onSubmit={onSubmit}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="wheelFallbackEnabled" value={currentEnabled ? "false" : "true"} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 font-semibold">
            Draw mode:{" "}
            {currentEnabled ? "Pre-randomized fallback queue" : "Wheel of Names (with auto-fallback)"}
          </p>
          <p className="m-0 mt-1 text-[.88rem] text-muted">
            {currentEnabled
              ? "Draws pop one game at a time from a pre-randomized list of remaining games without calling Wheel of Names."
              : "Uses Wheel of Names first and automatically falls back to the pre-randomized remaining list if Wheel of Names is unreachable."}
          </p>
        </div>
        <Button purpose="secondary" pending={pending}>
          {currentEnabled ? "Switch to Wheel of Names" : "Use fallback queue"}
        </Button>
      </div>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
    </form>
  );
}

function DrawForm({
  sessionId,
  disabled,
  wheelFallbackEnabled,
  onDrawStateChange,
  onFallbackDraw,
}: {
  sessionId: string;
  disabled: boolean;
  wheelFallbackEnabled: boolean;
  onDrawStateChange: (active: boolean) => void;
  onFallbackDraw: (notice: string | undefined) => void;
}) {
  const [state, action, pending] = useActionState(
    drawGoForceSelection,
    {} satisfies GameActionState,
  );
  const [commitPending, setCommitPending] = useState(false);
  const [commitError, setCommitError] = useState<string>();
  const commitStarted = useRef(false);

  useEffect(() => {
    if (!pending && state.error) onDrawStateChange(false);
  }, [onDrawStateChange, pending, state.error]);

  useEffect(() => {
    if (!pending && state.selectionId && state.fallbackUsed) {
      onDrawStateChange(false);
      onFallbackDraw(state.success);
    }
  }, [onDrawStateChange, onFallbackDraw, pending, state.fallbackUsed, state.selectionId, state.success]);

  const openVoting = () => {
    if (!state.gameId || commitStarted.current) return;
    commitStarted.current = true;
    setCommitPending(true);
    setCommitError(undefined);
    startTransition(async () => {
      markGoForceLocalMutationStarted();
      try {
        const result = await commitGoForceSelection(sessionId, state.gameId!);
        setCommitPending(false);
        if (result.error) {
          commitStarted.current = false;
          setCommitError(result.error);
        }
      } catch {
        commitStarted.current = false;
        setCommitPending(false);
        setCommitError("Voting could not be opened. Please retry.");
      } finally {
        markGoForceLocalMutationFinished();
      }
    });
  };

  if (state.selectionId && state.fallbackUsed) {
    return (
      <div className="grid gap-3" aria-live="polite">
        {state.success && <Message tone="success">{state.success}</Message>}
      </div>
    );
  }

  if (state.gameId) {
    return (
      <div className="grid gap-3" aria-label="Prepared roulette selection">
        <RouletteReveal
          key={state.gameId}
          status="spinning"
          animation={state.animation}
          animationFormat={state.animationFormat}
          animationDurationMs={state.animationDurationMs}
          onAnimationComplete={() => {
            onDrawStateChange(false);
            openVoting();
          }}
        />
        {commitPending && (
          <p className="m-0 text-center text-muted" role="status">
            Spin complete. Opening voting…
          </p>
        )}
        {commitError && (
          <div className="grid justify-items-center gap-2">
            <Message tone="error">{commitError}</Message>
            <Button purpose="secondary" type="button" onClick={openVoting}>
              Retry opening voting
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      className="form-stack"
      action={action}
      onSubmit={() => {
        onFallbackDraw(undefined);
        onDrawStateChange(true);
      }}
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      {state.error && <RouletteReveal status="error" error={state.error} />}
      {pending && !wheelFallbackEnabled && <RouletteReveal status="pending" />}
      <Button purpose="primary" pending={pending} disabled={disabled}>
        {wheelFallbackEnabled ? "Draw next game (Fallback)" : "Spin the roulette"}
      </Button>
    </form>
  );
}

function CloseSelectionForm({
  sessionId,
  selectionId,
}: {
  sessionId: string;
  selectionId: string;
}) {
  const [state, action, pending] = useActionState(
    closeGoForceSelection,
    {} satisfies GameActionState,
  );
  const onSubmit = useGoForceLocalMutation(pending);
  return (
    <form className="form-stack" action={action} onSubmit={onSubmit}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="selectionId" value={selectionId} />
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      <Button purpose="primary" pending={pending}>
        Close voting
      </Button>
    </form>
  );
}

function CloseBallotForm({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(
    closeGoForceFinalBallot,
    {} satisfies BallotActionState,
  );
  const onSubmit = useGoForceLocalMutation(pending);
  return (
    <form className="form-stack" action={action} onSubmit={onSubmit}>
      <input type="hidden" name="sessionId" value={sessionId} />
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      <Button purpose="primary" pending={pending}>
        Close final ballot
      </Button>
    </form>
  );
}

export function VoteBreakdown({
  selection,
  participants,
}: {
  selection: SelectionWithVotes;
  participants: SessionParticipant[];
}) {
  const count = (choice: GameVote["choice"]) =>
    selection.votes.filter((vote) => vote.choice === choice).length;
  return (
    <div className="go-force-card border border-line bg-paper p-5" aria-live="polite">
      <p className="article-type m-0 mb-1 text-[.75rem] font-bold tracking-[.06em] text-red uppercase">
        Selection result
      </p>
      <GameDetailsCard
        title={selection.game?.title_snapshot ?? "Selected game"}
        developer={selection.game?.developer_snapshot}
        publisher={selection.game?.publisher_snapshot}
        genre={selection.game?.genre_snapshot}
        coverArtUrl={selection.game?.cover_art_url_snapshot}
      />
      <p className="mt-2">
        <strong>{selection.advancement_outcome === "advanced" ? "Advances" : "Eliminated"}</strong>
        {" · "}
        <span className="text-success-ink">{count("go")} go</span>
        {" · "}
        <span className="text-danger-ink">{count("no-go")} no-go</span>
        {" · "}
        <span className="text-muted">{count("abstain")} abstain</span>
      </p>
      <ul className="m-3 grid list-none gap-1.5 p-0">
        {participants.map((participant) => {
          const vote = selection.votes.find(
            (row) => row.participant_account_id === participant.account_id,
          );
          return (
            <li
              key={participant.account_id}
              className="flex justify-between gap-3 border-b border-line pb-1"
            >
              <span>{participant.display_name_snapshot}</span>
              {vote ? (
                <VoteChoiceLabel choice={vote.choice} />
              ) : (
                <span className="text-muted">Not eligible</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RoundThreeGoStatus({ data }: { data: FacilitatorSessionView }) {
  if (data.currentRound?.round_number !== 3) return null;
  const goVoterCount = Object.keys(data.roundThreeGoCounts).length;
  return (
    <div className="go-force-card border border-line bg-paper p-5">
      <h3 className="m-0 font-display text-[1.2rem] text-blue">Round 3 go check</h3>
      <p className="m-0 mt-1 text-muted">
        {goVoterCount} of {data.minimumRoundThreeGoVoters} required players have cast a Go. Other
        rostered players do not need to vote Go for the session to continue.
      </p>
      <ul className="m-3 grid list-none gap-1 p-0">
        {data.participants
          .filter((participant) => participant.active)
          .map((participant) => (
            <li key={participant.account_id} className="flex justify-between gap-3">
              <span>{participant.display_name_snapshot}</span>
              <strong>
                {data.roundThreeGoCounts[participant.account_id] ? "Go used" : "No Go"}
              </strong>
            </li>
          ))}
      </ul>
    </div>
  );
}

export function FacilitatorSession({
  data,
  addableAccounts,
  canAddParticipants,
}: {
  data: FacilitatorSessionView;
  addableAccounts: ActiveGoForceAccountOption[];
  canAddParticipants: boolean;
}) {
  const [drawInProgress, setDrawInProgress] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState<string>();
  const {
    session,
    participants,
    currentRound,
    currentSelection,
    closingSelection,
    remainingGames,
    finalists,
    ballotSubmittedCount,
  } = data;
  const activeParticipants = participants.filter((participant) => participant.active);
  const submittedVotes = data.selectionProgress?.submitted ?? 0;
  const eligibleVoters = data.selectionProgress?.eligible ?? activeParticipants.length;
  const winnerTitles = (data.result?.winner_game_ids ?? []).map(
    (gameId) => data.games.find((game) => game.id === gameId)?.title_snapshot ?? "Winner",
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 font-semibold">
          GOTY {session.goty_year} · {session.status.replaceAll("_", " ")}
        </p>
        <GoForceLiveRefresh sessionId={session.id} />
      </div>

      <section
        className="go-force-card border border-line bg-paper p-5"
        aria-labelledby="session-roster"
      >
        <h2 id="session-roster" className="m-0 font-display text-[1.3rem] text-blue">
          Session roster
        </h2>
        <p className="m-0 mt-1 text-muted">
          {canAddParticipants
            ? `${activeParticipants.length} of 64 players. The initial roster is locked; late players can still be added.`
            : session.status === "ready"
              ? "The ready roster can be adjusted from Go Force admin before the session starts."
              : "This session is closed to new players."}
        </p>
        <ul className="m-3 grid list-none gap-1 p-0">
          {activeParticipants.map((participant) => (
            <li key={participant.account_id}>{participant.display_name_snapshot}</li>
          ))}
        </ul>
        {canAddParticipants && (
          <LatePlayerForm
            sessionId={session.id}
            accounts={addableAccounts}
            participantCount={activeParticipants.length}
          />
        )}
      </section>

      <RoundAdvancementCard summaries={data.roundAdvancementSummaries} />

      {session.status === "ready" && (
        <section className="go-force-card border border-line p-5">
          <h2 className="m-0 font-display text-[1.7rem] text-blue">Roster confirmed</h2>
          <ol className="m-4 list-decimal pl-5">
            {activeParticipants.map((participant) => (
              <li key={participant.account_id}>{participant.display_name_snapshot}</li>
            ))}
          </ol>
          <div className="grid gap-4">
            <WheelFallbackToggleForm
              sessionId={session.id}
              enabled={session.wheel_fallback_enabled}
            />
            <StartSessionForm sessionId={session.id} />
          </div>
        </section>
      )}

      {session.status === "live" && currentRound && (
        <section className="go-force-card border border-line p-5">
          <p className="article-type m-0 mb-1 text-[.75rem] font-bold tracking-[.06em] text-red uppercase">
            Round {currentRound.round_number} of 3
          </p>
          <h2 className="m-0 font-display text-[1.7rem] text-blue">Roulette and vote control</h2>
          <p className="mt-2 text-muted">
            {goLimitForRound(currentRound.round_number)} go vote
            {goLimitForRound(currentRound.round_number) === 1 ? "" : "s"} per player.{" "}
            {remainingGames.length} game{remainingGames.length === 1 ? "" : "s"} left to select in
            this round.
          </p>
          <div className="my-4">
            <WheelFallbackToggleForm
              sessionId={session.id}
              enabled={session.wheel_fallback_enabled}
            />
          </div>

          {currentSelection ? (
            <div className="mt-4 grid gap-4">
              {fallbackNotice && <Message tone="success">{fallbackNotice}</Message>}
              <div className="border-l-4 border-blue bg-paper px-4 py-3">
                <p className="m-0 text-[.75rem] font-bold tracking-[.06em] text-red uppercase">
                  Voting open
                </p>
                <RouletteReveal
                  key={currentSelection.id}
                  title={currentSelection.game?.title_snapshot ?? "Selected game"}
                />
                <GameDetailsCard
                  title={currentSelection.game?.title_snapshot ?? "Selected game"}
                  developer={currentSelection.game?.developer_snapshot}
                  publisher={currentSelection.game?.publisher_snapshot}
                  genre={currentSelection.game?.genre_snapshot}
                  coverArtUrl={currentSelection.game?.cover_art_url_snapshot}
                />
                <p className="m-0 mt-1">
                  {submittedVotes} of {eligibleVoters} players have submitted. Individual votes stay
                  hidden on player screens.
                </p>
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
              wheelFallbackEnabled={session.wheel_fallback_enabled}
              onDrawStateChange={setDrawInProgress}
              onFallbackDraw={setFallbackNotice}
            />
          )}

          {closingSelection && !drawInProgress && (
            <VoteBreakdown selection={closingSelection} participants={activeParticipants} />
          )}
          <RoundThreeGoStatus data={data} />
        </section>
      )}

      {session.status === "final_ballot" && (
        <section className="go-force-card border border-line p-5">
          <h2 className="m-0 font-display text-[1.7rem] text-blue">Final ballot</h2>
          <p>
            {ballotSubmittedCount} of{" "}
            {data.finalBallotProgress?.eligible ?? activeParticipants.length} players have submitted
            a final ballot.
          </p>
          {session.final_ballot_deadline_at && (
            <VotingCountdown
              kind="final"
              deadlineAt={session.final_ballot_deadline_at}
              sessionId={session.id}
            />
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
          <p className="article-type m-0 mb-1 text-[.75rem] font-bold tracking-[.06em] text-red uppercase">
            GOTY {session.goty_year}
          </p>
          <h2 className="m-0 font-display text-[1.7rem] text-blue">
            {winnerTitles.join(" / ") || "Winner recorded"}
          </h2>
          <p>Vote completion: {session.vote_completion_percentage ?? 0}%.</p>
          <p>
            {data.result?.results_visible
              ? "The results page is public."
              : "The results page is hidden until an admin publishes it."}
          </p>
          {data.result?.results_visible ? (
            <Link className="text-link" href={`/go-force/results/${session.id}`}>
              Open results page
            </Link>
          ) : (
            <Link className="text-link" href="/admin/go-force">
              Publish results from the admin page
            </Link>
          )}
        </section>
      )}

      {session.status === "stopped_no_finalists" && (
        <section className="go-force-card border border-line bg-paper p-5">
          <h2 className="m-0 font-display text-[1.7rem] text-blue">
            Session stopped: no finalists
          </h2>
          <p>
            No game advanced from the round. This session has no GOTY result. Start a fresh session
            from the admin page.
          </p>
          <Link className="text-link" href="/admin/go-force">
            Return to Go Force admin
          </Link>
        </section>
      )}

      {session.status === "incomplete_vote_threshold" && (
        <section className="go-force-card border border-line bg-paper p-5">
          <h2 className="m-0 font-display text-[1.7rem] text-blue">Session incomplete</h2>
          <p>
            The configured Round 3 Go-voter minimum or a final-ballot completion requirement was not
            met. No GOTY result was published.
          </p>
          <Link className="text-link" href="/admin/go-force">
            Return to Go Force admin
          </Link>
        </section>
      )}
    </div>
  );
}
