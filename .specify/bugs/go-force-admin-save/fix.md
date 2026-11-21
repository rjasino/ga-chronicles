# Bug Fix: Go Force admin settings and game saves

- **Slug**: go-force-admin-save
- **Fixed**: 2026-11-21
- **Assessment**: ./assessment.md
- **Status**: partial

## Summary

Corrected migration 0012 to read the final-ballot duration from `go_force_page_settings`, which resolves the reported missing-column error. During verification, the first browser run showed that local checkbox state still reset after the Server Action, so the action now returns the persisted value and the checkbox remounts from that value. The migration has not been pushed to the target project.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `supabase/migrations/0012_go-force-voting-details.sql` | modified | Qualifies `settings.final_ballot_seconds` via `UPDATE ... FROM public.go_force_page_settings`, fixing SQLSTATE 42703. |
| `apps/web/src/components/go-force/admin-controls.tsx` | modified | Re-mounts the checkbox from the persisted `pageVisible` value returned by the action. |
| `apps/web/src/features/go-force/admin-actions.ts` | modified | Returns the saved visibility value, verifies settings updates returned a row, and logs server-side timer, game-row, and storage errors. |
| `apps/web/tests/e2e/go-force-admin.spec.ts` | modified | Covers visibility state after save/reload, timer persistence, and creating a game without cover art before adding URL/upload art. |
| `supabase/tests/database/go-force-voting-timers.test.sql` | modified | Exercises the migration-style final-ballot deadline backfill against the settings row. |

## Diff Highlights

```sql
update public.go_force_sessions as session_row
set final_ballot_deadline_at =
  clock_timestamp() + make_interval(secs => settings.final_ballot_seconds)
from public.go_force_page_settings as settings
where settings.id = true
  and session_row.status = 'final_ballot'
  and session_row.final_ballot_deadline_at is null;
```

## Tests Added or Updated

- `apps/web/tests/e2e/go-force-admin.spec.ts` — checks checkbox and timer values after saves/reloads; tests adding a game without cover art.
- `supabase/tests/database/go-force-voting-timers.test.sql` — checks the corrected settings-backed deadline backfill expression.

## Local Verification

- Commands run: `npm run typecheck` → pass.
- Commands run: `npm run test:unit` → pass, 193 tests across 29 files.
- Commands run: `npm run lint` → pass.
- Commands run: `npx supabase test db --local` → pass, 111 tests across 12 SQL files.
- Commands run: `npx playwright test tests/e2e/go-force-admin.spec.ts` → pass, 2 tests.
- Commands run: `git diff --check` → pass (only line-ending notices).
- Target-project migration push: not run. No Supabase project is linked in this workspace.

## Deviations from Assessment

The migration and UI/action changes pass local database and E2E tests. The migration has not been pushed to the target project, so the remote database fix remains unverified; status is **partial** until migration 0012 is applied successfully.

## Follow-ups

- Apply migration 0012 to the intended Supabase project, then verify timer saves, game creation without cover art, and cover upload.
- Run `/speckit.bug.test slug=go-force-admin-save` after the database is available.
