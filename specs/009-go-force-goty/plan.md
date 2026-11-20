# Implementation Plan: Go Force GOTY

**Branch**: `feature/codex` (current) | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification for a live Game Ako GOTY selection session with an admin-managed game list and visibility, player voting, and post-event results.

## Summary

Deliver a Go Force live-session module in the existing web application. The admin maintains annual eligible games and page visibility without a redeployment. The game master runs a fixed-roster session through three rounds and a final ballot. Session state is persisted in Supabase Postgres; private Supabase Realtime Broadcast keeps facilitator and player views current while ballot details remain hidden until the game master closes each selection. Completed results are shown on a separate admin-controlled page.

## Technical Context

**Language/Version**: TypeScript 5.9; Node.js >=24 and <25.

**Primary Dependencies**: Next.js 16.4, React 19, `@supabase/ssr` 0.6, `@supabase/supabase-js` 2.57 (including Realtime Broadcast), Zod 4.

**Storage**: Supabase Postgres 17; existing authenticated accounts and RLS patterns.

**Testing**: Vitest for rule and validation logic; Supabase pgTAP database tests for constraints and RLS; Playwright for admin, player, facilitator, and public-result journeys.

**Target Platform**: Responsive web pages on the Ako Chronicles site. Players use their own browser screens while joining the live event through Discord; the game master shares the facilitator screen to the stream and Discord.

**Project Type**: Monorepo web application with `apps/web` and a Supabase database project at the repository root.

**Performance Goals**: Preserve responsive ballot and facilitator updates during one live event. Establish a measured latency baseline in a rehearsal using the invited roster; no universal player-count or latency threshold was provided.

**Constraints**: The roster and eligible-game list are fixed at session start; no late joins. Page visibility and eligible games are admin-controlled content and must change without redeployment. Individual votes are not visible on player screens until the game master closes the selection; the shared facilitator screen then displays group results and each player's vote. Only sessions meeting the 80% vote-completion minimum and Round 3 `go` requirement can be marked complete.

**Scale/Scope**: One active GOTY session per year; player count varies by event and is fixed when it starts. Validate each event against its invited roster. No external Discord or streaming integration is in scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Plan evidence |
|-----------|--------|---------------|
| I. Code Quality | PASS | Follow existing feature boundaries and naming conventions; review is required before merge. |
| II. Testing Standards | PASS | Use Vitest for rule logic, pgTAP for database/RLS behavior, and Playwright for cross-role journeys; automated tests are part of the implementation handoff. |
| III. User Experience Consistency | PASS WITH VALIDATION | Reuse the site's responsive components and design system; validate facilitator, mobile player, accessibility, and results-page usability before release. |
| IV. Security | PASS WITH CONTROLS | Reuse verified accounts and admin role checks; apply database RLS and private Realtime channel authorization. Ballot details remain unavailable to player views until a selection closes. |
| V. Performance Requirements | PASS WITH VALIDATION | Use Realtime Broadcast; measure update and reconnect behavior with the invited player roster before the live event, then retain that rehearsal as the baseline. |

No constitutional violations are identified. Usability validation and performance baseline are required release checks, not exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/009-go-force-goty/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── go-force-ui.md
└── tasks.md                 # Created by /speckit.tasks, not this plan
```

### Source Code (repository root)

```text
apps/web/src/
├── app/
│   ├── admin/                # Admin page visibility and annual game maintenance
│   └── go-force/             # Public, player, facilitator, and results pages
├── components/go-force/      # Go Force interface components
├── features/go-force/        # Session rules, queries, and user actions
├── lib/authz/                # Existing role and permission checks
└── lib/supabase/             # Existing authenticated Supabase clients

apps/web/tests/
├── unit/                     # Rule and form validation coverage
└── e2e/                      # Admin, session, and public result journeys

supabase/
├── migrations/               # Go Force state and authorization policy changes
└── tests/database/           # RLS and database behavior tests
```

**Structure Decision**: Extend the existing Next.js web app and Supabase database. Keep business rules in a Go Force feature area, route screens under the app router, and use existing admin/auth boundaries rather than adding a separate service.

## Complexity Tracking

None. The design adds no new deployable project or external identity/streaming service.

## Phase 0: Research

See [research.md](./research.md). Phase 0 resolves the stack, live-update approach, account identity, dynamic admin content, and testing strategy. It records the invited-roster rehearsal as the performance validation baseline because a fixed capacity was not specified.

## Phase 1: Design & Contracts

- [data-model.md](./data-model.md) defines annual games, fixed session snapshots, rounds, selections, ballots, results, and state transitions.
- [contracts/go-force-ui.md](./contracts/go-force-ui.md) defines role-specific screen behavior, ballot visibility, session transitions, and public result availability. No external HTTP API is introduced.
- [quickstart.md](./quickstart.md) describes local setup and validation scenarios using the existing test layers.

## Constitution Check (Post-Design)

| Principle | Status | Design evidence |
|-----------|--------|-----------------|
| I. Code Quality | PASS | Feature logic and UI stay in existing application boundaries; requirements and contracts define behavior before implementation. |
| II. Testing Standards | PASS | Data-model rules map to unit tests; RLS and authorization map to pgTAP tests; full live-session journeys map to Playwright. |
| III. User Experience Consistency | PASS WITH VALIDATION | Separate player and facilitator views preserve the live flow; use existing accessible UI components and include usability/accessibility review. |
| IV. Security | PASS WITH CONTROLS | Existing account authentication, admin permission checks, RLS, private channel policies, and post-close ballot access protect session data. |
| V. Performance Requirements | PASS WITH VALIDATION | Rehearsal with the actual roster establishes update, join, and reconnect baselines before the public event. |

No design violates the constitution. The live-session rehearsal, usability review, and automated tests remain release gates.