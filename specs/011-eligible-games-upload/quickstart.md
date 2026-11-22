# Eligible Games JSON Upload: Validation Guide

## Prerequisites

- Node.js 24.x.
- Dependencies installed for `apps/web`.
- Local Supabase services and environment values configured as described in `apps/web/.env.example`.
- A test admin account with permission to manage Go Force.

## Local Setup

From the repository root, start the local database and web app using the existing project commands:

```powershell
npm --prefix apps/web run supabase:start
npm --prefix apps/web run supabase:reset
npm --prefix apps/web run dev
```

The import format and field constraints are described in [the admin import contract](./contracts/go-force-admin-import.md).

## Automated Validation

Run from the repository root after implementation:

```powershell
npm --prefix apps/web run test:unit
npm --prefix apps/web run test:database
npm --prefix apps/web run test:e2e
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
```

Expected coverage includes file shape and size limits, field validation and defaults, duplicate detection, server authorization, atomic persistence/error handling, list refresh, manual entry continuity, and session snapshot isolation.

## Admin Scenarios

1. **Valid file**: Import a JSON array of at least 50 valid records for one GOTY year. Review the year and values, confirm, and verify all non-duplicate records appear with a success count. Complete selection, review, and saving in under 2 minutes, excluding file preparation.
2. **Defaults and metadata**: Omit eligibility, display order, and optional fields in some records. Confirm the review shows eligible state, sequential display order, and blank optional metadata.
3. **Malformed input**: Try malformed JSON, an object instead of an array, an empty array, and an empty file. Confirm each has an actionable message and changes no annual entries.
4. **Invalid record**: Use a missing title, mixed GOTY years, invalid eligibility, out-of-range display order, or malformed cover-art URL. Confirm the affected record is identified and the whole import remains uncommitted.
5. **Duplicates**: Include repeated titles with different case/whitespace, and a title already in the selected year's annual list. Confirm each duplicate is reported, existing metadata is preserved, and no duplicate entry is created.
6. **Cancel and persistence error**: Cancel from the review and separately simulate a failed batch write. Confirm neither case leaves a partial set of annual entries.
7. **Authorization**: Attempt the import without an authorized admin session. Confirm no annual-game row is written.
8. **Session snapshot**: Start a session, then import another annual game for that year. Confirm the annual list updates while the active session's game snapshot remains unchanged.
9. **Manual fallback and accessibility**: Add one game with the existing form after using the import; verify keyboard access, clear feedback, and usable review layout at narrow and wide viewport sizes.

## Validation Record

Validated on 2026-11-22 against the local Supabase services and the running Next.js dev server.

| Command | Result |
|---------|--------|
| `npm --prefix apps/web run test:unit` | PASS — 40 files, 254 tests |
| `npm --prefix apps/web run typecheck` | PASS |
| `npm --prefix apps/web run lint` | PASS |
| `npm --prefix apps/web run test:database` | 127/129 pass; see local-state note below |
| Targeted Playwright import and accessibility scenarios | PASS |

Notes:

- **Database baseline**: the two failing pgTAP assertions in `go-force-voting-timers.test.sql` expect the default 10/10 timers but the local settings row currently holds 30/60. Run `supabase db reset` before collecting a clean database result; this is unrelated to the import feature.
- **Reusing a dev server**: when port 3000 is already serving the app, set `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000` before `npx playwright test` so Playwright does not try to start a second server.
- **50-record target**: a 50-record import measured from file selection through the success message completed in **1.85 seconds**, well under the 2-minute goal.

