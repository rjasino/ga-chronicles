# Implementation Plan: Eligible Games JSON Upload

**Branch**: `feature/codex` | **Date**: 2026-11-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-eligible-games-upload/spec.md`

## Summary

Let an authorized admin add an annual eligible-game list from a JSON file. Reuse the existing Go Force admin experience, server authorization, annual-game validation rules, and database uniqueness protection. Parse and validate the whole file, show a review and duplicate summary, then submit the original JSON text after confirmation so the server can enforce file limits and revalidate before one atomic write. Preserve the manual single-game form and started-session snapshots.

## Technical Context

**Language/Version**: TypeScript 5.9; Node.js >=24 and <25.

**Primary Dependencies**: Next.js 16.4, React 19, Supabase JS 2.57, Zod 4; no new dependency is required.

**Storage**: Supabase Postgres; existing `go_force_annual_games` table and case-insensitive unique index on `(goty_year, lower(trim(title)))`.

**Testing**: Vitest for schemas, import rules, actions, and UI; Playwright for the admin import flow; pgTAP for database uniqueness and write behavior.

**Target Platform**: Responsive admin experience in the existing Ako Chronicles web application.

**Project Type**: Monorepo web application (`apps/web`) with a Supabase database project at the repository root.

**Performance Goals**: Meet the spec outcome of importing 50 valid entries in under 2 minutes, excluding file preparation; keep preview interaction responsive for that list size.

**Constraints**: Admin-only write access; one GOTY year per file; additive import; no overwrite or delete behavior; preserve the existing single-entry form; validate every entry before enabling confirmation; submit and revalidate the original JSON text on the server; avoid partial writes; started sessions retain their snapshots. Bound file size and entry count to keep parsing, preview, and server-action requests responsive.

**Scale/Scope**: One annual-game JSON file per import, with a typical batch of at least 50 entries; no public import interface and no new service or database entity is required.

## Constitution Check

| Principle | Status | Plan evidence |
|-----------|--------|---------------|
| I. Code Quality | PASS | Extend the existing admin component/action/schema boundaries and use project conventions; review remains required before merge. |
| II. Testing Standards | PASS | Add focused schema/rule and action/UI tests plus an end-to-end admin journey; preserve relevant database constraint coverage. |
| III. User Experience Consistency | PASS WITH VALIDATION | Reuse the Go Force admin layout and form controls; verify keyboard-accessible file selection, review feedback, and responsive layout. |
| IV. Security | PASS WITH CONTROLS | Keep import writes server-side, repeat validation on the server, and reuse verified-session and Go Force admin authorization checks. |
| V. Performance Requirements | PASS WITH VALIDATION | Set bounded input size/count and confirm a 50-entry file can be reviewed and saved within the spec's time goal. |

No constitutional violations are identified. Accessibility and the 50-entry import target are release validation checks.

## Project Structure

### Documentation (this feature)

```text
specs/011-eligible-games-upload/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── go-force-admin-import.md
└── tasks.md                 # Created by /speckit.tasks, not this command
```

### Source Code (repository root)

```text
apps/web/src/
├── components/go-force/     # Add import selection, preview, and result UI beside annual games
├── features/go-force/       # Add import schema/rules and authorized server action
└── app/admin/go-force/      # Existing admin route and action revalidation target

apps/web/tests/
├── unit/go-force/           # Import validation, action, and component coverage
└── e2e/                     # Admin import workflow coverage

supabase/
└── tests/database/          # Existing annual-game uniqueness/RLS coverage; no schema change expected
```

**Structure Decision**: Extend the existing Go Force feature in `apps/web` and write directly to the established annual-game table through the authenticated server-side Supabase client. No new deployable project, public endpoint, or database migration is expected.

## Complexity Tracking

None. The design reuses the existing application, authorization checks, validation dependency, and annual-game storage.

## Phase 0: Research

See [research.md](./research.md). Research confirms the field constraints, admin authorization and persistence pattern, unique-title rule, and session snapshot behavior already exist in the repository.

## Phase 1: Design & Contracts

- [data-model.md](./data-model.md) describes the existing annual-game entity and the file/review lifecycle without adding persisted entities.
- [contracts/go-force-admin-import.md](./contracts/go-force-admin-import.md) defines the JSON shape and admin-facing select, review, confirm, and error behavior. No external API is introduced.
- [quickstart.md](./quickstart.md) gives local validation steps for valid imports, validation failures, duplicates, cancellation, authorization, and session snapshot preservation.

## Constitution Check (Post-Design)

| Principle | Status | Design evidence |
|-----------|--------|-----------------|
| I. Code Quality | PASS | The design is limited to existing feature boundaries and established form/action/schema patterns. |
| II. Testing Standards | PASS | The validation guide covers unit, action/component, database, and browser-level verification. |
| III. User Experience Consistency | PASS WITH VALIDATION | The interface follows the existing admin experience; keyboard and responsive review checks are specified. |
| IV. Security | PASS WITH CONTROLS | The browser preview is informational; the authorized server action validates all submitted data again before writing. |
| V. Performance Requirements | PASS WITH VALIDATION | File and record-count bounds protect responsiveness; validate a 50-record import against the spec outcome. |

No constitutional violations are identified. The design introduces no new data retention or access surface.
