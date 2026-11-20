# Phase 0 Research: Go Force GOTY

- **Feature**: `009-go-force-goty`
- **Date**: 2026-11-20
- **Status**: Complete

## Decision: Keep the existing web and data platform

- **Decision**: Build within the existing `apps/web` Next.js application and persist Go Force content and session records in the existing Supabase Postgres project.
- **Rationale**: The repository uses Next.js 16.4, React 19, TypeScript 5.9, Node 24+, Supabase SSR/JS, and Supabase Postgres 17. Existing authenticated page and data-access patterns can support the admin, player, facilitator, and public-results surfaces.
- **Alternatives considered**: A separate service or external voting product. Neither is needed for the stated one-event-at-a-time use case, and either would add a second operational surface.
- **Repository evidence**: `apps/web/package.json`; `supabase/config.toml`; `apps/web/src/lib/supabase/server.ts`.

## Decision: Persist authoritative state in Postgres; use private Supabase Realtime Broadcast for live updates

- **Decision**: Store session state, game selections, ballots, and results in Postgres. Use Supabase Realtime Broadcast to notify connected player and facilitator screens about state changes. Clients reload the authorized, persisted state after reconnecting rather than treating an in-memory message as the record of truth.
- **Rationale**: The app already uses Supabase Postgres and the Supabase JS client. Supabase documents Broadcast as its recommended option for real-time messaging and custom game state; Postgres Changes is simpler but authorizes each event per subscriber and scales less well. The session group is expected to be modest, but Broadcast also fits the need to send different safe information to participant and facilitator views.
- **Alternatives considered**:
  - **Postgres Changes**: fewer moving parts for basic row updates, but it would expose row-level change events that are harder to tailor around hidden ballots and is less suitable as a general game-state channel.
  - **Polling**: easiest to understand and no channel authorization setup, but adds needless delay and repeated requests during a live event.
- **Authorization and privacy**: Use private channels and Realtime Authorization policies. Do not broadcast an individual vote to player screens while its selection is open. After the game master closes a selection, the facilitator view may load the full results and display aggregate results and each player's vote on the shared screen. Supabase notes that private-channel access is controlled through RLS on `realtime.messages` and that complex authorization policies can add join latency; keep policies narrow and indexed.
- **Sources**: [Supabase Realtime getting started](https://supabase.com/docs/guides/realtime/getting_started), [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization), [Subscribing to database changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) (accessed 2026-11-20).

## Decision: Reuse existing Game Ako accounts for participant identity

- **Decision**: Register each player in a session using an existing authenticated Game Ako account; the game master selects the roster before starting. Discord remains the coordination and stream context, not the identity provider.
- **Rationale**: The application has verified user sessions, account IDs, and role-based access checks. Reusing account identity prevents duplicate player entries and makes one-vote-per-player limits enforceable. The current project has no Discord integration.
- **Alternatives considered**: Guest display names or Discord OAuth. Guest names are harder to deduplicate and protect; Discord OAuth would introduce an unrequested identity integration. This is an assumption to validate with the first player group.
- **Repository evidence**: `apps/web/src/lib/supabase/session.ts`; `apps/web/src/lib/authz/require-role.ts`; `supabase/migrations/0001_core_schema.sql`.

## Decision: Use database-backed admin content and visibility controls

- **Decision**: Keep page visibility and year-specific eligible games in database-backed content. Admin mutations follow the existing role check, validation, persistence, and route revalidation pattern. Edits take effect without a code release. A started session uses a snapshot of its game list and roster.
- **Rationale**: Existing site settings are stored in `public.site_settings`; admin mutations use server-side role verification and `revalidatePath`. Published articles also use database status to control public visibility.
- **Alternatives considered**: Hard-coded configuration or repository-managed files would require redeployment for ordinary content changes, contrary to the user's requirement.
- **Repository evidence**: `apps/web/src/features/moderation/settings-actions.ts`; `apps/web/src/app/admin/settings/comments/page.tsx`; `supabase/migrations/0001_core_schema.sql`; `supabase/migrations/0002_public_article_read_policies.sql`.

## Decision: Follow existing test layers and establish the live-session capacity at validation time

- **Decision**: Validate rule calculations with Vitest, data access and RLS with Supabase database tests, and cross-screen event flow with Playwright. Use a facilitator-led rehearsal to establish a performance baseline for the actual expected roster before the first public event.
- **Rationale**: The repository already uses these test layers. The user has not set a player-count cap; the system should support a roster fixed at session start, and the first event's expected roster provides a meaningful benchmark without inventing a universal concurrency target.
- **Alternatives considered**: A guessed high concurrency target would not reflect the small live community event, while no live rehearsal would leave realtime latency and reconnect behavior unverified.
- **Repository evidence**: `apps/web/package.json`; `apps/web/tests/`; `supabase/tests/database/`.

## Resolved Technical Context Unknowns

- **Language and runtime**: TypeScript 5.9; Node.js 24 or later and below 25.
- **Application and storage**: Next.js 16.4 / React 19 web app; Supabase Postgres 17.
- **Live updates**: Supabase Realtime Broadcast over private, authorized channels; Postgres remains authoritative.
- **Identity**: Existing authenticated Game Ako accounts; Discord is not used for sign-in.
- **Scale**: One session per GOTY year; the roster size is variable and fixed at session start. No universal player ceiling is imposed in this plan; validate against the invited roster before the event.
- **Research limitation**: No audience research artifact exists. This plan addresses implementation feasibility and records the user's direct decision to proceed; it does not claim independent evidence of audience demand.