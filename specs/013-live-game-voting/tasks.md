---
description: "Task list for implementing Live Game Voting"
---

# Tasks: Live Game Voting

**Input**: Design documents from `specs/013-live-game-voting/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/live-game-voting.md`, and `quickstart.md`

**Testing**: Tests are included because the project constitution requires unit and integration coverage for changes.

**Organization**: Tasks are grouped by user story so each increment can be implemented and validated independently.

## Format

`- [ ] TNNN [P?] [USN?] Description with file path`

- `[P]` means the task can run in parallel with other marked tasks because it works in different files and has no dependency on incomplete work.
- `[USN]` maps a task to the corresponding user story in `spec.md`.
- Setup, foundational, and polish tasks do not use a story label.

## Phase 1: Setup

**Purpose**: Prepare for application changes using the repository's installed framework guidance.

- [X] T001 [P] Read the installed Next.js guidance relevant to server actions, client effects, and route refresh under `apps/web/node_modules/next/dist/docs/` before editing application code, as required by `apps/web/AGENTS.md`.

---

## Phase 2: Foundational

**Purpose**: Implement shared database and type foundations required by the late-player, realtime-privacy, and advancement stories.

- [X] T002 [P] Add pgTAP cases for authorized live participant addition, session-state and duplicate rejection, vote eligibility cutoffs, no pre-join abstention backfill, vote-read privacy, aggregate progress, and join-aware completion in `supabase/tests/database/go-force-live-player-voting.test.sql`.
- [X] T003 Implement the atomic participant-add operation in `supabase/migrations/0015_go-force-live-player-voting.sql`; follow `data-model.md` for `Go Force Session.id`, `Go Force Session.status`, and `Go Force Session.game_master_id`, and for `Session Participant.session_id`, `Session Participant.account_id`, `Session Participant.display_name_snapshot`, `Session Participant.roster_order`, `Session Participant.active`, and `Session Participant.created_at`; serialize roster order and join time against ballot transitions and enforce the existing active-account and 64-player rules.
- [X] T004 Update ballot closure, completion accounting, active account-option lookup, and vote-read policies/aggregate functions in `supabase/migrations/0015_go-force-live-player-voting.sql`; follow `data-model.md` for `Go Force Round.round_number`, `Go Force Round.status`, and `Go Force Round.go_limit`; for `GameSelection.selected_at`, `GameSelection.voting_deadline_at`, `GameSelection.voting_closed_at`, and `GameSelection.advancement_outcome`; for `GameVote.selection_id`, `GameVote.participant_account_id`, `GameVote.choice`, `GameVote.submitted_at`, and `GameVote.closed_at`; and for `Final Ballot Vote.session_id`, `Final Ballot Vote.participant_account_id`, `Final Ballot Vote.finalist_game_id`, `Final Ballot Vote.remark`, `Final Ballot Vote.submitted_at`, and `Final Ballot Vote.closed_at`. Materialize abstentions only for eligible participants, count actual eligible vote rows, exempt final-ballot entrants without Round 3 opportunities from the Round 3 “go” requirement, and keep individual open choices/remarks out of participant browser reads.
- [X] T005 [P] Extend Go Force view types for join-aware eligibility and safe open-ballot progress/closed-result aggregates in `apps/web/src/features/go-force/types.ts`; follow `data-model.md` for `Session Participant.created_at`, `GameVote.choice`, `GameVote.submitted_at`, and the derived `Round Advancement Summary`.

**Checkpoint**: The database can safely represent late joins and eligible votes, and typed views can carry only authorized data.

---

## Phase 3: User Story 1 - Add a player during a live session (Priority: P1)

**Goal**: Let an authorized admin or game master add an active account during a live session without changing prior ballots.

**Independent Test**: Add a player before an open game ballot's deadline and verify they can vote once; add another after a ballot closes and verify the earlier ballot remains unchanged and is not recorded as an abstention for them.

### Tests for User Story 1

