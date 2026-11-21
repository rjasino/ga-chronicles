---

description: "Tasks for implementing Wheel of Names voting"
---

# Tasks: Wheel of Names Voting

**Input**: Design documents from `/specs/010-wheelofnames-voting/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Unit, database, and end-to-end test tasks are included to meet the project constitution's testing requirements and the validation approach in plan.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label from spec.md (US1 or US2)
- Every task includes the target file path.

## Path Conventions

- Web application: `apps/web/src/`, `apps/web/tests/`
- Database: `supabase/migrations/`, `supabase/tests/database/`
- Feature design: `specs/010-wheelofnames-voting/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Document the required provider credential without committing a secret.

- [X] T001 Add a blank `WHEEL_OF_NAMES_API_KEY=` placeholder to `apps/web/.env.example`; do not put a live key in the example file.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish safe server-side provider configuration and a reusable v3 API client before either user story uses it.

- [X] T002 [P] Add unit tests for configured and missing Wheel of Names credentials in `apps/web/tests/unit/lib/env.test.ts`.
- [X] T003 Add a server-only `getWheelOfNamesApiKey()` accessor in `apps/web/src/lib/env.ts`; keep the key out of the public environment schema and use the missing-key behavior covered by T002.
- [X] T004 [P] Add mocked HTTP contract tests for v3 authentication, request construction, animation decoding, winner parsing, and provider errors in `apps/web/tests/unit/go-force/wheel-of-names-client.test.ts`; cover `Wheel of Names Spin Request/Response.request.wheelConfig.entries[].id`, `Wheel of Names Spin Request/Response.request.wheelConfig.entries[].text`, `Wheel of Names Spin Request/Response.response.animation`, `Wheel of Names Spin Request/Response.response.winner.id`, and `Wheel of Names Spin Request/Response.response.winner.text` in `data-model.md`.
- [X] T005 Implement the server-side `POST /wheels/animate` client, typed response validation, and recoverable provider errors in `apps/web/src/features/go-force/wheel-of-names-client.ts`; satisfy `Wheel of Names Spin Request/Response.request.wheelConfig.entries[].id`, `Wheel of Names Spin Request/Response.request.wheelConfig.entries[].text`, `Wheel of Names Spin Request/Response.request.wheelConfig.autoRemoveWinner`, `Wheel of Names Spin Request/Response.response.animation`, `Wheel of Names Spin Request/Response.response.winner.id`, and `Wheel of Names Spin Request/Response.response.winner.text` in `data-model.md`, and use the credential accessor from T003.

**Checkpoint**: Server-only API configuration and provider client are ready; no browser code contains the API key.

---

## Phase 3: User Story 1 - Draw and vote on a game (Priority: P1) — MVP

**Goal**: A facilitator completes a Wheel of Names spin, commits the valid result, and only then reveals that game and opens its existing player ballot.

**Independent Test**: With a live round and multiple remaining games, exercise a successful mocked provider spin and verify players cannot vote before the completed result is committed; then verify facilitator and player screens show the same title and the player can submit the existing vote.

### Tests for User Story 1

- [X] T006 [P] [US1] Add pgTAP coverage for the candidate-specific selection RPC in `supabase/tests/database/go-force-wheelofnames.test.sql`; verify active-round eligibility, facilitator authorization, open-ballot rejection, and same-round uniqueness using `Game Selection.round_id`, `Game Selection.session_game_id`, `Game Selection.selection_order`, and `Game Selection.voting_closed_at` from `data-model.md`.
- [X] T007 [P] [US1] Add component tests for pending, successful-animation, and failed-spin reveal states in `apps/web/tests/unit/go-force/roulette-reveal.test.tsx`; use `Wheel of Names Spin Request/Response.response.animation` and `Wheel of Names Spin Request/Response.response.winner.text` from `data-model.md`.
- [X] T008 [P] [US1] Add a deterministic provider-response fixture and Playwright coverage for the spin-to-vote journey in `apps/web/tests/e2e/fixtures/wheel-of-names.ts` and `apps/web/tests/e2e/go-force-session.spec.ts`; verify that no ballot appears before a successful committed result and the player can vote afterward.

