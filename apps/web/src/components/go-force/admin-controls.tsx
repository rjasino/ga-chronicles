"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Message } from "@/components/ui/message";
import { Select, TextField } from "@/components/ui/text-field";
import { AnnualGamesImport } from "@/components/go-force/annual-games-import";
import type { AdminSessionListItem, GoForceAdminData } from "@/features/go-force/admin-queries";
import {
  removeAnnualGame,
  saveAnnualGame,
  saveGoForcePageVisibility,
  saveGoForceVotingSettings,
  setGoForceResultVisibility,
  type AdminActionState,
} from "@/features/go-force/admin-actions";
import {
  createGoForceSession,
  deleteReadyGoForceSession,
  type SessionActionState,
} from "@/features/go-force/session-actions";
import type { AnnualGame } from "@/features/go-force/types";

function VisibilityForm({ visible }: { visible: boolean }) {
  const [state, action, pending] = useActionState(
    saveGoForcePageVisibility,
    {} satisfies AdminActionState,
  );
  const persistedVisible = state.pageVisible ?? visible;
  return (
    <form className="form-stack settings-form" action={action}>
      <Checkbox
        key={persistedVisible ? "visible" : "hidden"}
        name="page_visible"
        defaultChecked={persistedVisible}
        label="Show the public Go Force page"
      />
      <p className="m-0 text-[.88rem] text-muted">
        Hiding the page does not block the game master from an active session.
      </p>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      <Button purpose="primary" pending={pending}>
        Save visibility
      </Button>
    </form>
  );
}

function VotingSettingsForm({
  roundVotingSeconds,
  finalBallotSeconds,
}: {
  roundVotingSeconds: number;
  finalBallotSeconds: number;
}) {
  const [state, action, pending] = useActionState(
    saveGoForceVotingSettings,
    {} satisfies AdminActionState,
  );
  return (
    <form className="form-stack settings-form" action={action}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Round vote duration (seconds)"
          name="roundVotingSeconds"
          type="number"
          min={5}
          max={600}
          defaultValue={roundVotingSeconds}
          required
        />
        <TextField
          label="Final ballot duration (seconds)"
          name="finalBallotSeconds"
          type="number"
          min={5}
          max={600}
          defaultValue={finalBallotSeconds}
          required
        />
      </div>
      <p className="m-0 text-[.88rem] text-muted">
        Both timers default to 10 seconds. Choose 5–600 seconds; changing a timer does not alter a
        vote already in progress.
      </p>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      <Button purpose="primary" pending={pending}>
        Save voting timers
      </Button>
    </form>
  );
}

