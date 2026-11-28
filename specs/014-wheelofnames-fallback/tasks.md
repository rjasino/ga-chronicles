---

description: "Task list for Wheel of Names Fallback Draw implementation"
---

# Tasks: Wheel of Names Fallback Draw

**Input**: Design documents from `/specs/014-wheelofnames-fallback/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/go-force-fallback-contract.md`, `quickstart.md`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., `US1`, `US2`, `US3`)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the migration and test file scaffolding for the fallback draw feature.

- [X] T001 Create database migration stub `supabase/migrations/0017_go-force-wheel-fallback.sql` for Wheel of Names fallback schema and RPCs
- [X] T002 [P] Create pgTAP test file stub `supabase/tests/database/go-force-wheel-fallback.test.sql`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schema, RPCs, TypeScript types, and query projections that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add `wheel_fallback_enabled` column to `go_force_page_settings` (per `data-model.md` `go_force_page_settings.wheel_fallback_enabled`), `wheel_fallback_enabled` column to `go_force_sessions` (per `data-model.md` `go_force_sessions.wheel_fallback_enabled`), and `fallback_queue` column to `go_force_rounds` (per `data-model.md` `go_force_rounds.fallback_queue`) in `supabase/migrations/0017_go-force-wheel-fallback.sql`
- [X] T004 Update `public.go_force_create_session` in `supabase/migrations/0017_go-force-wheel-fallback.sql` to initialize `go_force_sessions.wheel_fallback_enabled` from `go_force_page_settings.wheel_fallback_enabled` (per `data-model.md` `go_force_sessions.wheel_fallback_enabled`)
- [X] T005 Implement `public.go_force_set_wheel_fallback(target_session uuid, fallback_enabled boolean)` RPC in `supabase/migrations/0017_go-force-wheel-fallback.sql` enforcing `go_force_is_facilitator(target_session)` and `status in ('ready', 'live')` per `contracts/go-force-fallback-contract.md`
- [X] T006 Implement `public.go_force_draw_fallback_selection(target_session uuid)` RPC in `supabase/migrations/0017_go-force-wheel-fallback.sql` to lock the active round, filter `go_force_rounds.fallback_queue` against remaining eligible games, lazily shuffle (`ORDER BY random()`) when empty, pop the head element, and insert into `go_force_selections` per `contracts/go-force-fallback-contract.md`
- [X] T007 [P] Add `wheel_fallback_enabled: boolean` to `GoForcePageSettings` and `GoForceSession` types in `apps/web/src/features/go-force/types.ts` (per `data-model.md` `go_force_page_settings.wheel_fallback_enabled` and `go_force_sessions.wheel_fallback_enabled`)
- [X] T008 [P] Include `wheel_fallback_enabled` in `getGoForcePageSettings` select and fallback default in `apps/web/src/features/go-force/admin-queries.ts`
- [X] T009 [P] Ensure `go_force_rounds.fallback_queue` is omitted from client-facing queries and `wheel_fallback_enabled` is selected on `go_force_sessions` in `apps/web/src/features/go-force/session-queries.ts`

**Checkpoint**: Database schema, RPCs, types, and queries are ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Toggle fallback draw mode in settings before or during a game (Priority: P1) 🎯 MVP

**Goal**: Allow authorized facilitators (admins and game masters) to toggle fallback draw mode on/off in settings before a session starts and mid-game during an active session, and draw from the fallback queue when enabled.

**Independent Test**: Enable fallback mode in `/admin/go-force` or on a `ready` session, start the session, draw a game without Wheel of Names, then toggle fallback mode off/on mid-round and verify remaining games carry over without restarting or duplicating already-drawn games.

### Implementation for User Story 1

- [X] T010 [P] [US1] Extend `goForceVotingSettingsSchema` (or add `wheelFallbackSettingSchema`) and `setWheelFallbackSchema` with `wheelFallbackEnabled: z.boolean()` in `apps/web/src/features/go-force/admin-schemas.ts`
- [X] T011 [US1] Update `saveGoForceVotingSettings` (or add `saveGoForceWheelFallbackSetting`) in `apps/web/src/features/go-force/admin-actions.ts` to persist `wheel_fallback_enabled` on `go_force_page_settings`
- [X] T012 [US1] Add `setGoForceWheelFallback` server action in `apps/web/src/features/go-force/session-actions.ts` calling `go_force_set_wheel_fallback` RPC and broadcasting `publishGoForceSessionUpdate`
- [X] T013 [US1] Update `drawGoForceSelection` in `apps/web/src/features/go-force/game-actions.ts` to check `view.session.wheel_fallback_enabled`, bypass `spinWheelOfNames` when `true`, call `go_force_draw_fallback_selection`, broadcast `publishGoForceSessionUpdate`, and return `{ selectionId, gameId, title, fallbackUsed: true, fallbackReason: "manual" }`
- [X] T014 [P] [US1] Add the `"Use pre-randomized fallback instead of Wheel of Names"` checkbox to Go Force settings in `apps/web/src/components/go-force/admin-controls.tsx`
- [X] T015 [US1] Add the pre-game (`ready`) and mid-game (`live`) fallback mode toggle form and mode-aware `DrawForm` button label/notice to `apps/web/src/components/go-force/facilitator-session.tsx`

