---

description: "Implementation tasks for Go Force GOTY"
---

# Tasks: Go Force GOTY

**Input**: Design documents from `/specs/009-go-force-goty/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/go-force-ui.md`, and `quickstart.md`

**Tests**: Included because the project constitution requires unit, integration, and end-to-end coverage.

**Organization**: Tasks are grouped by user story to support independent implementation and verification.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable work in different files with no incomplete-task dependency.
- **[Story]**: Story label mapping to `spec.md` (US1, US2, US3).
- Every task includes its target file path. Data-model citations point to canonical field constraints.

## Phase 1: Setup

**Purpose**: Honor the installed Next.js version's local guidance before editing application routes or actions.

- [ ] T001 [P] Review the installed Next.js 16 App Router, Server Actions, and cache revalidation guidance under `apps/web/node_modules/next/dist/docs/` before implementing Go Force routes or mutations.

---

## Phase 2: Foundational

**Purpose**: Establish shared database, validation, and identity boundaries that all stories require.

- [ ] T002 [P] Add pgTAP tests for Go Force admin, player, viewer, and private-channel access in `supabase/tests/database/go-force-access.test.sql`.
- [ ] T003 [P] Add unit tests for Go Force input validation and account/session access rules in `apps/web/tests/unit/go-force/schemas.test.ts` and `apps/web/tests/unit/go-force/access.test.ts`.
- [ ] T004 Create `supabase/migrations/0011_go-force-core.sql` with database entities, constraints, and RLS for annual games, page settings, session snapshots, participants, rounds, selections, game votes, final ballots, results, and private Realtime access. Apply the canonical constraints from `data-model.md`: `Annual Game Entry.game title`, `Annual Game Entry.GOTY year`, `Annual Game Entry.eligibility state`, `Go Force Page Settings.page visibility`, `Session.lifecycle status`, `Session Participant.account identity`, `Session Game Snapshot.title snapshot`, `Round.round number`, `Round.go limit per participant`, `Game Selection.selection uniqueness`, `Game Vote.choice`, `Final Ballot Vote.selected finalist`, `Final Ballot Vote.optional remark`, and `GOTY Result.winner games`.
- [ ] T005 Create shared Go Force state and input schemas in `apps/web/src/features/go-force/types.ts` and `apps/web/src/features/go-force/schemas.ts`, using `data-model.md` for `Session.lifecycle status`, `Round.round number`, `Round.go limit per participant`, `Game Vote.choice`, `Final Ballot Vote.selected finalist`, and `GOTY Result.winner games`.
- [ ] T006 Implement shared account, admin, game-master, and session-membership checks in `apps/web/src/features/go-force/access.ts`, reusing the existing verified-session and role helpers.

**Checkpoint**: Database access boundaries, shared types, and identity checks are ready before story work.

---

## Phase 3: User Story 1 — Run the live GOTY selection (Priority: P1)

**Goal**: Run a fixed-roster, three-round live selection with player ballots, facilitator controls, and a final GOTY result.

**Independent Test**: Start a session from a prepared annual game list, complete each round and the final ballot, and verify round advancement, abstentions, vote limits, the 80% completion rule, and winner/co-winner results.

### Tests for User Story 1

- [ ] T007 [P] [US1] Add Vitest coverage for round quotas, game advancement, abstentions, empty-shortlist stop, 80% completion, and tied winners in `apps/web/tests/unit/go-force/rules.test.ts`, using `data-model.md` fields `Round.go limit per participant`, `Game Vote.choice`, `Game Selection.advancement outcome`, `Session.vote completion percentage`, and `GOTY Result.winner games`.
- [ ] T008 [P] [US1] Add Playwright coverage for roster locking, roulette selection, player voting, facilitator reveal, and three-round completion in `apps/web/tests/e2e/go-force-session.spec.ts`.

### Implementation for User Story 1