function AnnualGameEditForm({
  game,
  onSaved,
  onCancel,
}: {
  game: AnnualGame;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(saveAnnualGame, {} satisfies AdminActionState);
  useEffect(() => {
    if (state.success) onSaved();
  }, [onSaved, state.success]);
  return (
    <form className="grid gap-3 border border-line bg-paper p-4" action={action}>
      <input type="hidden" name="id" value={game.id} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="Game title"
          name="title"
          defaultValue={game.title}
          required
          maxLength={200}
        />
        <TextField
          label="Year"
          name="gotyYear"
          type="number"
          min={2000}
          max={2100}
          defaultValue={game.goty_year}
          required
        />
        <Select label="Eligibility" name="eligibilityState" defaultValue={game.eligibility_state}>
          <option value="eligible">Eligible</option>
          <option value="ineligible">Ineligible</option>
        </Select>
        <TextField
          label="Order"
          name="displayOrder"
          type="number"
          min={0}
          defaultValue={game.display_order}
        />
        <TextField
          label="Developer (optional)"
          name="developer"
          defaultValue={game.developer ?? ""}
          maxLength={160}
        />
        <TextField
          label="Publisher (optional)"
          name="publisher"
          defaultValue={game.publisher ?? ""}
          maxLength={160}
        />
        <TextField
          label="Genre (optional)"
          name="genre"
          defaultValue={game.genre ?? ""}
          maxLength={120}
        />
        <TextField
          label="Cover art URL (optional)"
          name="coverArtUrl"
          type="url"
          defaultValue={game.cover_art_url ?? ""}
          maxLength={2048}
        />
        <TextField
          label="Upload cover art (optional)"
          name="coverArtFile"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="file:mr-3 file:border-0 file:bg-blue file:px-3 file:py-2 file:font-semibold file:text-white"
          hint="JPEG, PNG, or WebP up to 10 MiB. An uploaded image replaces the URL."
        />
      </div>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      <div className="flex flex-wrap gap-2">
        <Button purpose="primary" pending={pending}>
          Save changes
        </Button>
        <Button purpose="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AnnualGameRow({ game }: { game: AnnualGame }) {
  const [editing, setEditing] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [removeState, removeAction, removePending] = useActionState(
    removeAnnualGame,
    {} satisfies AdminActionState,
  );
  if (editing) {
    return (
      <tr data-game-id={game.id}>
        <td colSpan={5} className="p-3">
          <AnnualGameEditForm
            game={game}
            onSaved={() => {
              setEditing(false);
              setUpdated(true);
            }}
            onCancel={() => setEditing(false)}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr data-game-id={game.id} className="border-b border-line">
      <th scope="row" className="p-3 text-left font-semibold">
        {game.title}
      </th>
      <td className="p-3">{game.developer || "—"}</td>
      <td className="p-3">{game.publisher || "—"}</td>
      <td className="p-3">{game.goty_year}</td>
      <td className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            purpose="secondary"
            type="button"
            onClick={() => {
              setUpdated(false);
              setEditing(true);
            }}
          >
            Edit
          </Button>
          <form action={removeAction}>
            <input type="hidden" name="gameId" value={game.id} />
            <Button purpose="error" pending={removePending}>
              Delete
            </Button>
          </form>
          {removeState.error && <Message tone="error">{removeState.error}</Message>}
          {removeState.success && <Message tone="success">{removeState.success}</Message>}
          {updated && <Message tone="success">Game updated.</Message>}
        </div>
      </td>
    </tr>
  );
}

function AddGameForm({ latestYear }: { latestYear: number }) {
  const [state, action, pending] = useActionState(saveAnnualGame, {} satisfies AdminActionState);
  return (
    <form className="form-stack" action={action}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_7rem_9rem_6rem]">
        <TextField label="Game title" name="title" required maxLength={200} />
        <TextField
          label="GOTY year"
          name="gotyYear"
          type="number"
          min={2000}
          max={2100}
          defaultValue={latestYear}
          required
        />
        <Select label="Eligibility" name="eligibilityState" defaultValue="eligible">
          <option value="eligible">Eligible</option>
          <option value="ineligible">Ineligible</option>
        </Select>
        <TextField
          label="Display order"
          name="displayOrder"
          type="number"
          min={0}
          defaultValue={0}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <TextField label="Developer (optional)" name="developer" maxLength={160} />
        <TextField label="Publisher (optional)" name="publisher" maxLength={160} />
        <TextField label="Genre (optional)" name="genre" maxLength={120} />
        <TextField
          label="Cover art URL (optional)"
          name="coverArtUrl"
          type="url"
          maxLength={2048}
        />
        <TextField
          label="Upload cover art (optional)"
          name="coverArtFile"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="file:mr-3 file:border-0 file:bg-blue file:px-3 file:py-2 file:font-semibold file:text-white"
          hint="JPEG, PNG, or WebP up to 10 MiB. An uploaded image replaces the URL."
        />
      </div>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      <Button purpose="primary" pending={pending}>
        Add game
      </Button>
    </form>
  );
}

function CreateSessionForm({
  accounts,
  latestYear,
}: {
  accounts: GoForceAdminData["accounts"];
  latestYear: number;
}) {
  const [state, action, pending] = useActionState(
    createGoForceSession,
    {} satisfies SessionActionState,
  );
  return (
    <form className="form-stack" action={action}>
      <TextField
        label="GOTY year"
        name="gotyYear"
        type="number"
        min={2000}
        max={2100}
        defaultValue={latestYear}
        required
      />
      <fieldset className="m-0 border border-line p-3">
        <legend className="px-1 font-semibold">Player roster</legend>
        <p className="m-0 mb-2 text-[.88rem] text-muted">
          Roster order follows the selected accounts and is locked when the session starts.
        </p>
        <div className="grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2">
          {accounts.map((account) => (
            <Checkbox
              key={account.id}
              name="participantIds"
              value={account.id}
              label={`${account.display_name || account.username} (${account.username})`}
            />
          ))}
        </div>
      </fieldset>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      {state.sessionId && (
        <p className="m-0">
          <Link className="text-link" href={`/admin/go-force/sessions/${state.sessionId}`}>
            Open the facilitator screen
          </Link>
        </p>
      )}
      <Button purpose="primary" pending={pending}>
        Create ready session
      </Button>
    </form>
  );
}

function ResultVisibilityForm({ session }: { session: AdminSessionListItem }) {
  const [state, action, pending] = useActionState(
    setGoForceResultVisibility,
    {} satisfies AdminActionState,
  );
  return (
    <form className="flex flex-wrap items-center gap-3" action={action}>
      <input type="hidden" name="sessionId" value={session.id} />
      <Checkbox
        name="results_visible"
        defaultChecked={session.result_visible}
        label="Public results page"
      />
      <Button purpose="secondary" pending={pending}>
        Save results visibility
      </Button>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
    </form>
  );
}

function DeleteReadySessionForm({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(
    deleteReadyGoForceSession,
    {} satisfies SessionActionState,
  );
  return (
    <form action={action}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <Button purpose="text" pending={pending}>
        Remove ready session
      </Button>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
    </form>
  );
}

const adminTabs = [
  { id: "settings", label: "Page & timers" },
  { id: "games", label: "Annual games" },
  { id: "sessions", label: "Sessions" },
] as const;

type AdminTab = (typeof adminTabs)[number]["id"];

export function GoForceAdminControls({ data }: { data: GoForceAdminData }) {
  const currentYear = new Date().getFullYear();
  const latestYear = data.years.includes(currentYear)
    ? currentYear
    : (data.years[0] ?? currentYear);
  const [activeTab, setActiveTab] = useState<AdminTab>("settings");

  return (
    <div className="grid gap-5">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Go Force settings"
        aria-orientation="horizontal"
      >
        {adminTabs.map((tab, index) => {
          const selected = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              id={`go-force-tab-${tab.id}`}
              type="button"
              role="tab"
              size="toolbar"
              active={selected}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => {
                let nextIndex = index;
                if (event.key === "ArrowRight") nextIndex = (index + 1) % adminTabs.length;
                else if (event.key === "ArrowLeft") {
                  nextIndex = (index - 1 + adminTabs.length) % adminTabs.length;
                } else if (event.key === "Home") nextIndex = 0;
                else if (event.key === "End") nextIndex = adminTabs.length - 1;
                else return;

                event.preventDefault();
                const nextTab = adminTabs[nextIndex]!;
                setActiveTab(nextTab.id);
                document.getElementById(`go-force-tab-${nextTab.id}`)?.focus();
              }}
            >
              {tab.label}
            </Button>
          );
        })}
      </div>

      {activeTab === "settings" && (
        <div
          id="go-force-panel-settings"
          role="tabpanel"
          aria-labelledby="go-force-tab-settings"
          tabIndex={0}
          className="grid gap-5"
        >
          <section
            className="go-force-card border border-line p-5"
            aria-labelledby="go-force-visibility"
          >
            <h2 id="go-force-visibility" className="m-0 font-display text-[1.5rem] text-blue">
              Public page visibility
            </h2>
            <p className="m-0 mt-1 text-muted">
              Changes are saved as site content and take effect without a redeployment.
            </p>
            <VisibilityForm visible={data.settings.page_visible} />
          </section>

          <section
            className="go-force-card border border-line p-5"
            aria-labelledby="go-force-timers"
          >
            <h2 id="go-force-timers" className="m-0 font-display text-[1.5rem] text-blue">
              Voting timers
            </h2>
            <p className="m-0 mt-1 text-muted">
              Round votes and the final ballot have separate countdowns. Active votes keep their
              current deadline.
            </p>
            <VotingSettingsForm
              roundVotingSeconds={data.settings.round_voting_seconds}
              finalBallotSeconds={data.settings.final_ballot_seconds}
            />
          </section>
        </div>
      )}

      {activeTab === "games" && (
        <section
          id="go-force-panel-games"
          role="tabpanel"
          aria-labelledby="go-force-tab-games"
          tabIndex={0}
          className="go-force-card min-w-0 border border-line p-5"
        >
          <h2 className="m-0 font-display text-[1.5rem] text-blue">Annual eligible games</h2>
          <p className="m-0 mt-1 text-muted">
            Eligible and ineligible games are listed here. Only eligible games for the session year
            are snapshotted at start; started sessions keep their original list.
          </p>
          <div className="mt-4">
            <AnnualGamesImport
              existingGames={data.games.map(({ goty_year, title }) => ({ goty_year, title }))}
            />
          </div>
          <h3 className="mb-2 mt-6 font-display text-[1.25rem] text-blue">Add one game</h3>
          <AddGameForm latestYear={latestYear} />
          {data.games.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <caption className="sr-only">
                  Annual games, including eligible and ineligible titles
                </caption>
                <thead>
                  <tr className="border-b-2 border-line">
                    <th scope="col" className="p-3">
                      Title
                    </th>
                    <th scope="col" className="p-3">
                      Developer
                    </th>
                    <th scope="col" className="p-3">
                      Publisher
                    </th>
                    <th scope="col" className="p-3">
                      Year
                    </th>
                    <th scope="col" className="p-3">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.games.map((game) => (
                    <AnnualGameRow key={game.id} game={game} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 border-l-4 border-line bg-paper px-4 py-3 text-muted">
              No annual games yet. Add the first title above.
            </p>
          )}
        </section>
      )}

      {activeTab === "sessions" && (
        <section
          id="go-force-panel-sessions"
          role="tabpanel"
          aria-labelledby="go-force-tab-sessions"
          tabIndex={0}
          className="go-force-card border border-line p-5"
        >
          <h2 className="m-0 font-display text-[1.5rem] text-blue">Sessions</h2>
          <p className="m-0 mt-1 text-muted">
            A session locks its roster and game list when it starts.
          </p>
          <CreateSessionForm accounts={data.accounts} latestYear={latestYear} />
          {data.sessions.length ? (
            <ul className="mt-6 grid list-none gap-4 p-0">
              {data.sessions.map((session) => (
                <li key={session.id} className="grid gap-2 border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <strong>GOTY {session.goty_year}</strong>
                      <p className="m-0 text-[.9rem] text-muted">
                        {session.status.replaceAll("_", " ")} · {session.participants} player
                        {session.participants === 1 ? "" : "s"}
                        {session.vote_completion_percentage !== null
                          ? ` · ${session.vote_completion_percentage}% votes`
                          : ""}
                      </p>
                    </div>
                    <Link className="text-link" href={`/admin/go-force/sessions/${session.id}`}>
                      Open session
                    </Link>
                  </div>
                  {session.status === "complete" && <ResultVisibilityForm session={session} />}
                  {session.status === "ready" && <DeleteReadySessionForm sessionId={session.id} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 border-l-4 border-line bg-paper px-4 py-3 text-muted">
              No sessions yet. Prepare the roster above to create one.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
