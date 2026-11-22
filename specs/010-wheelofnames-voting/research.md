# Phase 0 Research: Wheel of Names Voting

- **Feature**: `010-wheelofnames-voting`
- **Date**: 2026-11-21
- **Status**: Complete; provider credential is an implementation/rehearsal prerequisite

## Decision: Use Wheel of Names API v3 for each spin

- **Decision**: Call `POST https://wheelofnames.com/api/v3/wheels/animate` from the server for each draw. Supply the active round's remaining game entries as `wheelConfig`; include each session-game UUID as the entry ID and the title as display text. Configure `autoRemoveWinner: true`.
- **Rationale**: The v3 OpenAPI schema documents the animation operation, a `winner` in its response (including entry identity/text), and an animation representation. Entry IDs allow exact mapping even if display labels change. The provider's removal configuration gives the requested remove-after-spin behavior in the wheel animation.
- **Alternatives considered**:
  - **Keep the local random draw and decorative reveal**: rejected because it would continue to create the roulette behavior locally rather than use the requested provider.
  - **Call the provider directly from browser code**: rejected because it would expose the API key.
  - **Use a saved/shared wheel as authoritative state**: rejected because the spin endpoint returns a result/animation, not a durable updated Go Force pool; the site's persisted selection history is the safer source for future entries.
- **Sources**: [Wheel of Names v3 OpenAPI spec](https://stoplight.io/api/v1/projects/wheelofnames/wheelofnames/nodes/wheelofnames-v3.yaml); [spin-animation operation](https://wheelofnames.stoplight.io/docs/wheelofnames/8ouudl3snoyu7-create-a-spin-animation-from-a-wheel-config); [Wheel of Names FAQ](https://wheelofnames.com/faq#api) (accessed 2026-11-21).

## Decision: Keep the API key server-side and document a blank environment entry

- **Decision**: Add `WHEEL_OF_NAMES_API_KEY=` to `apps/web/.env.example`. Read the real key only in server-side code and send it in the documented `x-api-key` header. The actual key will be supplied separately through `.env.local` or deployment secrets.
- **Rationale**: The provider documentation explicitly warns against putting the key in browser JavaScript because it can be used to manage wheels. Example environment files must not contain live secrets.
- **Alternatives considered**:
  - **Expose the key through a `NEXT_PUBLIC_` variable**: rejected because it would be included in client-visible code.
  - **Commit the supplied key in `.env.example`**: rejected because the example is tracked and must contain only a placeholder.
- **Sources**: [Wheel of Names API guide](https://wheelofnames.stoplight.io/); [v3 OpenAPI spec](https://stoplight.io/api/v1/projects/wheelofnames/wheelofnames/nodes/wheelofnames-v3.yaml); repository conventions in `apps/web/.env.example` and `apps/web/src/lib/env.ts`.

## Decision: Keep Go Force's database as the source of truth

- **Decision**: The application builds each wheel configuration from the current database-derived round pool. It maps the provider's winner ID back to a session-game snapshot, validates that it remains eligible, and commits the selection through an authorized database operation. The next request excludes every game already selected in that round.
- **Rationale**: The current `go_force_draw_selection` database function selects a random game and inserts a `go_force_selections` row. The table already prevents selecting the same session game twice in one round, and session queries derive remaining games from the fixed session snapshot and persisted selections. Replacing only the selection source preserves existing votes and history.
- **Alternatives considered**:
  - **Trust a browser-supplied title without database validation**: rejected because an out-of-round or repeated game could be committed.
  - **Trust provider wheel state as the durable pool**: rejected because the documented REST animation response does not return a persistent updated wheel configuration.
  - **Move votes or session state into the provider**: rejected because the provider supplies roulette behavior, not the site's identity, ballot, or results system.
- **Repository evidence**: `supabase/migrations/0011_go-force-core.sql`; `apps/web/src/features/go-force/session-queries.ts`; `apps/web/src/features/go-force/game-actions.ts`; `specs/009-go-force-goty/data-model.md`.

## Decision: Reveal and open voting only after the provider spin succeeds

- **Decision**: Keep the current ballot closed while the server requests the provider spin. Validate the response and commit the selected game before refreshing/broadcasting the Go Force session. Show the returned animation and selected title in the facilitator flow; players receive the committed title and ballot only after persistence.
- **Rationale**: This preserves the requested sequence and prevents a provider error or invalid winner from creating a ballot. The API key stays server-side and the existing database transition remains the concurrency and eligibility guard.
- **Alternatives considered**: Open the ballot before a provider result or optimistically reveal a result before persistence; both were rejected because a failed commit could leave participants voting on a game that is not recorded.
- **Repository evidence**: `apps/web/src/components/go-force/facilitator-session.tsx`; `apps/web/src/features/go-force/realtime-broadcast.ts`; `supabase/migrations/0011_go-force-core.sql`.

## Decision: Combine provider auto-removal with database-derived remaining entries

- **Decision**: Set `autoRemoveWinner: true` for the returned provider animation, and rebuild the next `WheelConfig` from the active round's remaining session-game snapshots after each committed selection.
- **Rationale**: The API documents automatic winner removal in the configured wheel behavior, but the REST animation operation does not document a persistent updated list. Database-derived entries ensure the winner is excluded from subsequent spins even if external removal is only visual or an API request is retried.
- **Alternatives considered**:
  - **Delete the game from the annual eligible-game list**: rejected; a draw consumes a game only from the current round's pool.
  - **Assume the provider retains removed entries across API requests**: rejected because that persistence behavior is not in the spin response contract.
- **Sources**: [Wheel of Names v3 OpenAPI spec](https://stoplight.io/api/v1/projects/wheelofnames/wheelofnames/nodes/wheelofnames-v3.yaml); repository evidence in `supabase/migrations/0011_go-force-core.sql`.

## Resolved Technical Context

- **Runtime and application**: TypeScript 5.9, Node.js 24, Next.js 16.4, React 19.
- **Provider endpoint**: Wheel of Names API v3; `POST /wheels/animate` with a `WheelConfig`; documented authentication uses `x-api-key`; the response includes animation and winner data.
- **Provider key**: `WHEEL_OF_NAMES_API_KEY`, server-side only. The key value is not present yet and must be supplied by the user for a real integration rehearsal.
- **Removal**: Set `autoRemoveWinner: true`; derive the next request's entries from the persisted Go Force selections rather than assuming the stateless animation endpoint updates a saved wheel.
- **Persistence and live updates**: Supabase remains authoritative; use existing Go Force realtime refresh/broadcast after a validated selection is committed.
- **Testing**: Vitest, Supabase pgTAP, and Playwright, matching existing Go Force coverage.
- **Contract note**: The v3 OpenAPI spec documents the default JSON response with a base64 animation and winner metadata. The supplied API key is the remaining prerequisite for a real provider call; automated integration tests can use a mocked response.
