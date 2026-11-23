# Tasks: Developer Error Logging

**Input**: Design documents from `/specs/012-developer-error-logging/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/action-error-contract.md`, `quickstart.md`

**Tests**: Included because the specification success criteria and project constitution require automated unit and integration validation.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently after the shared diagnostic foundation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other marked tasks because they touch different files and have no unfinished dependencies.
- **[Story]**: User story from `spec.md` served by that task.
- Every task includes the target file path.

## Path Conventions

All application and test paths are relative to `apps/web/`; feature design documents are relative to `specs/012-developer-error-logging/`.

## Phase 1: Setup

**Purpose**: Confirm project initialization and test infrastructure.

No setup changes are needed: Node.js, TypeScript, Next.js, Vitest, and the unit/integration test directories already exist. No new dependency or persistent storage is planned.

---

## Phase 2: Foundational

**Purpose**: Provide and validate the shared reporter required by both user stories.

- [X] T001 Add unit tests for unknown error normalization, identifier generation, bounded/redacted fields, and console-write failure isolation in `apps/web/tests/unit/lib/error-logging.test.ts`.
- [X] T002 Implement the server-only reporting utility in `apps/web/src/lib/error-logging.ts`; enforce the canonical constraints for `Failure Diagnostic.errorId`, `Failure Diagnostic.operation`, `Failure Diagnostic.errorName`, `Failure Diagnostic.message`, `Failure Diagnostic.stack`, and `Failure Diagnostic.context` in `specs/012-developer-error-logging/data-model.md`.

**Checkpoint**: The shared reporter returns an identifier, emits only sanitized diagnostic data, and cannot throw a secondary reporting failure.

---

## Phase 3: User Story 1 - Diagnose an application failure (Priority: P1) — MVP

**Goal**: Unexpected server failures produce useful, sanitized developer console diagnostics without changing application outcomes.

**Independent Test**: Trigger representative uncaught and explicitly handled server failures. Verify console diagnostics identify the failure and safe operation context, omit secrets and raw request data, and do not alter behavior if console output fails.

### Tests for User Story 1

- [X] T003 [P] [US1] Add instrumentation tests for an uncaught server error, safe route context, and no request headers/query/body leakage in `apps/web/tests/integration/instrumentation-error-reporting.test.ts`.

### Implementation for User Story 1

- [X] T004 [US1] Add the Next.js `onRequestError` hook in `apps/web/src/instrumentation.ts`; report uncaught render, Route Handler, and Server Action errors through the shared reporter using only safe route and error-stage context.
- [X] T005 [P] [US1] Replace direct console error output in `apps/web/src/features/articles/body-image-refs.ts` with the shared reporter; preserve current best-effort cleanup and return behavior.
- [X] T006 [P] [US1] Replace raw response-body and ad hoc error output in `apps/web/src/features/go-force/realtime-broadcast.ts` with the shared reporter; retain only bounded safe status/operation context and preserve non-fatal broadcast behavior.
- [X] T007 [P] [US1] Route provider failure diagnostics through the shared reporter in `apps/web/src/features/go-force/wheel-of-names-client.ts`; preserve the existing provider correlation identifier and ensure response bodies and credentials are not logged.

**Checkpoint**: User Story 1 works without action-result changes, new persistence, or a monitoring dependency.

---

## Phase 4: User Story 2 - Understand a failed API request (Priority: P2)

**Goal**: Unexpected Server Action failures return a safe message and an identifier matching their console diagnostic; expected user-correctable results remain unchanged.

**Independent Test**: Trigger representative unexpected failures through each Server Action group. Verify the returned serializable result contains a safe `error` and matching `errorId`, the console contains that same identifier, and expected validation/authorization failures remain actionable and unreported as defects.

### Tests for User Story 2

- [X] T008 [P] [US2] Add result-contract unit tests for unexpected and expected Server Action errors in `apps/web/tests/unit/lib/action-error-contract.test.ts`.
- [X] T009 [P] [US2] Add integration coverage for matching action-result and console identifiers, safe public messages, expected validation outcomes, and logger failure isolation in `apps/web/tests/integration/action-error-reporting.test.ts`.

### Implementation for User Story 2