- [ ] T009 [US1] Implement pure session and round rules in `apps/web/src/features/go-force/rules.ts`, applying `data-model.md` constraints for `Round.go limit per participant`, `Game Vote.choice`, `Game Selection.advancement outcome`, and `Session.vote completion percentage`.
- [ ] T010 [US1] Implement session creation and start actions in `apps/web/src/features/go-force/session-actions.ts`; freeze the eligible-game snapshot and account roster at start using `data-model.md` fields `Session.lifecycle status`, `Session Participant.account identity`, and `Session Game Snapshot.title snapshot`.
- [ ] T011 [US1] Implement roulette draw, vote submission, ballot close, abstention recording, and round transition actions in `apps/web/src/features/go-force/game-actions.ts`, following `data-model.md` constraints for `Game Selection.selection uniqueness`, `Game Vote.choice`, and `Round.go limit per participant`.
- [ ] T012 [US1] Implement final-ballot submission, vote completion calculation, 80% completion status, tied co-winners, and empty-session outcome handling in `apps/web/src/features/go-force/ballot-actions.ts`, following `data-model.md` fields `Final Ballot Vote.selected finalist`, `Final Ballot Vote.optional remark`, `Session.vote completion percentage`, and `GOTY Result.winner games`.
- [ ] T013 [US1] Add private Realtime Broadcast publishing and subscription handling in `apps/web/src/features/go-force/realtime.ts`; persist vote state before broadcasting and withhold individual votes until a selection is closed.
- [ ] T014 [US1] Build the player vote screen and route in `apps/web/src/app/go-force/session/[sessionId]/page.tsx` and `apps/web/src/components/go-force/player-session.tsx`, showing only the active selection and the signed-in player's own pending vote.
- [ ] T015 [US1] Build the game-master session screen in `apps/web/src/app/admin/go-force/sessions/[sessionId]/page.tsx` and `apps/web/src/components/go-force/facilitator-session.tsx`, including roster confirmation, roulette control, ballot close, and the post-close group and individual vote display.

**Checkpoint**: US1 is independently usable with an already populated eligible list.

---

## Phase 4: User Story 2 — Maintain page visibility and eligible games (Priority: P1)

**Goal**: Let the admin maintain the annual game list and page visibility as database-backed content without redeployment.

**Independent Test**: As admin, change page visibility and add/edit/remove a game; verify the public page reflects the changes and a started session retains its original snapshots.

### Tests for User Story 2

- [ ] T016 [P] [US2] Add Vitest tests for annual-game and visibility form validation in `apps/web/tests/unit/go-force/admin-schemas.test.ts`, referencing `data-model.md` fields `Annual Game Entry.game title`, `Annual Game Entry.GOTY year`, `Annual Game Entry.eligibility state`, and `Go Force Page Settings.page visibility`.
- [ ] T017 [P] [US2] Add Playwright coverage for admin visibility toggles, annual list maintenance, and no-redeployment updates in `apps/web/tests/e2e/go-force-admin.spec.ts`.

### Implementation for User Story 2

- [ ] T018 [US2] Implement admin game-list and visibility queries with validation in `apps/web/src/features/go-force/admin-queries.ts` and `apps/web/src/features/go-force/admin-schemas.ts`, following `data-model.md` constraints for `Annual Game Entry.game title`, `Annual Game Entry.GOTY year`, `Annual Game Entry.eligibility state`, and `Go Force Page Settings.page visibility`.
- [ ] T019 [US2] Implement admin-only add/edit/remove game and page-visibility actions in `apps/web/src/features/go-force/admin-actions.ts`; persist changes and revalidate the Go Force public/admin routes without redeployment, preserving started-session snapshots per `data-model.md` entity `Session Game Snapshot`.
- [ ] T020 [US2] Build the admin Go Force page and annual game-list/visibility forms in `apps/web/src/app/admin/go-force/page.tsx` and `apps/web/src/components/go-force/admin-controls.tsx`.

**Checkpoint**: US2 is independently usable to prepare and publish Go Force content before a session starts.

---

## Phase 5: User Story 3 — Review and publish GOTY results (Priority: P2)

**Goal**: Let the admin make completed session results available on a separate page after the event.

**Independent Test**: Complete a session, verify unpublished/incomplete results are not public, then show a completed results page with vote history, round outcomes, finalists, winners, and remarks.

### Tests for User Story 3

- [ ] T021 [P] [US3] Add Playwright coverage for hidden, incomplete, completed, and published result states in `apps/web/tests/e2e/go-force-results.spec.ts`.

### Implementation for User Story 3

- [ ] T022 [US3] Implement completed-session results queries and public visibility filtering in `apps/web/src/features/go-force/results-queries.ts`, using `data-model.md` fields `Session.lifecycle status`, `GOTY Result.winner games`, `GOTY Result.final vote totals`, and `GOTY Result.result-page visibility`.
- [ ] T023 [US3] Build the separate post-session results page in `apps/web/src/app/go-force/results/[sessionId]/page.tsx` and `apps/web/src/components/go-force/results-page.tsx`, displaying the recorded vote history, round results, finalists, winners, and submitted remarks only after the session is complete and visible.

