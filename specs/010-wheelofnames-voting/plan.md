# Implementation Plan: Wheel of Names Voting

**Branch**: `010-wheelofnames-voting` | **Date**: 2026-11-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification for using the Wheel of Names API to draw Go Force games, reveal the selected title after the spin, and then open voting.

## Summary

Replace Go Force's local random selection and decorative reveal with Wheel of Names API v3's server-side spin-animation operation. The server submits a `WheelConfig` built from the active round's remaining games, receives the animation and winner, validates the winner against the round pool, and commits it through the existing Go Force data flow. Set `autoRemoveWinner` and rebuild each subsequent wheel configuration from the persisted remaining pool so a selected game cannot be drawn again in that round. Add a blank `WHEEL_OF_NAMES_API_KEY=` entry to `apps/web/.env.example`; the actual key is supplied separately and remains server-only.

## Technical Context

**Language/Version**: TypeScript 5.9; Node.js >=24 and <25.

**Primary Dependencies**: Next.js 16.4, React 19, `@supabase/ssr` 0.6, `@supabase/supabase-js` 2.57, Zod 4, and the Wheel of Names API v3.

**Storage**: Supabase Postgres 17 remains authoritative for sessions, round pools, game selections, and votes. The provider spin request/response is transient; no provider wheel identifier needs to be persisted for the stateless animation endpoint.

**Testing**: Vitest for API response parsing, wheel configuration, and result validation; Supabase pgTAP for authorization, candidate validation, and selection constraints; Playwright for facilitator/player spin-to-vote journeys, provider failures, accessibility, and reconnect behavior.

**Target Platform**: Responsive web application. The facilitator runs the spin from the shared facilitator screen; rostered players use their own authenticated browser screens.

**Project Type**: Monorepo web application (`apps/web`) with Supabase Postgres and Realtime.

**Performance Goals**: Preserve a responsive live-session flow and establish provider response and player-update latency during a rehearsal with the expected roster. No absolute external-service latency target was provided.

**Constraints**:
- Use `POST https://wheelofnames.com/api/v3/wheels/animate` from server-side code with the provider's `x-api-key` header. The API key MUST NOT use a `NEXT_PUBLIC_` name or be sent to browser clients.
- Add `WHEEL_OF_NAMES_API_KEY=` to `apps/web/.env.example`; the real value is supplied separately through `.env.local` or deployment secrets.
- Send `autoRemoveWinner: true` in the provider wheel configuration. The REST animation response does not persist a changed wheel list, so every request MUST use a candidate list derived from current Go Force session state.
- Supabase remains authoritative. A provider result must match an unselected title/ID in the active round and be committed before players can vote.
- Provider failure, an invalid result, or a failed database commit must not create a selection or change the round's eligible pool.
- Preserve existing Go Force session, round, voting, advancement, and results rules.

**Scale/Scope**: One active Go Force session per GOTY year; the existing roster is fixed at session start. The current round's remaining pool is submitted for each spin. No new identity, Discord, or streaming integrations are in scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Plan evidence |
|-----------|--------|---------------|
| I. Code Quality | PASS | Isolate provider communication behind a typed server-side feature adapter; keep the database transition and user-facing error paths explicit. |
| II. Testing Standards | PASS | Cover provider configuration/result parsing, guarded database transitions/RLS, and facilitator/player end-to-end flows with the repository's existing test layers. |
| III. User Experience Consistency | PASS WITH VALIDATION | Reuse the existing Go Force facilitator/player screens; verify keyboard use, accessible spin status, responsive animation, and understandable provider failures. |
| IV. Security | PASS WITH CONTROLS | Keep the API key server-side; authorize spin actions; validate provider result IDs and titles against the active pool; preserve authenticated vote authorization. |
| V. Performance Requirements | PASS WITH VALIDATION | Measure provider response, animation, and player update behavior in a live-session rehearsal; retain the rehearsal as the feature baseline. |

No constitutional violations are identified. Provider availability, accessibility/usability validation, and a live-session rehearsal are release checks.

## Project Structure

### Documentation (this feature)

```text
specs/010-wheelofnames-voting/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── go-force-wheelofnames.md
└── tasks.md                 # Created by /speckit.tasks, not this plan
```

### Source Code (repository root)

```text
apps/web/
├── .env.example              # Add blank WHEEL_OF_NAMES_API_KEY placeholder
├── src/
│   ├── components/go-force/
│   │   ├── facilitator-session.tsx
│   │   └── roulette-reveal.tsx
│   ├── features/go-force/
│   │   ├── wheel-of-names-client.ts
│   │   ├── game-actions.ts
│   │   ├── session-queries.ts
│   │   └── types.ts
│   └── lib/env.ts            # Server-only API-key accessor
└── tests/
    ├── unit/go-force/
    └── e2e/go-force-session.spec.ts

supabase/
├── migrations/0013_go-force-wheelofnames.sql
└── tests/database/go-force-wheelofnames.test.sql
```

**Structure Decision**: Extend the existing Go Force feature in the Next.js application and Supabase project. Keep provider credentials and API requests in server-side feature code. The application submits a fresh candidate configuration for each spin and persists only validated Go Force selections; no separate provider service or persistent provider-wheel record is needed.

## Complexity Tracking

None. The external provider is an explicit user requirement; no new deployable service or durable provider-owned state is proposed.

## Phase 0: Research

See [research.md](./research.md). The v3 OpenAPI contract identifies the server-side animation endpoint, API-key header, winner response, and winner-removal configuration. The user-supplied API key is not yet available; the local/environment example uses a blank placeholder, and a real provider-backed rehearsal requires the key.

## Phase 1: Design & Contracts

- [data-model.md](./data-model.md) defines how a provider winner becomes an existing game selection and how subsequent wheel entries are derived.
- [contracts/go-force-wheelofnames.md](./contracts/go-force-wheelofnames.md) defines the server-side request/response boundary, result validation, removal behavior, and player reveal/vote transition.
- [quickstart.md](./quickstart.md) describes local setup, automated validation, and a provider-backed rehearsal. Automated tests use a mocked provider; a real spin requires the user-supplied API key.

## Constitution Check (Post-Design)

| Principle | Status | Design evidence |
|-----------|--------|-----------------|
| I. Code Quality | PASS | A focused provider adapter separates vendor I/O from existing Go Force vote and round rules. |
| II. Testing Standards | PASS | Provider behavior maps to unit tests; server/database authorization maps to pgTAP; full spin-to-vote journeys map to Playwright. |
| III. User Experience Consistency | PASS WITH VALIDATION | The facilitator animation/reveal and player ballot states remain distinct; keyboard, responsive, reconnect, and failure states are included in validation. |
| IV. Security | PASS WITH CONTROLS | API credentials never enter client bundles; only a validated active-round result can be persisted; existing facilitator and vote authorization remain in force. |
| V. Performance Requirements | PASS WITH VALIDATION | Provider and realtime behavior are measured in a rehearsal with the actual roster before the live event. |

No design violates the constitution. The user's API key is required before a real provider-backed rehearsal.