- [X] T006 [P] [US1] Add server-action tests for successful add, authorization, duplicate, inactive-session, inactive-account, and full-roster outcomes in `apps/web/tests/unit/go-force/session-actions.test.ts`.
- [X] T007 [P] [US1] Add active-account query and facilitator/player component tests for the add-player control, updated roster, and not-eligible ballot history in `apps/web/tests/unit/go-force/session-queries.test.ts` and `apps/web/tests/unit/go-force/late-player-session.test.tsx`.
- [X] T008 [P] [US1] Add a browser journey covering addition during an open ballot, voting by the new participant, post-close addition without retroactive votes, and final-ballot addition in `apps/web/tests/e2e/go-force-live-player.spec.ts`.

### Implementation for User Story 1

- [X] T009 [P] [US1] Add and validate the active-session participant-add input schema in `apps/web/src/features/go-force/admin-schemas.ts`.
- [X] T010 [US1] Implement the authorized participant-add server action in `apps/web/src/features/go-force/session-actions.ts`; invoke the atomic database operation, map its safe failures, publish after success, and revalidate the session routes. Follow `data-model.md` for `Session Participant.account_id`, `Session Participant.display_name_snapshot`, `Session Participant.roster_order`, `Session Participant.active`, and `Session Participant.created_at`.
- [X] T011 [P] [US1] Load active-account candidates and join-aware participant history for the facilitator view in `apps/web/src/features/go-force/session-queries.ts` and `apps/web/src/app/admin/go-force/sessions/[sessionId]/page.tsx`; use `Session Participant.created_at` as defined in `data-model.md` to distinguish pre-join history from abstentions.
- [X] T012 [US1] Add the active-session player picker in `apps/web/src/components/go-force/late-player-form.tsx` and integrate its action state, roster update, and capacity/duplicate feedback in `apps/web/src/components/go-force/facilitator-session.tsx`; update copy that currently says the roster cannot change after start.
- [X] T013 [US1] Update the non-rostered player state to explain how to be added and show the active session after the participant is added in `apps/web/src/components/go-force/player-session.tsx`.

**Checkpoint**: Late players can join eligible open/future ballots, with no retroactive ballot rows or altered results.

---

## Phase 4: User Story 2 - See live session changes (Priority: P1)

**Goal**: Reflect committed session actions on connected views without manual refresh, reconcile after reconnect, and preserve vote privacy.

**Independent Test**: With separate player and facilitator sessions open, submit a vote and reconnect one screen; verify the views catch up automatically and no individual open vote choice is returned to another participant browser.

### Tests for User Story 2

- [X] T014 [P] [US2] Add client tests for refresh on successful private-channel subscription, broadcast receipt, browser reconnect, and visibility return in `apps/web/tests/unit/go-force/live-refresh.test.tsx`.
- [X] T015 [P] [US2] Add publisher and mutation-action tests confirming the private event contains only a server-resolved session identifier, events follow successful commits only, and a failed broadcast does not reverse a committed action in `apps/web/tests/unit/go-force/realtime-broadcast.test.ts`, `apps/web/tests/unit/go-force/game-actions.test.ts`, and `apps/web/tests/unit/go-force/ballot-actions.test.ts`.
- [X] T016 [P] [US2] Add a multi-player browser test for automatic vote and selection updates, open-ballot privacy, and state recovery after reconnect in `apps/web/tests/e2e/go-force-realtime.spec.ts`.

### Implementation for User Story 2

- [X] T017 [US2] Load authorized open-ballot progress and closed game aggregates in `apps/web/src/features/go-force/session-queries.ts`, display eligible/submitted counts in `apps/web/src/components/go-force/facilitator-session.tsx`, use aggregate results in `apps/web/src/components/go-force/player-session.tsx`, and refresh after subscription, browser reconnect, or return to the page in `apps/web/src/components/go-force/live-refresh.tsx` and `apps/web/src/features/go-force/realtime.ts`; retain the private topic and signal-only event.
- [X] T018 [P] [US2] Audit game-vote and final-ballot mutations so successful commits publish the private session invalidation using a server-resolved session identifier, while failures publish nothing, in `apps/web/src/features/go-force/game-actions.ts` and `apps/web/src/features/go-force/ballot-actions.ts`.

**Checkpoint**: Vote, ballot, and roster changes appear on connected screens and reconnects reconcile missed events without exposing open choices.

---

## Phase 5: User Story 3 - Distinguish vote choices at a glance (Priority: P2)

