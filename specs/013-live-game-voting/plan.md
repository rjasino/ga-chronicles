# Implementation Plan: Live Game Voting

**Branch**: `013-live-game-voting` | **Date**: 2026-11-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification for adding participants during an active Go Force session, reflecting user actions live, distinguishing vote choices, and summarizing round advancement for facilitators.

## Summary

Extend the existing Go Force session flow rather than introduce a second session model. Add a participant through an authorized atomic database operation while a session is live or on its final ballot. Use the participant's creation time and existing ballot vote rows to distinguish eligible opportunities from pre-join history, and update completion accounting so late participants are not charged for ballots they could not vote on. Reuse the existing private session-update broadcast and authorized route refresh. Present vote choices with accessible semantic treatments and derive a facilitator-only advancement card from closed selections.

## Technical Context

**Language/Version**: TypeScript 5.9; Node.js >=24 and <25.

**Primary Dependencies**: Next.js 16.4, React 19, `@supabase/ssr` 0.6, `@supabase/supabase-js` 2.57, Zod 4, Tailwind CSS 4.3.

**Storage**: Supabase Postgres 17; existing Go Force session, participant, selection, and vote tables remain authoritative.

**Testing**: Vitest 5 for feature logic and components; pgTAP through the Supabase CLI for authorization and transaction rules; Playwright and axe-core for live session, realtime, responsive, and accessibility flows.

**Target Platform**: Responsive browser application. Admins/game masters operate the facilitator session screen; rostered players use their authenticated session screens.

**Project Type**: Monorepo web application (`apps/web`) with Supabase Postgres and Realtime.

**Performance Goals**: At least 95% of committed live-session actions appear on relevant connected screens within 2 seconds. Measure during a representative browser rehearsal with up to the existing 64-player session limit.

**Constraints**:
- Preserve Go Force authorization, round progression, vote quotas, ballot deadlines, and the at-least-one-“go” advancement rule.
- Keep roster modification on a narrow authorized server/database path; do not broaden direct participant-table writes.
- Enforce ballot privacy in database reads: do not send individual open-ballot choices or remarks to any participant browser. Use authorized aggregate counts for open-ballot progress and keep Realtime messages as change signals only.
- A late participant is eligible only from their join time and only for game ballots before the existing voting cutoff; a participant added during the open final ballot may cast that ballot.
- Closed-ballot rows represent vote opportunities. Earlier ballots without a row for a late participant are not abstentions.
- Keep the existing 64-participant cap and responsive design language; add no dependencies or external services.
- Before changing application code, consult relevant installed Next.js guidance at `apps/web/node_modules/next/dist/docs/` as required by `apps/web/AGENTS.md`.

**Scale/Scope**: One active Go Force session per GOTY year, up to 64 participants and the existing three rounds plus final ballot. No new login, identity, messaging, or streaming integration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Plan evidence |
|-----------|--------|---------------|
| I. Code Quality | PASS | Extend the existing Go Force domain and action patterns; keep roster changes and eligibility decisions explicit and documented. |
| II. Testing Standards | PASS | Cover domain/query and UI behavior with unit tests, authorization and transaction rules with pgTAP, and the live journey with Playwright. |
| III. User Experience Consistency | PASS WITH VALIDATION | Reuse the facilitator/player screens and semantic design tokens; verify keyboard access, mobile layout, text labels, and light/dark contrast. |
| IV. Security | PASS WITH CONTROLS | Authorize additions as admin/game master in both the server action and database operation; constrain raw open-vote reads and publish no vote data in broadcasts. |
| V. Performance Requirements | PASS WITH VALIDATION | Measure action-to-screen update latency against the 2-second/95% target in a representative live-session rehearsal. |

No constitutional violations are identified. Accessible vote presentation, authorization boundaries, and live-update latency require validation.

## Project Structure

### Documentation (this feature)

```text
specs/013-live-game-voting/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── live-game-voting.md
└── tasks.md                 # Created by /speckit.tasks, not this plan
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── components/go-force/
│   │   ├── facilitator-session.tsx
│   │   ├── late-player-form.tsx
│   │   ├── player-session.tsx
│   │   ├── vote-choice-label.tsx
│   │   ├── round-advancement-card.tsx
│   │   └── live-refresh.tsx
│   └── features/go-force/
│       ├── session-actions.ts
│       ├── session-queries.ts
│       ├── round-advancement-summary.ts
│       ├── admin-schemas.ts
│       ├── realtime-broadcast.ts
│       ├── realtime.ts
│       └── types.ts
└── tests/
    ├── unit/go-force/
    └── e2e/
        ├── go-force-session.spec.ts
        ├── go-force-live-player.spec.ts
        ├── go-force-realtime.spec.ts
        ├── go-force-advancement-summary.spec.ts
        └── go-force-accessibility.spec.ts

supabase/
├── migrations/
│   └── 0015_go-force-live-player-voting.sql
└── tests/database/
    └── go-force-live-player-voting.test.sql
```

**Structure Decision**: Extend the existing Next.js Go Force components, feature actions/queries, Supabase migration sequence, and established unit/database/browser test locations. The facilitator screen already serves admins and game masters and receives private session-update signals. No standalone service or new dependency is needed.

## Complexity Tracking

None. The changes fit the existing application and database boundaries and do not introduce a constitution exception.

## Phase 0: Research

See [research.md](./research.md). It records the roster/RLS constraints, join-time vote eligibility, join-aware completion accounting, existing private broadcast pattern, summary derivation, and repository test conventions. No unresolved technical clarifications remain.

## Phase 1: Design & Contracts

- [data-model.md](./data-model.md) defines participant join time, eligible game/final ballot opportunities, row-based completion accounting, and derived advancement summaries.
- [contracts/live-game-voting.md](./contracts/live-game-voting.md) defines the add-participant action, vote-display rules, realtime signal, and facilitator summary behavior.
- [quickstart.md](./quickstart.md) describes local prerequisites and the runnable database, unit, browser, and accessibility validation scenarios.

## Constitution Check (Post-Design)

| Principle | Status | Design evidence |
|-----------|--------|-----------------|
| I. Code Quality | PASS | Uses the existing participant timestamps, vote rows, semantic UI tokens, and action/query boundaries instead of duplicating state. |
| II. Testing Standards | PASS | The design assigns coverage to unit, pgTAP, Playwright, and accessibility checks for each new behavior. |
| III. User Experience Consistency | PASS WITH VALIDATION | Reuses existing facilitator/player screens and colors; text labels and mobile/keyboard/accessibility checks are required. |
| IV. Security | PASS WITH CONTROLS | A scoped database function validates authority and account/session state; RLS prevents open-vote choices reaching browsers and private broadcasts remain signal-only. |
| V. Performance Requirements | PASS WITH VALIDATION | The update target is measurable end-to-end and explicitly included in live rehearsal validation. |

No design violates the constitution. The existing 64-player limit, timeout semantics, and vote-visibility policy are retained; any player-identity or authorization behavior remains under the existing session helpers and policies.
