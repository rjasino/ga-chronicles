---
description: "Task list for the People & Roles List Enhancements feature"
---

# Tasks: People & Roles List Enhancements

**Input**: Design documents from `specs/005-people-roles-list-enhancement/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/people-list-contract.md, quickstart.md

**Tests**: Included. The project constitution (Principle II) requires automated verification, and `plan.md` commits to unit tests for the view-state module plus Playwright e2e for search/filter/sort/pagination/email behavior and updated account-management flows.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Every task includes an exact file path

## Path Conventions

- Web app: repository root is `apps/web/`, source under `apps/web/src/`, tests under `apps/web/tests/`
- Page being enhanced: `apps/web/src/app/admin/users/page.tsx`
- Shared data access: `apps/web/src/features/admin/account-actions.ts`
- New pure view-state module: `apps/web/src/features/admin/people-view.ts`
- New admin components: `apps/web/src/components/admin/`
- Shared styles: `apps/web/src/app/globals.css`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm a known-good baseline and the environment the plan depends on. No dependency or database changes are required — this feature reads existing tables only.

- [X] T001 Verify environment and baseline per `specs/005-people-roles-list-enhancement/quickstart.md` prerequisites: local Supabase running (or reachable via `apps/web/.env.local`), an admin account available (e.g. `localadmin` / `local-admin-password` as used by `apps/web/tests/e2e/admin-accounts.spec.ts`), and enough seeded people (recommended 25+, including some with no role grants and one without a stored email); run `npm --prefix apps/web run lint`, `npm --prefix apps/web run typecheck`, `npm --prefix apps/web run test:unit`, and `npm --prefix apps/web run test:e2e` and record the baseline results so later regressions are detectable.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The view-state module and the extended data accessor that every user story builds on. All four stories depend on these.

**⚠️ CRITICAL**: No user story can begin until this phase is complete.

- [X] T002 [P] Write failing unit tests for the view-state module in `apps/web/tests/unit/admin/people-view.test.ts` covering the exact allowed values from `data-model.md`: `q` (trimmed text, capped at 100 characters, default empty), `role` (`any|reader|contributor|moderator|admin`, default `any`; `reader` means zero role grants), `status` (`any|active|disabled`, default `any`), `sort` (`username|email|status|role|created`, default `username`), `dir` (`asc|desc`, default `asc`), `page` (positive integer, page size fixed at **20**, default 1); invalid/missing values fall back to defaults; role ordering follows the fixed hierarchy `admin > moderator > contributor > reader` with the username as tie-breaker; an out-of-range `page` clamps to a valid page.
- [X] T003 [P] Implement the view-state module in `apps/web/src/features/admin/people-view.ts` to make T002 pass: export types for the view (`{ q, role, status, sort, dir, page }`), a `parseView(searchParams)` function that validates every incoming query value against the allowed values above (invalid/missing → defaults, `q` trimmed and capped at 100 chars, `page` clamped to a valid positive integer), and a `roleRank(roles)` helper using the fixed hierarchy `admin > moderator > contributor > reader` (accounts with no grants rank as `reader`), plus the `PAGE_SIZE = 20` constant.
- [X] T004 Extend `listManagedAccounts` in `apps/web/src/features/admin/account-actions.ts` (currently `"use client"`-adjacent server action returning a bare array) to accept a validated `PeopleView` from `people-view.ts` and return `{ rows, total }`: include `account_auth_lookup(email)` and `accounts.created_at` in the select alongside the existing `id, username, status, account_roles(role)`; apply the search filter (case-insensitive partial match on username **or** email using the trimmed, capped `q`), the role filter (`reader` = accounts with zero `account_roles` grants; each explicit role = accounts holding that grant), and the status filter; apply deterministic sorting (role sorts by the account's highest-ranking grant per `roleRank` then username; email sorts put accounts with no email last regardless of direction; all other sorts use the attribute then username as a stable tie-breaker); paginate with LIMIT `PAGE_SIZE` (20) and OFFSET `(page-1) * PAGE_SIZE`; run a matching total-count query so `total` is exact.

**Checkpoint**: The view-state module is unit-green and the data accessor returns filtered, sorted, paged rows with email and an exact total. All user stories can begin.

---

## Phase 3: User Story 1 - Admin filters the People & roles list to find people quickly (Priority: P1) 🎯 MVP

**Goal**: The admin narrows the list with a text search on username/email plus role and status filters; filters combine; unmatched criteria show a clear empty state; changing a filter returns to page 1.

**Independent Test**: On `/admin/users`, apply a role filter, a status filter, and a partial username/email search (mixed case) and confirm the visible rows are exactly the matching subset with the total updated; an unmatched search shows the "no people match" message with a clear-filters path.

### Tests for User Story 1

> Write these first and confirm they fail before implementing.

- [X] T005 [P] [US1] Create `apps/web/tests/e2e/people-list-filter.spec.ts` asserting: the default view lists all people; a partial username or email search (mixed case) narrows the rows; selecting role "Moderator" shows only moderators; combining a role filter with status "Disabled" shows the intersection; an unmatched search shows the "no people match" message and a clear-filters link back to `/admin/users`; applying any filter returns the view to page 1.

### Implementation for User Story 1

- [X] T006 [P] [US1] Create `apps/web/src/components/admin/people-filters.tsx` (server component): a `GET` form that submits `q`, `role`, and `status` to the same route, with a labeled search `<input name="q">`, a labeled role `<select name="role">` with the exact options `any|reader|contributor|moderator|admin`, and a labeled status `<select name="status">` with the exact options `any|active|disabled`; accept an `initial: PeopleView` prop so the current values render as defaults and remain in the page address.
- [X] T007 [US1] Integrate into `apps/web/src/app/admin/users/page.tsx`: await `searchParams`, parse with `parseView`, call `listManagedAccounts(view)` and consume the new `{ rows, total }` shape (keep the existing `.admin-list` row rendering of username + status for now); render `<PeopleFilters initial={view} />` above the list; when `total === 0`, render the "no people match" empty state with a "clear filters" link to `/admin/users` (per `contracts/people-list-contract.md` "Empty and absence states").

**Checkpoint**: User Story 1 is independently functional and testable — an admin can find people by search, role, and status.

---

## Phase 4: User Story 2 - Admin identifies each person from the details on their row (Priority: P1)

**Goal**: Every row shows username, email (or "no email on file"), status, and current roles (implicit reader for no-grant people), with the existing role-assignment controls unchanged.

**Independent Test**: On `/admin/users`, confirm each row shows username, email or the "no email on file" indicator, status, roles, and the role-assignment checkboxes; role assignment still updates a row as before.

### Tests for User Story 2

> Write these first and confirm they fail before implementing.

- [X] T008 [P] [US2] Create `apps/web/tests/e2e/people-list-rows.spec.ts` asserting: every row shows the username, email, status, and current roles; a person with no stored email shows the "no email on file" indicator (never a blank cell); a person with no grants is shown with the reader role; the per-row role-assignment checkboxes render and saving roles updates the row.
- [X] T009 [P] [US2] Update `apps/web/tests/e2e/admin-accounts.spec.ts` so the existing provisioning and role-assignment flows keep passing against the new row markup (e.g. email visible on rows; keep or adapt the `.admin-list li` locators used to filter rows).

### Implementation for User Story 2

- [X] T010 [P] [US2] Create `apps/web/src/components/admin/people-list.tsx` (server component): render the `rows` (each with `id, username, status, email, account_roles(role)`) inside the existing `.admin-list` container with one `li` per person showing the username, the email or the "no email on file" indicator, the status, the current roles (implicit **reader** when there are no grants, per `data-model.md`), and the existing `<RoleAssignmentForm accountId={id} initialRoles={...} />` unchanged.
- [X] T011 [US2] Replace the inline list markup in `apps/web/src/app/admin/users/page.tsx` with `<PeopleList rows={rows} />`, passing the rows returned by `listManagedAccounts`.

**Checkpoint**: User Story 2 is independently testable — every person is identifiable from their row.

---

## Phase 5: User Story 3 - Admin pages through the list as it grows (Priority: P1)

**Goal**: With more than 20 matching people, the admin moves through pages with accurate totals, page numbers, and next/previous controls; no people are skipped or repeated; invalid or out-of-range pages resolve to a valid page.

**Independent Test**: With 25+ matching people, confirm 20 rows per page, accurate "showing X–Y of Z", page-number and next/previous navigation, and that walking every page visits each person exactly once; a URL with `page=999` or `page=abc` lands on a valid page.

### Tests for User Story 3

> Write these first and confirm they fail before implementing.

- [X] T012 [P] [US3] Create `apps/web/tests/e2e/people-list-pagination.spec.ts` asserting: with 25+ matching people, exactly 20 rows render per page; page-number and next/previous navigation work; the "showing X–Y of Z" totals are accurate and consistent with the reported total; walking all pages shows no person skipped or repeated; a URL with `page=999` or `page=abc` resolves to a valid page rather than a blank list; changing a filter returns to page 1.

### Implementation for User Story 3

- [X] T013 [P] [US3] Create `apps/web/src/components/admin/pagination.tsx` (server component): accept `page`, `total`, and a `PAGE_SIZE` (20) and render `<Link>`-based page-number controls plus previous/next and a "showing X–Y of Z" summary that preserve every other query parameter; hide or disable the controls when `total <= PAGE_SIZE` (per `contracts/people-list-contract.md` "Pagination").
- [X] T014 [US3] Render `<Pagination page={view.page} total={total} />` below `<PeopleList />` in `apps/web/src/app/admin/users/page.tsx`.

**Checkpoint**: User Story 3 is independently testable — a growing list stays fast, correct, and navigable.

---

## Phase 6: User Story 4 - Admin sorts the list to organize people the way they need (Priority: P2)

**Goal**: The admin reorders the list by username, email, status, role, or account creation date, ascending or descending; the default remains username ascending; role ordering is deterministic for multi-role people.

**Independent Test**: On `/admin/users`, choose a sort attribute and direction and confirm the visible order changes accordingly, stays stable across page turns for role sorting, and places accounts without email last on email sorts.

### Tests for User Story 4

> Write these first and confirm they fail before implementing.

- [X] T015 [P] [US4] Create `apps/web/tests/e2e/people-list-sort.spec.ts` asserting: the default view is username ascending; sorting by email puts accounts with no email last regardless of direction; sorting by role follows the fixed hierarchy `admin > moderator > contributor > reader` and stays stable across page turns; sorting by creation date flips oldest/newest-first; the direction control toggles ascending/descending.

### Implementation for User Story 4

- [X] T016 [P] [US4] Create `apps/web/src/components/admin/people-sort.tsx` (server component): a labeled sort `<select name="sort">` with the exact options `username|email|status|role|created` and a direction control for `asc|desc`, submitted together with the existing `q`/`role`/`status` params; accept an `initial: PeopleView` prop so current values render as defaults.
- [X] T017 [US4] Render `<PeopleSort initial={view} />` on `apps/web/src/app/admin/users/page.tsx` next to the filters bar.

**Checkpoint**: All user stories are independently functional — an admin can find, identify, navigate, and organize the list.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate release readiness across stories and the project constitution gates.

- [X] T018 [P] Add styles for the filter bar, sort control, row details (email/status/roles), pagination, and the empty state to `apps/web/src/app/globals.css` using the existing admin/token classes (single-writer task; apply after T006/T010/T013/T016 so it serializes the shared stylesheet edits).
- [X] T019 [P] Accessibility pass on `/admin/users`: confirm every search/filter/sort control is a labeled native control, pagination is keyboard-reachable with a visible focus indicator, and result totals are announced to assistive technology (live region or equivalent); extend `apps/web/tests/e2e/accessibility.spec.ts` with axe WCAG 2.1 AA checks on `/admin/users` and run `npm --prefix apps/web run test:a11y` — zero violations.
- [X] T020 Run the full validation from `specs/005-people-roles-list-enhancement/quickstart.md`: `npm --prefix apps/web run lint`, `typecheck`, `test:unit`, `test:e2e` (including the updated `admin-accounts.spec.ts` and the new people-list specs), and `npm --prefix apps/web run build`; confirm all 13 quickstart scenarios pass, including persistence (filter/sort/page survive reload and a shared link) and "role update keeps the admin in the same filtered view".
- [X] T021 [P] Record the verified commands and results in `specs/005-people-roles-list-enhancement/quickstart.md` (add a "Verified implementation results" table with the validation date and outcomes, consistent with previous features).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately.
- **Foundational (Phase 2)**: Depends on Setup — **blocks ALL user stories** (every story consumes `people-view.ts` and the extended `listManagedAccounts`).
- **US1 (Phase 3)**: Depends on Foundational.
- **US2 (Phase 4)**: Depends on Foundational (rows must include email and the new `{ rows, total }` shape); no dependency on US1.
- **US3 (Phase 5)**: Depends on Foundational (the total/limit/offset come from the data accessor); no dependency on US1/US2.
- **US4 (Phase 6)**: Depends on Foundational (deterministic query ordering); no dependency on US1–US3.
- **Polish (Phase 7)**: Depends on all selected stories being complete.

### User Story Dependencies

- **US1 (P1)**: After Foundational; no dependency on other stories. **MVP.**
- **US2 (P1)**: After Foundational; independent of US1.
- **US3 (P1)**: After Foundational; independent of US1/US2.
- **US4 (P2)**: After Foundational; independent of US1–US3.

### Within Each User Story

- Tests are written and fail before implementation.
- The pure view-state module (`people-view.ts`) before the data accessor, the data accessor before the UI.
- Component-creation tasks and test-file tasks (marked [P]) can run in parallel.
- The four page-integration tasks (T007, T011, T014, T017) all edit `apps/web/src/app/admin/users/page.tsx` and MUST be applied sequentially in ID order.

### Parallel Opportunities

- **Setup**: single task.
- **Foundational**: T002 (unit tests) and T003 (view-state module) are separate files; T004 (data accessor) depends on T003.
- **US1**: T005 (e2e spec) and T006 (component) are different files; T007 (`page.tsx`) is sequential.
- **US2**: T008, T009 (specs) and T010 (component) are three different files; T011 (`page.tsx`) is sequential.
- **US3**: T012 (e2e spec) and T013 (component) are different files; T014 (`page.tsx`) is sequential.
- **US4**: T015 (e2e spec) and T016 (component) are different files; T017 (`page.tsx`) is sequential.
- **Polish**: T018 (`globals.css`) and T019 (`accessibility.spec.ts`) are independent; T020/T021 run after the code is complete.
- **Across stories**: component and test-file tasks for US1–US4 can be worked on in parallel by different team members; the shared `page.tsx` integrations (T007 → T011 → T014 → T017) and `globals.css` edits must remain serialized.

---

## Parallel Example: User Story 1

```bash
# Tests first (separate file):
Task: "Create apps/web/tests/e2e/people-list-filter.spec.ts"