### Implementation for User Story 1

- [X] T009 [P] [US1] Add `go_force_commit_selection` in `supabase/migrations/0013_go-force-wheelofnames.sql`, validating the authorized facilitator, active `Game Selection.round_id`, eligible `Game Selection.session_game_id`, positive/unique `Game Selection.selection_order`, and absence of an open ballot via `Game Selection.voting_closed_at` as defined in `data-model.md`; preserve `Annual Eligible-Game Entry.id` and `Annual Eligible-Game Entry.eligibility_state`; revoke/drop the old random-draw RPC so local random selection cannot bypass the provider.
- [X] T010 [US1] Replace the local-random call in `drawGoForceSelection` in `apps/web/src/features/go-force/game-actions.ts` with a WheelConfig built from `Round.candidate_pool` and `Round.remaining_pool`, provider request, winner ID/title validation, candidate-specific RPC commit, and post-commit broadcast/revalidation; map `Wheel of Names Spin Request/Response.response.winner.id` and `Wheel of Names Spin Request/Response.response.winner.text` to `Game Selection.session_game_id` and `Session Game Snapshot.title_snapshot` using `data-model.md`.
- [X] T011 [P] [US1] Update `apps/web/src/components/go-force/roulette-reveal.tsx` to display the provider animation and selected title only for a successful draw; handle `Wheel of Names Spin Request/Response.response.animation` and `Wheel of Names Spin Request/Response.response.winner.text` per `data-model.md`.
- [X] T012 [US1] Integrate the provider animation, pending state, recoverable error, and disabled-during-spin control into `apps/web/src/components/go-force/facilitator-session.tsx`; reveal the result from T010/T011 only after the database commit succeeds.

**Checkpoint**: The facilitator can complete one provider-backed draw, and rostered players can vote on that committed result without changing existing ballot rules.

---

## Phase 4: User Story 2 - Remove drawn games from the active round (Priority: P1)

**Goal**: The provider animation removes the drawn game, later spins omit it from the current-round list, and the admin's annual eligible-game list remains unchanged.

**Independent Test**: Draw a game, verify the provider request enables winner removal and the next request excludes that game, then verify the annual eligible-game entry remains available and the title can appear in a later round if it advanced.

### Tests for User Story 2

- [X] T013 [P] [US2] Add unit coverage that the removal-enabled WheelConfig is built from the current remaining game list in `apps/web/tests/unit/go-force/wheel-of-names-removal.test.ts`; cite `Wheel of Names Spin Request/Response.request.wheelConfig.autoRemoveWinner`, `Wheel of Names Spin Request/Response.request.wheelConfig.entries[].id`, `Wheel of Names Spin Request/Response.request.wheelConfig.entries[].text`, and `Round.remaining_pool` from `data-model.md`.
- [X] T014 [P] [US2] Add pgTAP assertions that a committed selection does not delete or change its annual source game and cannot be selected twice in the same round in `supabase/tests/database/go-force-wheelofnames.test.sql`; cite `Annual Eligible-Game Entry.id`, `Annual Eligible-Game Entry.eligibility_state`, `Session Game Snapshot.id`, `Session Game Snapshot.title_snapshot`, `Game Selection.round_id`, and `Game Selection.session_game_id` from `data-model.md`.
- [X] T015 [P] [US2] Extend the provider-fixture Playwright coverage in `apps/web/tests/e2e/go-force-session.spec.ts` to assert that a later spin omits a previously drawn title, the annual admin list still contains it, and an advanced title can enter the next round; cite `Round.candidate_pool`, `Round.remaining_pool`, and `Game Selection.session_game_id` from `data-model.md`.

### Implementation for User Story 2

- [X] T016 [US2] Set `autoRemoveWinner: true` on each provider WheelConfig and rebuild entries from the database-derived remaining games for every spin in `apps/web/src/features/go-force/wheel-of-names-client.ts` and `apps/web/src/features/go-force/game-actions.ts`; satisfy `Wheel of Names Spin Request/Response.request.wheelConfig.autoRemoveWinner`, `Wheel of Names Spin Request/Response.request.wheelConfig.entries[].id`, `Wheel of Names Spin Request/Response.request.wheelConfig.entries[].text`, and `Round.remaining_pool` in `data-model.md`, without changing `Annual Eligible-Game Entry.id` or `Annual Eligible-Game Entry.eligibility_state`.

