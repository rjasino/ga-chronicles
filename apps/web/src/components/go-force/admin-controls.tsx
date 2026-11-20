"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Message } from "@/components/ui/message";
import { Select, TextField } from "@/components/ui/text-field";
import type { AdminSessionListItem, GoForceAdminData } from "@/features/go-force/admin-queries";
import {
  removeAnnualGame,
  saveAnnualGame,
  saveGoForcePageVisibility,
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
  const [state, action, pending] = useActionState(saveGoForcePageVisibility, {} satisfies AdminActionState);
  return (
    <form className="form-stack settings-form" action={action}>
      <Checkbox name="page_visible" defaultChecked={visible} label="Show the public Go Force page" />
      <p className="m-0 text-[.88rem] text-muted">Hiding the page does not block the game master from an active session.</p>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      <Button purpose="primary" pending={pending}>Save visibility</Button>
    </form>
  );
}

function AnnualGameRow({ game }: { game: AnnualGame }) {
  const [state, action, pending] = useActionState(saveAnnualGame, {} satisfies AdminActionState);
  const [removeState, removeAction, removePending] = useActionState(removeAnnualGame, {} satisfies AdminActionState);
  return (
    <li className="grid gap-3 border-b border-line py-4">
      <form className="grid gap-3 md:grid-cols-[minmax(0,2fr)_7rem_9rem_6rem_auto] md:items-end" action={action}>
        <input type="hidden" name="id" value={game.id} />
        <TextField label="Game title" name="title" defaultValue={game.title} required maxLength={200} />
        <TextField label="Year" name="gotyYear" type="number" min={2000} max={2100} defaultValue={game.goty_year} required />
        <Select label="Eligibility" name="eligibilityState" defaultValue={game.eligibility_state}>
          <option value="eligible">Eligible</option>
          <option value="ineligible">Ineligible</option>
        </Select>
        <TextField label="Order" name="displayOrder" type="number" min={0} defaultValue={game.display_order} />
        <Button purpose="secondary" pending={pending}>Save</Button>
      </form>
      <div className="flex flex-wrap items-center gap-3">
        <form action={removeAction}>
          <input type="hidden" name="gameId" value={game.id} />
          <Button purpose="error" pending={removePending}>Remove</Button>
        </form>
        {state.error && <Message tone="error">{state.error}</Message>}
        {state.success && <Message tone="success">{state.success}</Message>}
        {removeState.error && <Message tone="error">{removeState.error}</Message>}
        {removeState.success && <Message tone="success">{removeState.success}</Message>}
      </div>
    </li>
  );
}

function AddGameForm({ latestYear }: { latestYear: number }) {
  const [state, action, pending] = useActionState(saveAnnualGame, {} satisfies AdminActionState);
  return (
    <form className="form-stack" action={action}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_7rem_9rem_6rem]">
        <TextField label="Game title" name="title" required maxLength={200} />
        <TextField label="GOTY year" name="gotyYear" type="number" min={2000} max={2100} defaultValue={latestYear} required />
        <Select label="Eligibility" name="eligibilityState" defaultValue="eligible">
          <option value="eligible">Eligible</option>
          <option value="ineligible">Ineligible</option>
        </Select>
        <TextField label="Display order" name="displayOrder" type="number" min={0} defaultValue={0} />
      </div>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      <Button purpose="primary" pending={pending}>Add game</Button>
    </form>
  );
}

function CreateSessionForm({ accounts, latestYear }: { accounts: GoForceAdminData["accounts"]; latestYear: number }) {
  const [state, action, pending] = useActionState(createGoForceSession, {} satisfies SessionActionState);
  return (
    <form className="form-stack" action={action}>
      <TextField label="GOTY year" name="gotyYear" type="number" min={2000} max={2100} defaultValue={latestYear} required />
      <fieldset className="m-0 border border-line p-3">
        <legend className="px-1 font-semibold">Player roster</legend>
        <p className="m-0 mb-2 text-[.88rem] text-muted">Roster order follows the selected accounts and is locked when the session starts.</p>
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
          <Link className="text-link" href={`/admin/go-force/sessions/${state.sessionId}`}>Open the facilitator screen</Link>
        </p>
      )}
      <Button purpose="primary" pending={pending}>Create ready session</Button>
    </form>
  );
}