# Implementation that can run alongside (different file):
Task: "Create apps/web/src/components/admin/people-filters.tsx"

# Then integrate (shared file, sequential across stories):
Task: "Integrate filters + empty state into apps/web/src/app/admin/users/page.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "Create apps/web/tests/e2e/people-list-rows.spec.ts"
Task: "Update apps/web/tests/e2e/admin-accounts.spec.ts"
Task: "Create apps/web/src/components/admin/people-list.tsx"
# then (shared file):
Task: "Replace inline list markup in apps/web/src/app/admin/users/page.tsx with <PeopleList />"
```

## Parallel Example: User Story 3

```bash
Task: "Create apps/web/tests/e2e/people-list-pagination.spec.ts"
Task: "Create apps/web/src/components/admin/pagination.tsx"
# then (shared file):
Task: "Render <Pagination /> in apps/web/src/app/admin/users/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1 (filters, search, empty state).
4. **STOP and VALIDATE**: Confirm search/role/status filtering works independently, then deploy/demo if ready.
5. Note: User Story 2 (email on rows) is a low-cost add-on that materially strengthens the MVP, since identifying each person was an explicit request.

### Incremental Delivery

1. Setup + Foundational → view-state module and the extended data accessor (filter/sort/page/email/total) ready.
2. Add US1 → validate filtering independently → demo (MVP).
3. Add US2 → validate row details (email, status, roles) independently.
4. Add US3 → validate pagination and totals as the list grows.
5. Add US4 → validate sorting and deterministic role ordering.
6. Polish: styles, accessibility/axe, full suites + build, quickstart validation, and recorded results.

### Notes

- `[P]` is limited to tasks in different files with no incomplete dependency.
- Shared-file edits (`page.tsx` integrations T007/T011/T014/T017, `globals.css` T018) are serialized to avoid conflicts.
- No schema, migration, policy, or dependency change is required; the feature reads existing tables (`accounts`, `account_roles`, `account_auth_lookup`) and confines changes to `apps/web` source, tests, and one stylesheet.
- Email and username are resolved server-side only; every incoming query value is validated against the allowed values in `data-model.md` (role `any|reader|contributor|moderator|admin`, status `any|active|disabled`, sort `username|email|status|role|created`, dir `asc|desc`, page positive integer, page size fixed at 20).
- The page stays admin-only (`requireAnyRole(["admin"])`); the existing role-assignment and account-creation flows are unchanged.