**Goal**: Give “go” and “no-go” distinct, accessible treatments on voting controls and result views.

**Independent Test**: Review controls and results in color and grayscale, including light and dark themes; verify visible labels distinguish the choices without color.

### Tests for User Story 3

- [X] T019 [P] [US3] Add unit tests for labeled “go”, “no-go”, and neutral abstention treatments in `apps/web/tests/unit/go-force/vote-choice-label.test.tsx`.
- [X] T020 [P] [US3] Extend the browser accessibility checks with active-ballot, result-label, grayscale, keyboard, and light/dark theme assertions in `apps/web/tests/e2e/go-force-accessibility.spec.ts`.

### Implementation for User Story 3

- [X] T021 [US3] Create the reusable labeled vote treatment for “go”, “no-go”, and abstention in `apps/web/src/components/go-force/vote-choice-label.tsx`, using existing semantic design tokens.
- [X] T022 [US3] Apply the labeled treatments to the player's submitted-vote state and facilitator's closed vote breakdown in `apps/web/src/components/go-force/player-session.tsx` and `apps/web/src/components/go-force/facilitator-session.tsx`.
- [X] T023 [US3] Verify and adjust semantic vote color tokens for contrast in both themes in `apps/web/src/app/globals.css`; keep text labels and ensure color is not the only distinction.

**Checkpoint**: Vote choices remain identifiable in player and facilitator views, including grayscale and accessible display modes.

---

## Phase 6: User Story 4 - Review games advancing to the next round (Priority: P2)

**Goal**: Give admins/game masters a live-round card listing qualifying games and exact “go” counts, with provisional and confirmed states.

**Independent Test**: Close ballots with zero, one, and multiple “go” votes; verify exact counts, exclusion of open ballots, provisional status during the round, confirmed status after completion, and the empty state.

### Tests for User Story 4

- [X] T024 [P] [US4] Add unit tests for qualifying games, exact submitted “go” counts, open-ballot exclusion, provisional/confirmed rounds, empty results, and card rendering in `apps/web/tests/unit/go-force/round-advancement-summary.test.ts`, `apps/web/tests/unit/go-force/session-queries.test.ts`, and `apps/web/tests/unit/go-force/round-advancement-card.test.tsx`.
- [X] T025 [P] [US4] Add a browser flow verifying the card updates after each closed ballot and retains the completed-round summary through transition in `apps/web/tests/e2e/go-force-advancement-summary.spec.ts`.

### Implementation for User Story 4

- [X] T026 [US4] Implement the derived round summary in `apps/web/src/features/go-force/round-advancement-summary.ts`; follow `data-model.md` for `Go Force Round.round_number` and `Go Force Round.status`, `GameSelection.voting_closed_at` and `GameSelection.advancement_outcome`, and `GameVote.selection_id`, `GameVote.participant_account_id`, `GameVote.choice`, and `GameVote.submitted_at`.
- [X] T027 [US4] Add the active-round and latest-completed-round summaries to `FacilitatorSessionView` and derive them from persisted authorized selections/votes in `apps/web/src/features/go-force/types.ts` and `apps/web/src/features/go-force/session-queries.ts`.
- [X] T028 [US4] Create and render the facilitator advancement card with separate provisional/confirmed states, exact counts, open-ballot exclusion, and an empty state in `apps/web/src/components/go-force/round-advancement-card.tsx` and `apps/web/src/components/go-force/facilitator-session.tsx`.

**Checkpoint**: Facilitators can see which games qualify for advancement and why, without confusing open ballots with final results.

---

## Phase 7: Polish & Cross-Cutting Validation

**Purpose**: Verify performance, accessibility, integration, and governance expectations across all stories.