function ResultVisibilityForm({ session }: { session: AdminSessionListItem }) {
  const [state, action, pending] = useActionState(setGoForceResultVisibility, {} satisfies AdminActionState);
  return (
    <form className="flex flex-wrap items-center gap-3" action={action}>
      <input type="hidden" name="sessionId" value={session.id} />
      <Checkbox name="results_visible" defaultChecked={session.result_visible} label="Public results page" />
      <Button purpose="secondary" pending={pending}>Save results visibility</Button>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
    </form>
  );
}

function DeleteReadySessionForm({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(deleteReadyGoForceSession, {} satisfies SessionActionState);
  return (
    <form action={action}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <Button purpose="text" pending={pending}>Remove ready session</Button>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
    </form>
  );
}

export function GoForceAdminControls({ data }: { data: GoForceAdminData }) {
  const currentYear = new Date().getFullYear();
  const latestYear = data.years.includes(currentYear) ? currentYear : data.years[0] ?? currentYear;
  return (
    <div className="grid gap-8">
      <section className="go-force-card border border-line p-5" aria-labelledby="go-force-visibility">
        <h2 id="go-force-visibility" className="m-0 font-display text-[1.5rem] text-blue">Public page visibility</h2>
        <p className="m-0 mt-1 text-muted">Changes are saved as site content and take effect without a redeployment.</p>
        <VisibilityForm visible={data.settings.page_visible} />
      </section>

      <section className="go-force-card border border-line p-5" aria-labelledby="go-force-games">
        <h2 id="go-force-games" className="m-0 font-display text-[1.5rem] text-blue">Annual eligible games</h2>
        <p className="m-0 mt-1 text-muted">Only eligible games for the session year are snapshotted at start. Started sessions keep their original list.</p>
        <AddGameForm latestYear={latestYear} />
        {data.games.length ? (
          <ul className="mt-5 list-none border-t border-line p-0">
            {data.games.map((game) => <AnnualGameRow key={game.id} game={game} />)}
          </ul>
        ) : (
          <p className="mt-5 border-l-4 border-line bg-paper px-4 py-3 text-muted">No games for this year yet. Add the first eligible title above.</p>
        )}
      </section>

      <section className="go-force-card border border-line p-5" aria-labelledby="go-force-sessions">
        <h2 id="go-force-sessions" className="m-0 font-display text-[1.5rem] text-blue">Sessions</h2>
        <p className="m-0 mt-1 text-muted">A session locks its roster and game list when it starts.</p>
        <CreateSessionForm accounts={data.accounts} latestYear={latestYear} />
        {data.sessions.length ? (
          <ul className="mt-6 grid list-none gap-4 p-0">
            {data.sessions.map((session) => (
              <li key={session.id} className="grid gap-2 border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <strong>GOTY {session.goty_year}</strong>
                    <p className="m-0 text-[.9rem] text-muted">
                      {session.status.replaceAll("_", " ")} · {session.participants} player{session.participants === 1 ? "" : "s"}
                      {session.vote_completion_percentage !== null ? ` · ${session.vote_completion_percentage}% votes` : ""}
                    </p>
                  </div>
                  <Link className="text-link" href={`/admin/go-force/sessions/${session.id}`}>Open session</Link>
                </div>
                {session.status === "complete" && <ResultVisibilityForm session={session} />}
                {session.status === "ready" && <DeleteReadySessionForm sessionId={session.id} />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 border-l-4 border-line bg-paper px-4 py-3 text-muted">No sessions yet. Prepare the roster above to create one.</p>
        )}
      </section>
    </div>
  );
}
