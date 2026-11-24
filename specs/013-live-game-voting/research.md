# Research: Live Game Voting

## 1. Late-player roster changes

**Decision**: Add players through a narrowly scoped, transactional database operation called by an authorized server action. Permit additions only while a session is `live` or on its `final_ballot`; require an active account, no existing `(session, account)` membership, and the existing 64-player limit. Lock the session before choosing the next roster order. Use the participant row's existing `created_at` as its join time.

**Rationale**: The participant table already has unique participant and roster-order constraints, and `go_force_is_facilitator` recognizes both admins and the session game master. The existing row-level policy only allows direct roster management while a session is `ready`, so broadening table writes would grant a larger mutation surface than this feature needs. A session lock serializes concurrent additions and ballot closure; recording the join timestamp after acquiring that lock makes eligibility ordering reliable.

**Alternatives considered**:
- Allow direct participant-table inserts in all active states: rejected because it broadens RLS and does not make roster-order allocation or ballot-close races atomic.
- Add a separate join/eligibility table: deferred because participant creation time and the existing per-ballot vote rows can represent the required history without duplicating roster state.
- Permit additions only during game rounds: rejected because an admin may need to include a late participant in an open final ballot; terminal sessions remain closed.

**Sources**: `supabase/migrations/0011_go-force-core.sql` (participant constraints, facilitator helper, and roster RLS); `supabase/migrations/0014_go-force-atomic-session-create.sql` (active-account validation and 1–64 roster limit).

## 2. Late-join vote eligibility and completion accounting

**Decision**: Treat a participant's creation timestamp as the start of their eligibility. A participant already on the roster when a game selection opens is eligible; a later entrant is eligible only if they join before the effective voting cutoff (the earlier of the ballot deadline and closure). Late entrants may vote in later selections and in an open final ballot. At closure, materialize an abstention only for participants who had an opportunity to vote. A missing row for a closed selection means the participant was not eligible for it, not that they abstained. Derive expected vote opportunities from the materialized game-vote and final-ballot rows rather than multiplying the current roster by the complete session history. Require a Round 3 “go” only from participants with at least one eligible Round 3 game ballot.

**Rationale**: Existing vote rows are unique per participant and ballot and already distinguish submitted votes from generated abstentions. The current fixed-roster completion formula charges late entrants for earlier selections; counting eligible ballot rows preserves the 80% completion rule without retroactive penalties. Limiting eligibility by the existing deadline matches the vote submission function, which already rejects submissions after that deadline. An entrant who joins during the final ballot has no Round 3 opportunity and therefore cannot be required to have used a Round 3 “go.”

**Alternatives considered**:
- Backfill abstentions for all earlier ballots: rejected because it would misrepresent non-participation as abstention and penalize late entrants.
- Count every historical selection against every current participant: rejected because it contradicts the specification's join-time boundary.
- Introduce a separate expected-vote counter or eligibility table: deferred because each closed ballot already materializes one row per eligible participant.

**Sources**: `supabase/migrations/0011_go-force-core.sql` (vote row uniqueness and vote submission rules); `supabase/migrations/0012_go-force-voting-details.sql` (ballot closure and current fixed-roster completion formula); `apps/web/src/features/go-force/session-queries.ts` (vote history and participant views).

## 3. Realtime state delivery and vote privacy

**Decision**: Reuse the existing private Supabase Broadcast topic as a session-change signal. Publish only after a successful persisted change, include the session identifier but no vote data, and let subscribed screens refresh their authorized server-rendered views. Enforce ballot privacy in database reads, not only in rendered UI: a player sees their own open vote; a facilitator can see progress counts while a ballot is open but not individual choices; individual choices are available to the facilitator after close. Expose any closed-game aggregate needed by a player without returning peer vote rows. Apply the same open-ballot privacy rule to final-ballot choices and remarks. Refresh after a successful channel subscription/reconnect so a client can reconcile missed events.

**Rationale**: This is already the Go Force pattern: server actions call `publishGoForceSessionUpdate`, `GoForceLiveRefresh` refreshes the route, and RLS controls the returned state. The broadcast payload does not expose vote content. However, the existing facilitator query can currently load open vote rows into client props even though the interface only shows a submission count; this does not meet the intended privacy boundary. Narrowing raw-row access and providing authorized aggregates preserves progress indicators without sending individual open choices to browsers.