- [X] T010 [US2] Add a shared Server Action failure-result helper in `apps/web/src/lib/error-logging.ts`; satisfy the canonical rules for `Error Response.error` and `Error Response.errorId` in `specs/012-developer-error-logging/data-model.md` and keep both fields consistent with `specs/012-developer-error-logging/contracts/action-error-contract.md`.
- [X] T011 [P] [US2] Update unexpected provider/database failure branches and result types to use the shared safe failure-result helper in `apps/web/src/features/auth/actions.ts`, `apps/web/src/features/admin/account-actions.ts`, `apps/web/src/features/comments/actions.ts`, `apps/web/src/features/moderation/actions.ts`, and `apps/web/src/features/moderation/settings-actions.ts`; preserve expected validation and authorization messages and implement the canonical `Error Response.error` and `Error Response.errorId` fields from `specs/012-developer-error-logging/data-model.md`.
- [X] T012 [P] [US2] Update unexpected article mutation failure results to use the shared safe failure-result helper in `apps/web/src/features/articles/actions.ts`; preserve expected user-correctable results and implement the canonical `Error Response.error` and `Error Response.errorId` fields from `specs/012-developer-error-logging/data-model.md`.
- [X] T013 [P] [US2] Update unexpected Go Force action failure results to use the shared safe failure-result helper in `apps/web/src/features/go-force/admin-actions.ts`, `apps/web/src/features/go-force/game-actions.ts`, `apps/web/src/features/go-force/ballot-actions.ts`, and `apps/web/src/features/go-force/session-actions.ts`; preserve expected domain outcomes and implement the canonical `Error Response.error` and `Error Response.errorId` fields from `specs/012-developer-error-logging/data-model.md`.

**Checkpoint**: User Story 2 returns safe, correlatable results while expected action errors retain their existing user-facing behavior.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validate the integrated feature and preserve the no-persistence/no-monitoring scope.

- [X] T014 Run the quickstart scenarios and execute `npm run typecheck`, `npm run test:unit`, and `npm run build` using the scripts in `apps/web/package.json`; resolve failures and confirm no diagnostic file, database table, external reporter, or monitoring configuration was introduced.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No changes required; existing project tooling is reused.
- **Foundational (Phase 2)**: T001 precedes T002; both user stories depend on the completed shared reporter.
- **User Story 1 (Phase 3)**: Depends on Phase 2. T003 precedes T004; T005–T007 can proceed independently after T002.
- **User Story 2 (Phase 4)**: Depends on Phase 2, not on completion of User Story 1. T008 and T009 establish failing contract/integration coverage before T010; T011–T013 depend on T010 and can proceed in parallel.
- **Polish (Phase 5)**: T014 depends on both user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2; no dependency on User Story 2.
- **User Story 2 (P2)**: Starts after Phase 2; no dependency on User Story 1. Both stories use the shared reporter but otherwise update separate boundaries.

### Parallel Opportunities

- **User Story 1**: After T002, T003, T005, T006, and T007 work in separate test/source files; T004 follows T003.
- **User Story 2**: T008 and T009 can be authored in parallel. After T010, T011, T012, and T013 touch separate action-module groups and can proceed in parallel.
- **Cross-story**: After Phase 2, the two story phases can proceed in parallel if implementation is coordinated; their assigned source files do not overlap.

## Parallel Example: User Story 1

```text
After T002:
Task: T003 instrumentation coverage in apps/web/tests/integration/instrumentation-error-reporting.test.ts
Task: T005 article image cleanup reporting in apps/web/src/features/articles/body-image-refs.ts
Task: T006 Realtime reporting in apps/web/src/features/go-force/realtime-broadcast.ts
Task: T007 Wheel of Names reporting in apps/web/src/features/go-force/wheel-of-names-client.ts

Then complete T004 instrumentation implementation after T003.
```

## Parallel Example: User Story 2

```text
Before implementation:
Task: T008 action error contract tests in apps/web/tests/unit/lib/action-error-contract.test.ts
Task: T009 action reporting integration tests in apps/web/tests/integration/action-error-reporting.test.ts

After T010:
Task: T011 auth, account, comment, and moderation action integration
Task: T012 article action integration
Task: T013 Go Force action integration
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 2 to establish tested, failure-safe diagnostic reporting.
2. Complete Phase 3 to log uncaught server errors and migrate existing ad hoc server diagnostics.
3. Stop and validate the console output, privacy, and failure-isolation criteria independently.

### Incremental Delivery

1. Deliver User Story 1 as the console-diagnostics MVP.
2. Add User Story 2 to return correlated identifiers in unexpected Server Action failures.
3. Run the full quickstart validation after both stories are complete.

## Notes

- Tests are included because the spec success criteria and constitution require automated tests.
- Expected validation, authorization, and domain outcomes must not be converted into unexpected-error diagnostics.
- Keep Next.js control-flow exceptions such as redirects and not-found signals intact; avoid broad catches.
- The application does not persist diagnostic output, but hosting platforms may independently capture console output.