**Checkpoint**: US3 is independently verifiable against a completed session fixture and an admin-controlled visibility state.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Meet the release requirements for accessibility, performance, and the December 2026 live event.

- [ ] T024 [P] Add keyboard, responsive-layout, and screen-reader checks for player and facilitator screens in `apps/web/tests/e2e/go-force-accessibility.spec.ts`.
- [ ] T025 Rehearse a full session with the invited roster and record join time, update latency, and reconnect recovery in `specs/009-go-force-goty/quickstart.md` before the live event.
- [ ] T026 Run the Go Force unit, database, E2E, typecheck, and lint commands from `apps/web/package.json`; fix failures in the affected `apps/web/` or `supabase/` files before release.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 can start immediately; read the installed Next.js guidance before route/action implementation.
- **Foundational (Phase 2)**: T002–T006 establish database, shared validation, and access boundaries; they block all user stories.
- **User Stories (Phase 3+)**: US1 and US2 can proceed in parallel after Phase 2 when US1 uses a prepared game-list fixture. US3 depends on completed data and visibility behavior from US1 and US2.
- **Polish (Phase 6)**: Depends on US1–US3; the rehearsal must finish before the planned live event.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; no dependency on the admin UI if its independent test uses a prepared eligible-game list.
- **US2 (P1)**: Starts after Phase 2; can be implemented alongside US1 using the shared database and access layer.
- **US3 (P2)**: Starts after US1 finalization data and US2 result-page visibility controls are available.

### Within Each User Story

- Create unit/database/E2E test cases before their corresponding implementation tasks.
- Keep domain rules separate from session actions and UI routes.
- Complete shared session actions before connecting player and facilitator screens.
- Complete result queries before rendering the public results page.

### Parallel Opportunities

- **Foundation**: T002, T003, and T004 work in separate files and can be drafted in parallel; T005/T006 follow the resulting shared model and auth contracts.
- **US1**: T007 and T008 can be authored in parallel. After T009–T013 stabilize their interfaces, T014 and T015 can be implemented in parallel in separate route/component files.
- **US2**: T016 and T017 can be authored in parallel; admin actions and the admin page should follow the schema/query contract.
- **US3**: T021 can be authored before implementation; T022 must precede T023.
- **Across stories**: US1 and US2 can be staffed in parallel after Phase 2; US3 follows both.

---

## Parallel Examples

### User Story 1

```text
Task T007: Write the Go Force rule unit tests in apps/web/tests/unit/go-force/rules.test.ts
Task T008: Write the live-session journey tests in apps/web/tests/e2e/go-force-session.spec.ts
```

After the shared action/realtime interfaces are stable:

```text
Task T014: Build the player vote screen in apps/web/src/components/go-force/player-session.tsx
Task T015: Build the facilitator screen in apps/web/src/components/go-force/facilitator-session.tsx
```

### User Story 2

```text
Task T016: Write admin schema tests in apps/web/tests/unit/go-force/admin-schemas.test.ts
Task T017: Write admin journey tests in apps/web/tests/e2e/go-force-admin.spec.ts
```

### User Story 3

No implementation tasks are parallelized within US3: result rendering depends on the completed-results query contract.

---

## Implementation Strategy

### MVP First

For the first live event, prioritize **US1 plus the minimum needed slice of US2**: the game master must be able to start the session from a prepared annual list, players must vote, and the admin must be able to manage current-year games/page visibility without a redeployment. US3 is the next increment and must be in place before the first post-event results are published so the portfolio is preserved.

### Incremental Delivery

1. Complete setup and the shared schema/access layer.
2. Deliver US1 using a prepared game list, then complete US2 so the admin can maintain content in production.
3. Complete US3 before publishing the first event results.
4. Rehearse all three stories with the invited roster and keep the measured baseline in `quickstart.md`.

### Parallel Team Strategy

1. Complete Phase 1 and Phase 2 as shared work.
2. After Phase 2, assign US1 and US2 to separate contributors if available.
3. Start US3 after the session/result and admin visibility contracts are stable.

---

## Notes

- `[P]` tasks are in separate files and have no dependency on incomplete tasks.
- `[US1]`, `[US2]`, and `[US3]` trace back to the feature's user stories.
- Data-model citations identify canonical constraints; implementation tasks should use those constraints rather than inventing alternatives.
- Test tasks are included to meet the project constitution; do not skip the database/RLS or end-to-end layers.