**Alternatives considered**:
- Polling or requiring manual refresh: rejected because it does not meet the requested live interaction.
- Broadcasting vote choices or counts directly: rejected because it bypasses the existing authorization and vote-privacy boundary.
- Hiding already-delivered vote choices only in the UI: rejected because values passed to the browser are still exposed.
- Replacing the signal with direct table-change subscriptions: not needed for this feature and would introduce a second update path.

**Sources**: `apps/web/src/features/go-force/realtime.ts`, `realtime-broadcast.ts`, and `apps/web/src/components/go-force/live-refresh.tsx`; `apps/web/src/features/go-force/session-queries.ts`; `supabase/migrations/0011_go-force-core.sql` (private topic policy and vote read policies).

## 4. Advancement summary

**Decision**: Derive the admin card from closed selections in the current round. List only games with an `advanced` outcome and count their submitted “go” votes. Mark the summary “Advancing so far” until the round completes and confirmed after completion; do not show a current open ballot as finalized.

**Rationale**: The database already records each closed selection's advancement outcome under the rule that one or more “go” votes advances the game, and facilitator views already load all selections and votes. The summary is computed from authoritative session data and requires no duplicate persisted state.

**Alternatives considered**:
- Persist a separate summary: rejected because it duplicates selection outcomes and can become stale.
- Show a count for an open ballot as if final: rejected because the total may change before closure and would misstate advancement.
- Show only the latest closed selection: rejected because the requested card summarizes all games that qualify in the round.

**Sources**: `supabase/migrations/0011_go-force-core.sql` (advancement outcome); `apps/web/src/features/go-force/session-queries.ts`; `apps/web/src/components/go-force/facilitator-session.tsx`.

## 5. Vote-choice presentation and validation approach

**Decision**: Reuse the existing semantic success/error styles for “go” and “no-go,” and apply equivalent, text-labeled treatments to submitted votes and facilitator summaries. Use a neutral treatment for abstention. Validate color contrast in light and dark themes, including grayscale recognition.

**Rationale**: The player buttons already use success and error purposes, and the design system provides corresponding semantic colors. Extending those existing tokens keeps the interface consistent while visible text ensures color is not the sole signal.

**Alternatives considered**:
- Add new colors or a new UI dependency: rejected because existing tokens already communicate the two choices.
- Use color without labels: rejected because it is not accessible and fails the specification's grayscale scenario.

**Sources**: `apps/web/src/components/go-force/player-session.tsx`; `apps/web/src/components/ui/button.tsx`; `apps/web/src/app/globals.css`; `apps/web/tests/e2e/go-force-accessibility.spec.ts`.

## 6. Project and test conventions

**Decision**: Extend the current TypeScript/Next.js Go Force feature and Supabase migrations without adding dependencies. Use unit tests with Vitest, authorization and state-transition tests with pgTAP, and browser-level flows with Playwright; run the existing accessibility scan for the updated player and facilitator screens.

**Rationale**: The repository already has these tools and parallel test coverage for Go Force actions, session queries, database transitions, and accessibility. The feature is an extension of existing participant, vote, and session state rather than a new integration.

**Alternatives considered**:
- Add a new test framework or runtime service: rejected because current repository tooling covers the needed contracts and user flows.

**Sources**: `apps/web/package.json`; `apps/web/tests/unit/go-force/`; `apps/web/tests/e2e/go-force-session.spec.ts`; `supabase/tests/database/`.

## Resolved planning assumptions

- A ballot is eligible for a late entrant only before its existing voting deadline and before closure; a ballot whose timer has elapsed is not considered open for late-entry voting even if timeout closure has not yet run.
- An entrant added during an open final ballot may submit that final vote before its existing deadline but is not retroactively required to have used a Round 3 “go.”
- The existing session maximum of 64 participants applies to additions as well as initial rosters.
- The “admin side” summary belongs on the facilitator session screen, which is already available to the admin or game master and receives session broadcasts.
- Implementation work in `apps/web` must first consult the installed Next.js guidance under `apps/web/node_modules/next/dist/docs/`, as required by `apps/web/AGENTS.md`.