- [ ] T029 Run the representative session latency rehearsal from `specs/013-live-game-voting/quickstart.md` with up to 64 participants and record whether at least 95% of updates arrive within 2 seconds.
- [ ] T030 Run the complete database, unit, typecheck, lint, browser, and accessibility commands in `specs/013-live-game-voting/quickstart.md`; record results and any environment limitation in that file.
- [ ] T031 Review the migration, authorization boundaries, user-facing states, tests, and generated changes against `.specify/memory/constitution.md` and `specs/013-live-game-voting/contracts/live-game-voting.md` before merge.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No feature dependencies; read installed Next.js guidance before application code is edited.
- **Foundational (Phase 2)**: T002 database tests can be written alongside setup. T003/T004 migration implementation follows T002, and T004 follows T003 because both extend the same migration. T005 can run in parallel with migration work. Application code waits until T001's installed framework guidance has been reviewed.
- **User Stories (Phases 3–6)**: Require the foundational migration and type contracts.
- **Polish (Phase 7)**: Requires all desired user stories to be complete.

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2. It can be implemented independently and is the suggested MVP.
- **US2 (P1)**: Depends on Phase 2 and can proceed in parallel with US1; it uses separate realtime/action files. The add-participant action in US1 must publish through the existing signal.
- **US3 (P2)**: Depends on Phase 2. Integrates with the player and facilitator screens modified by US1, so complete the conflicting UI changes in sequence.
- **US4 (P2)**: Depends on Phase 2. It shares the facilitator screen with US1 and US3; complete it after those screen changes to avoid file conflicts.

### Task Dependencies

```text
T001 || T002
T002 -> T003 -> T004
         \-> T005 (parallel with T003/T004)
T001 + T003 + T004 + T005 -> US1, US2
US1 and US2 may run in parallel after Phase 2
US1 -> US3 -> US4 (shared player/facilitator UI files)
US1 + US2 + US3 + US4 -> Polish
```

### Parallel Opportunities

- T001 and T002 can run in parallel; T005 can proceed alongside T003/T004.
- US1 test tasks T006–T008 are in separate files and can run in parallel before implementation.
- US1 schema/query work (T009/T011) can proceed in parallel; action/UI integration follows their outputs.
- US1 and US2 can be staffed in parallel after foundation because their implementation paths are distinct.
- US2 tests T014–T016 and US3 tests T019–T020 can each run in parallel within their story.
- US4 tests T024–T025 can run in parallel; its helper, query, and UI implementation then proceeds in dependency order.

## Parallel Examples

### User Story 1

```text
Task: T006 server-action unit tests in apps/web/tests/unit/go-force/session-actions.test.ts
Task: T007 UI unit tests in apps/web/tests/unit/go-force/late-player-session.test.tsx
Task: T008 browser tests in apps/web/tests/e2e/go-force-live-player.spec.ts
```

### User Story 2

```text
Task: T014 reconnect/refresh tests in apps/web/tests/unit/go-force/live-refresh.test.tsx
Task: T015 signal publisher tests in apps/web/tests/unit/go-force/realtime-broadcast.test.ts
Task: T016 multi-player browser tests in apps/web/tests/e2e/go-force-realtime.spec.ts
```

### User Story 3

```text
Task: T019 vote-label component tests in apps/web/tests/unit/go-force/vote-choice-label.test.tsx
Task: T020 browser accessibility assertions in apps/web/tests/e2e/go-force-accessibility.spec.ts
```

### User Story 4

```text
Task: T024 summary logic tests in apps/web/tests/unit/go-force/round-advancement-summary.test.ts
Task: T025 advancement-card browser tests in apps/web/tests/e2e/go-force-advancement-summary.spec.ts
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Setup and Foundational phases; the migration is required so late additions do not corrupt eligibility or completion counts.
2. Complete US1 and validate the live add, current-ballot vote, and no-retroactive-history scenarios independently.
3. Demonstrate the late-add flow before proceeding to the remaining experience work.

### Incremental Delivery

1. Implement US1 as the late-player MVP.
2. Implement US2 for automatic updates, reconnect recovery, and privacy enforcement.
3. Implement US3 for accessible vote-choice treatments.
4. Implement US4 for the provisional/confirmed advancement card.
5. Complete the rehearsal and full quickstart validation.

## Notes

- Tests are included because the project constitution requires unit and integration tests; add them before the corresponding implementation tasks.
- `[P]` marks only tasks on independent files with no incomplete prerequisites.
- All user-story tasks use `[US1]` through `[US4]`; setup, foundation, and polish tasks intentionally omit story labels.
- Data constraints are cited at the implementing tasks using `data-model.md` and the corresponding `Entity.field` names.