**Checkpoint**: User Story 1 is complete and independently testable — facilitators can toggle fallback mode before or during a game and run draws without Wheel of Names.

---

## Phase 4: User Story 2 - Automatic fallback when Wheel of Names is unreachable (Priority: P1)

**Goal**: Automatically fall back to the pre-randomized remaining list when Wheel of Names is unreachable during a draw attempt so live sessions never stall.

**Independent Test**: Keep fallback mode disabled, simulate Wheel of Names throwing a network/timeout/HTTP `WheelOfNamesError` during `drawGoForceSelection`, and verify a remaining game is drawn from `fallback_queue`, committed, broadcast to players, and flagged with an unreachable-fallback notice.

### Implementation for User Story 2

- [X] T016 [US2] Update `drawGoForceSelection` in `apps/web/src/features/go-force/game-actions.ts` to catch unreachable/provider `WheelOfNamesError`s (excluding empty-list errors), log via `reportFailure`, invoke `go_force_draw_fallback_selection`, broadcast `publishGoForceSessionUpdate`, and return `{ selectionId, gameId, title, fallbackUsed: true, fallbackReason: "unreachable" }`
- [X] T017 [US2] Display a clear informational `Message` banner in `apps/web/src/components/go-force/facilitator-session.tsx` when `fallbackUsed` is `true` and `fallbackReason === "unreachable"`, indicating Wheel of Names was unreachable and voting is open for the drawn game

**Checkpoint**: User Story 2 is complete and independently testable — Wheel of Names outages automatically fall back without blocking the round.

---

## Phase 5: User Story 3 - Draw games sequentially from a pre-randomized remaining list (Priority: P2)

**Goal**: Ensure consecutive fallback draws pop one game at a time from the pre-randomized queue, never expose upcoming queue order, prevent draws while a ballot is open, and respect round-ending rules when the queue is empty.

**Independent Test**: Run consecutive fallback draws until all remaining games in a round are exhausted, verifying zero repeats, no exposed queue order in client state, open-ballot draw blocking, and normal round completion.

### Implementation for User Story 3

- [X] T018 [US3] Verify and handle `NO_REMAINING_GAMES` and `OPEN_BALLOT` error mapping in `apps/web/src/features/go-force/action-failures.ts` and `apps/web/src/features/go-force/game-actions.ts` when `go_force_draw_fallback_selection` is invoked
- [X] T019 [US3] Ensure `DrawForm` in `apps/web/src/components/go-force/facilitator-session.tsx` handles immediate `selectionId` return from fallback draws cleanly without triggering duplicate `commitGoForceSelection` calls

**Checkpoint**: All user stories (US1, US2, US3) are complete and independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Automated database, unit, and E2E tests plus full typecheck/lint verification.

- [X] T020 [P] Write pgTAP tests in `supabase/tests/database/go-force-wheel-fallback.test.sql` covering `go_force_set_wheel_fallback`, lazy shuffle, sequential pop without repeats, mid-round Wheel-to-fallback sync, open-ballot guard, and unauthorized access
- [X] T021 [P] Write Vitest unit tests in `apps/web/tests/unit/go-force-wheel-fallback.test.ts` covering `setGoForceWheelFallback`, `drawGoForceSelection` in manual fallback mode, and automatic fallback on `WheelOfNamesError`
- [X] T022 [P] Write Playwright E2E test in `apps/web/tests/e2e/go-force-wheel-fallback.spec.ts` covering pre-game/mid-game settings toggle and unreachable Wheel of Names fallback draw
- [ ] T023 Run `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:database`, and `npm run test:e2e` in `apps/web` per `quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**.
- **User Story 1 (Phase 3)**: Depends on Phase 2.
- **User Story 2 (Phase 4)**: Depends on Phase 2 (and builds on `drawGoForceSelection` / `DrawForm` from US1 if done sequentially, or merges cleanly after T013/T015).
- **User Story 3 (Phase 5)**: Depends on Phase 2 and US1/US2 draw flow.
- **Polish (Phase 6)**: Depends on Phases 3–5.

### Parallel Opportunities

- **Phase 2**: `T007`, `T008`, `T009` can run in parallel with `T003`–`T006`.
- **Phase 3 (US1)**: `T010` and `T014` can run in parallel; `T011` and `T012` can run in parallel after `T010`.
- **Phase 6**: `T020`, `T021`, `T022` can all be written in parallel before running `T023`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational).
2. Complete Phase 3 (User Story 1 — Settings toggle + manual fallback draw).
3. **STOP and VALIDATE**: Verify pre-game and mid-game toggling and fallback draws work end-to-end.

### Incremental Delivery

1. Setup + Foundational → Database & types ready.
2. User Story 1 → Manual fallback toggle & draw (MVP).
3. User Story 2 → Automatic fallback on Wheel of Names unreachable error.
4. User Story 3 → Edge-case hardening for sequential exhaustion & open-ballot guards.
5. Polish → Full pgTAP, Vitest, Playwright, typecheck, and lint verification.
