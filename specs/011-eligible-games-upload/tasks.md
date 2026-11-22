---
description: "Task list for the eligible games JSON upload feature"
---

# Tasks: Eligible Games JSON Upload

**Input**: Design documents from `specs/011-eligible-games-upload/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/go-force-admin-import.md`, and `quickstart.md`

**Tests**: Included to meet the project constitution's unit and integration testing standards.

**Organization**: Tasks are grouped by user story so each increment can be implemented and reviewed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other marked tasks because they modify different files and have no incomplete-task dependency.
- **[Story]**: Maps a task to the user story in `spec.md`.
- Every task names the implementation or test file it changes.

## Path Conventions

- Web application: `apps/web/src/` and `apps/web/tests/`.
- Database tests: `supabase/tests/database/`.

## Phase 1: Setup

**Purpose**: Project initialization.

The web app, Go Force feature folders, Supabase test setup, and feature specification directory already exist. No project setup changes are needed.

---

## Phase 2: Foundational

**Purpose**: Shared prerequisites that block user-story work.

Existing admin authorization, annual-game persistence, validation library, and test infrastructure are sufficient. No shared infrastructure or database migration is required before either story begins.

---

## Phase 3: User Story 1 - Seed an annual list from JSON (Priority: P1) 🎯 MVP

**Goal**: Let an authorized admin select a valid one-year JSON file, review its records, and add them to the annual list in one confirmed batch while retaining manual entry.

**Independent Test**: As an authorized admin, import a valid file with multiple records, verify the preview and success count, then verify every accepted record appears with the supplied values or documented defaults and the existing manual form still adds one record.

### Tests for User Story 1

- [x] T001 [P] [US1] Add import-schema unit tests for a valid records array, supported metadata, eligibility default, and one-based display-order default in `apps/web/tests/unit/go-force/annual-game-import.test.ts`.
- [x] T002 [P] [US1] Add admin-controls component tests for selecting a JSON file, reviewing parsed entries before confirmation, showing the add count, and retaining the manual form in `apps/web/tests/unit/go-force/admin-controls.test.tsx`.
- [x] T003 [P] [US1] Add a server-action test for an authorized valid batch, one-write persistence, success counts, and admin/public route revalidation in `apps/web/tests/unit/go-force/annual-game-import-action.test.ts`.
- [x] T004 [P] [US1] Add an end-to-end admin scenario for importing a valid JSON file and then adding an individual game with the manual form in `apps/web/tests/e2e/go-force-admin.spec.ts`.

### Implementation for User Story 1

- [x] T005 [US1] Implement the import record schema and raw-JSON parser/normalizer in `apps/web/src/features/go-force/annual-game-import.ts`, using the canonical constraints in `data-model.md` for `Annual Game Entry.title`, `Annual Game Entry.gotyYear`, `Annual Game Entry.eligibilityState`, `Annual Game Entry.displayOrder`, `Annual Game Entry.developer`, `Annual Game Entry.publisher`, `Annual Game Entry.genre`, and `Annual Game Entry.coverArtUrl`; also implement defaults from `Game Import File.records` and `Game Import File.gotyYear` as defined in `data-model.md`.
- [x] T006 [US1] Add an authorized batch-import server action in `apps/web/src/features/go-force/admin-actions.ts` that verifies the Go Force admin role, reparses and revalidates the original submitted JSON text on the server, inserts the new annual-game rows in one statement, reports the added count, and refreshes the admin and public routes.
- [x] T007 [US1] Create the JSON file selection, raw-text parse state, review table, explicit confirmation that submits the original JSON text, and success/error feedback in `apps/web/src/components/go-force/annual-games-import.tsx`.
- [x] T008 [US1] Integrate the import component beside the annual-game list and existing manual add form in `apps/web/src/components/go-force/admin-controls.tsx`.

**Checkpoint**: An authorized admin can complete the valid-file import journey independently, and the manual single-game form remains usable.

---

## Phase 4: User Story 2 - Resolve invalid or duplicate entries safely (Priority: P2)

**Goal**: Explain invalid input before confirmation, identify duplicates, skip duplicates without overwriting annual entries, and prevent partial or unauthorized writes.

**Independent Test**: Try malformed JSON, invalid entries, mixed years, oversized input, duplicates in the file and annual list, cancellation, an unauthorized account, and a batch write failure; verify actionable findings and no unintended or partial change to the annual list.

### Tests for User Story 2

- [x] T009 [US2] Extend import unit tests for malformed roots, empty arrays, mixed years, invalid field values, 512 KiB file limit, 500-record limit, and duplicate titles within the file in `apps/web/tests/unit/go-force/annual-game-import.test.ts`.
- [x] T010 [P] [US2] Extend server-action tests for existing-title duplicates, unauthorized users, a concurrent uniqueness conflict, atomic failure, and added/skipped counts in `apps/web/tests/unit/go-force/annual-game-import-action.test.ts`.
- [x] T011 [P] [US2] Extend admin-controls tests for invalid-record findings, duplicate findings, disabled confirmation, file-limit messages, and cancellation without a save in `apps/web/tests/unit/go-force/admin-controls.test.tsx`.
- [x] T012 [P] [US2] Add end-to-end scenarios for rejected/cancelled imports, existing and in-file duplicates, unauthorized access, and preserving a started session's snapshot in `apps/web/tests/e2e/go-force-admin.spec.ts`.

