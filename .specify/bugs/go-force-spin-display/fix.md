# Bug Fix: Hide Previous Result During Roulette Spin

- **Slug**: go-force-spin-display
- **Fixed**: 2026-11-22
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The facilitator now hides the last closed selection result from the moment a new roulette draw is submitted until its spin presentation completes. A browser regression assertion covers this state during the live session flow.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `apps/web/src/components/go-force/facilitator-session.tsx` | modified | Tracks draw presentation state, suppresses the previous `VoteBreakdown` while active, and restores it after spin completion or a failed draw. |
| `apps/web/tests/e2e/go-force-session.spec.ts` | modified | Asserts the selection result is hidden during the next draw. |

## Tests Added or Updated

- `tests/e2e/go-force-session.spec.ts` — checks that `Selection result` is hidden while the roulette is pending/spinning, including after a prior round selection was closed.

## Local Verification

- `npm run typecheck` → passed.
- `npx eslint src/components/go-force/facilitator-session.tsx tests/e2e/go-force-session.spec.ts` → passed.
- `npm run test:unit -- tests/unit/go-force/facilitator-selection-result.test.tsx` → passed (1 test).
- `npm run test:e2e -- tests/e2e/go-force-session.spec.ts` → not completed: the sandbox initially blocked process spawning (`EPERM`); the permitted retry could not start its servers because port 3000 is already in use. The test was not pointed at the existing server to avoid mutating its session data.
- `git diff --check` → passed.

## Deviations from Assessment

None. The selected-tab color concern was not changed: the active tab uses theme-aware foreground/background tokens, and the supplied screenshot does not show a tab state to reproduce the reported contrast issue.

## Follow-ups

- Rerun the Go Force session Playwright test when the configured local web port is free.
- If the selected tab remains unreadable on a particular screen, capture that tab in the affected theme to verify its rendered foreground and background colors.