**Checkpoint**: Repeated spins cannot select a drawn title within the round, while the annual source list and later-round advancement remain intact.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Complete accessibility, security, and release validation across both stories.

- [X] T017 Add an accessible animation description and reduced-motion/static-result behavior to `apps/web/src/components/go-force/roulette-reveal.tsx`.
- [ ] T018 Run the unit, database, typecheck, and end-to-end commands in `specs/010-wheelofnames-voting/quickstart.md`; record the provider-backed rehearsal timings and confirm no real API key is committed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on T001; blocks both user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2; provides the successful draw and ballot flow.
- **User Story 2 (Phase 4)**: Depends on User Story 1 because removal occurs after a committed draw.
- **Polish (Phase 5)**: Depends on both user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2; can be implemented and tested as the first usable increment.
- **User Story 2 (P1)**: Starts after User Story 1; extends its provider request and verifies round-scoped removal without changing the annual list.

### Within Each User Story

- Add automated tests before implementation tasks.
- For User Story 1, the database migration and reveal component can be implemented in parallel after their tests; the server action depends on the API client and database transition; facilitator integration depends on the action and reveal component.
- For User Story 2, unit, database, and end-to-end tests use separate files and can be prepared in parallel; update the provider configuration after the tests are in place.
- Complete the independent test criteria at each story checkpoint before moving on.

### Parallel Opportunities

- T002 and T004 can run in parallel after T001.
- T006, T007, and T008 can run in parallel after Phase 2.
- T009 and T011 can run in parallel after their corresponding tests; T010 follows T009 and T005; T012 follows T010 and T011.
- T013, T014, and T015 can run in parallel after User Story 1.
- User Story 2 cannot be completed before User Story 1, even though both are P1.

## Parallel Example: User Story 1

```text
Task: T006 — Add database selection-transition tests in supabase/tests/database/go-force-wheelofnames.test.sql
Task: T007 — Add reveal component tests in apps/web/tests/unit/go-force/roulette-reveal.test.tsx
Task: T008 — Add provider fixture and spin-to-vote Playwright coverage in apps/web/tests/e2e/
```

## Parallel Example: User Story 2

```text
Task: T013 — Add provider removal/config unit tests in apps/web/tests/unit/go-force/wheel-of-names-removal.test.ts
Task: T014 — Add annual-list and same-round database assertions in supabase/tests/database/go-force-wheelofnames.test.sql
Task: T015 — Add repeated-spin Playwright coverage in apps/web/tests/e2e/go-force-session.spec.ts
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete User Story 1 and validate a provider result can be committed before players vote.
3. User Story 1 is the first demonstrable increment; for a live event, also complete User Story 2 because no-repeat removal is a P1 round rule.

### Incremental Delivery

1. Add the server-only API key configuration and provider client.
2. Deliver the draw-to-vote flow and validate it independently (User Story 1).
3. Add/verify winner removal and annual-list preservation (User Story 2).
4. Complete the quickstart rehearsal, accessibility checks, and full automated suite.

## Notes

- `[P]` marks tasks that touch independent files and have no dependency on incomplete tasks.
- `[US1]` and `[US2]` map directly to the P1 stories in `spec.md`.
- Keep the actual Wheel of Names API key in local/deployment secrets; `apps/web/.env.example` contains only a blank placeholder.
- Do not restore a local random-selection fallback if the provider is unavailable.
- T018's live provider rehearsal remains pending until a real Wheel of Names API key is configured locally or in deployment secrets; no real key was supplied or committed.
- T018 validation: unit tests (207), database tests (129), typecheck, and lint passed. The focused footer and Go Force E2E rerun passed; the full E2E run had 62 passes and 35 failures, including 32 visual-baseline mismatches and 2 rich-text assertions, plus a footer-port mismatch fixed and verified in the focused rerun.
