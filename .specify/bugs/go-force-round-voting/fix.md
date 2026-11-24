# Bug Fix: Go Force round voting feedback and controls

- **Slug**: go-force-round-voting
- **Fixed**: 2026-11-24
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Added historical round summaries and all-round Go quota displays for players, plus admin controls for timed/manual voting and a configurable Round 3 Go-voter quorum (default 2). Round 3 now advances when the configured number of distinct players has cast a Go; the final-ballot 80% threshold remains unchanged.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `apps/web/src/features/go-force/round-advancement-summary.ts` | modified | Keeps every completed round and the active round; accepts secure aggregate vote counts. |
| `apps/web/src/features/go-force/player-go-vote-quotas.ts` | added | Computes each player's usage and remaining quota for all three rounds, including future rounds. |
| `apps/web/src/features/go-force/session-queries.ts` | modified | Supplies player quotas, summaries, and the configured Round 3 quorum. |
| `apps/web/src/features/go-force/types.ts` | modified | Adds timer, quorum, quota, and player summary fields. |
| `apps/web/src/components/go-force/player-session.tsx` | modified | Displays round summaries and all-round quota/usage to players. |
| `apps/web/src/components/go-force/facilitator-session.tsx` | modified | Shows quorum progress and accurate incomplete-session messaging. |
| `apps/web/src/features/go-force/admin-schemas.ts` | modified | Validates timer modes and a 1–64 Round 3 Go-voter minimum. |
| `apps/web/src/features/go-force/admin-actions.ts` | modified | Saves timer modes and the quorum setting. |
| `apps/web/src/features/go-force/admin-queries.ts` | modified | Loads the added settings with defaults. |
| `apps/web/src/components/go-force/admin-controls.tsx` | modified | Adds independent round/final timer toggles and the quorum control. |
| `apps/web/src/features/go-force/rules.ts` | modified | Models Round 3 completion using a configured Go-voter quorum. |
| `supabase/migrations/0016_go-force-round-quorum-and-manual-timers.sql` | added | Adds settings, manual-mode deadline behavior, quorum enforcement, and a scoped aggregate-summary RPC. |
| `apps/web/tests/unit/go-force/` | added/modified | Covers summaries, player quotas, quorum configuration, UI, and session query behavior. |
| `supabase/tests/database/go-force-round-three-quorum.test.sql` | added | Covers default/configured quorum behavior and completion with the quorum. |
| `supabase/tests/database/go-force-voting-timers.test.sql` | modified | Covers defaults and manual versus timed deadlines and closing permissions. |
| `supabase/tests/database/go-force-live-player-voting.test.sql` | modified | Covers the aggregate summary RPC used by the player view. |

## Tests Added or Updated

- `tests/unit/go-force/round-advancement-summary.test.ts` — retains every completed round alongside the active round.
- `tests/unit/go-force/player-go-vote-quotas.test.ts` — verifies used and remaining quotas, including future rounds.
- `tests/unit/go-force/late-player-session.test.tsx` — verifies player quota and summary display.
- `tests/unit/go-force/session-queries.test.ts` — verifies aggregate summaries and per-round player quota data.
- `tests/unit/go-force/admin-schemas.test.ts` — validates manual mode and quorum bounds.
- `tests/unit/go-force/rules.test.ts` — verifies Round 3 quorum completion.
- `supabase/tests/database/go-force-round-three-quorum.test.sql` — tests quorum thresholds and preserves the existing final-ballot percentage rule.
- `supabase/tests/database/go-force-voting-timers.test.sql` — tests timer defaults and manual close behavior.

## Local Verification

- Commands run: `npm run typecheck` → passed.
- Commands run: targeted Go Force Vitest suite → 9 files, 46 tests passed.
- Commands run: targeted ESLint on changed TypeScript files → passed.
- Commands run: `git diff --check` → passed.
- Commands run: `npm run test:unit` → 314/317 tests passed. Three failures remain in unrelated tests whose mocks do not match current code: two `action-error-reporting` cases lack a Supabase `.from` mock, and `session-actions.test.ts` lacks a `next/cache.refresh` mock.
- Database tests were added but not run; the local Supabase database suite was not started.

## Deviations from Assessment

- Added the `go_force_closed_selection_summaries` RPC so player summaries can show aggregate counts without exposing peer vote rows hidden by row-level security.
- Changed the final-ballot Round 3 Go-completion check to use the same quorum, while leaving its 80% expected-vote check unchanged as requested.
- Did not add a Round 3 reason field. The existing optional remark belongs to the final ballot.
- Did not investigate the reported timer failure or change the 80% expected-vote threshold; both remain deferred pending reproduction.

## Follow-ups

- Run `npm run test:database` in an authorized local Supabase environment to validate migration `0016`.
- Re-test timer behavior and the final-ballot 80% calculation when the session reaches those stages.
- Update the stale mocks in the three unrelated failing unit tests.
- Run `/speckit.bug.test slug=go-force-round-voting` after database validation.
