# Bug Verification: Go Force round voting feedback and controls

- **Slug**: go-force-round-voting
- **Tested**: 2026-11-24
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The targeted Go Force tests, typecheck, and lint pass, including tests for the Round 3 quorum, player quotas, and historical summaries. The live Round 3/database behavior was not exercised because the Supabase database suite was not run, and the full unit suite still has three failures in unrelated tests.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Live Go Force Round 3 session | not-run | No live database session was started; the assessment's timer and final-ballot cases remain deferred. |
| New / updated tests | Targeted Go Force Vitest suite | pass | 9 test files, 46 tests passed. |
| Regression suite | `npm run test:unit` | partial | 314/317 passed; three failures are in unchanged test paths with stale mocks. |
| Lint / type-check | Targeted `npx eslint …`; `npm run typecheck` | pass | Both completed successfully. |
| Database migration tests | `npm run test:database` | skipped | Local Supabase was not started; database tests were not run. |

## Output Excerpts

```text
Targeted Go Force Vitest suite: Test Files 9 passed (9), Tests 46 passed (46)
TypeScript: tsc --noEmit — passed
Full unit suite: Test Files 2 failed | 54 passed; Tests 3 failed | 314 passed
```

The three full-suite failures were:

- Two `action-error-reporting.test.ts` cases: `supabase.from is not a function` in `submitGoForceFinalBallot`.
- One `session-actions.test.ts` case: its `next/cache` mock does not provide `refresh`.

## Residual Risks

- The migration and pgTAP tests for the configured quorum, manual timers, and aggregate summaries have not been executed against Supabase.
- The original Round 3 dropout scenario has not been reproduced against a database after migration `0016`.
- The reported timer behavior and final-ballot 80% threshold remain deferred pending a session that reaches those stages.
- The three full-suite mock failures remain unresolved.

## Recommendation

Hold for database verification. Apply migration `0016`, run the database tests in an authorized local Supabase environment, and reproduce a Round 3 session where fewer than all rostered players vote Go but the configured quorum does. Revisit the deferred timer and final-ballot behavior after those stages are reached.