### Implementation for User Story 2

- [x] T013 [US2] Return record-positioned validation findings and reject empty/mixed-year input in `apps/web/src/features/go-force/annual-game-import.ts`, enforcing `Game Import File.fileBytes`, `Game Import File.records`, and `Game Import File.gotyYear` constraints and review states `Import Review.invalidRecords` and `Import Review.addCount` defined in `data-model.md`.
- [x] T014 [US2] Detect case-insensitive trimmed title duplicates within the upload and selected GOTY year, skip existing rows without updates, preserve atomic batch insertion, and report race conflicts in `apps/web/src/features/go-force/admin-actions.ts`, following `Annual Game Entry.title`, `Game Import File.gotyYear`, `Import Review.duplicateRecords`, `Import Review.addCount`, and `Import Review.skipCount` in `data-model.md`.
- [x] T015 [US2] Show invalid record positions, duplicate titles, add/skip counts, and the 512 KiB/500-record limits while disabling confirmation for invalid input in `apps/web/src/components/go-force/annual-games-import.tsx`, implementing `Import Review.invalidRecords`, `Import Review.duplicateRecords`, `Import Review.addCount`, and `Import Review.skipCount` from `data-model.md`.

**Checkpoint**: Invalid or cancelled imports leave all annual entries unchanged; duplicates are reported and skipped; persistence failures never leave a partial batch.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Confirm the completed stories meet the project quality gates and validation guide.

- [x] T016 [P] Check keyboard access, screen-reader labels, and narrow/wide layouts for the import workflow in `apps/web/tests/unit/go-force/admin-controls.test.tsx` and `apps/web/tests/e2e/accessibility.spec.ts`.
- [x] T017 Run the local validation commands in `specs/011-eligible-games-upload/quickstart.md` and record any required setup or expected-result corrections in `specs/011-eligible-games-upload/quickstart.md`.
- [x] T018 Measure a 50-record import from file selection through confirmation and verify completion in under 2 minutes, recording the outcome in `specs/011-eligible-games-upload/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No changes are required; the project and feature structure already exist.
- **Foundational (Phase 2)**: No changes are required; existing authorization, storage, and test infrastructure are reused.
- **User Story 1 (Phase 3)**: Can begin immediately and is the MVP.
- **User Story 2 (Phase 4)**: Builds on the import UI and server action introduced by User Story 1.
- **Polish (Phase 5)**: Depends on both user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on another story.
- **User Story 2 (P2)**: Depends on the valid import surface from User Story 1; its malformed/duplicate behavior can be implemented and verified as a distinct increment.

### Within Each User Story

- Add tests before their corresponding implementation and verify the tests fail for the missing behavior.
- For User Story 1, T001–T004 are test-first tasks and can run in parallel because they target separate files; implementation tasks then proceed from schema to action/UI to integration.
- For User Story 2, T010–T012 can run in parallel because they target different files; T009 follows T001 because they share a file. Implementation tasks T013–T015 follow the related test tasks.
- Complete User Story 1 before beginning User Story 2 integration work.

### Parallel Opportunities

- **User Story 1**: T001–T004 modify separate test files and can start together. Then T005 defines the shared parser/schema contract; T006 and T007 can proceed in parallel once that contract is agreed, followed by integration in T008.
- **User Story 2**: T010, T011, and T012 can be prepared in parallel after the US1 baseline; T009 must follow T001 because they extend the same test file. T013 and T015 touch separate files and can proceed in parallel; T014 modifies the server-action file.
- **Polish**: T016 can run alongside documentation/performance validation after feature behavior is integrated.

---

## Parallel Example: User Story 1

```text
Task: T001 Add import-schema unit tests in apps/web/tests/unit/go-force/annual-game-import.test.ts
Task: T002 Add admin-controls review tests in apps/web/tests/unit/go-force/admin-controls.test.tsx
Task: T003 Add admin import action tests in apps/web/tests/unit/go-force/annual-game-import-action.test.ts
Task: T004 Add valid import and manual fallback e2e test in apps/web/tests/e2e/go-force-admin.spec.ts
```

## Parallel Example: User Story 2

```text
Task: T010 Add server-action duplicate/authorization tests in apps/web/tests/unit/go-force/annual-game-import-action.test.ts
Task: T011 Add invalid and duplicate review tests in apps/web/tests/unit/go-force/admin-controls.test.tsx
Task: T012 Add admin rejection and snapshot scenarios in apps/web/tests/e2e/go-force-admin.spec.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Implement and validate the valid JSON import, preview, confirmation, server authorization, one-statement persistence, and success feedback.
2. Keep the manual add form available and verify it still works.
3. Stop at the User Story 1 checkpoint for an independently demonstrable MVP.

### Incremental Delivery

1. Deliver User Story 1 to seed annual lists from valid JSON.
2. Add User Story 2 for actionable invalid-input and duplicate handling, bounded input, and safe cancellation/error behavior.
3. Complete accessibility, end-to-end, and 50-record performance validation.

## Notes

- `[P]` means the task uses different files and has no dependency on unfinished work.
- User-story labels map to the priorities and scenarios in `spec.md`.
- Field constraints are canonical in `data-model.md`; tasks cite the corresponding `Entity.field` rather than restating validation prose.
- Keep the import additive. Do not add a migration, replace an annual list, update existing rows, or rewrite a started session snapshot.
