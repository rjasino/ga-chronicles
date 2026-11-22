# Bug Fix: Wheel animation timing and Go Force admin UX

- **Slug**: spinner-settings-art
- **Fixed**: 2026-11-22
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Separated Wheel of Names result preparation from committing/opening voting, so the result and database deadline become active only after the animation completes (or is skipped/failed). Added cover art to selection results, and reorganized Go Force admin into accessible tabs with an inline-editable annual-games table.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `apps/web/src/features/go-force/game-actions.ts` | modified | Prepare the validated provider winner without committing; added a separately authorized, eligibility-checking commit action. |
| `apps/web/src/features/go-force/wheel-of-names-client.ts` | modified | Preserve a valid winner when the provider animation is missing, invalid, or oversized, allowing the UI fallback to continue. |
| `apps/web/src/features/go-force/wheel-animation.ts` | added | Parse GIF/WebP frame durations so voting activation waits for actual media playback. |
| `apps/web/src/components/go-force/roulette-reveal.tsx` | modified | Removed the drawn placeholder wheel; play provider media without showing a title, and commit on completion, reduced motion, load failure, or interruption. |
| `apps/web/src/components/go-force/facilitator-session.tsx` | modified | Coordinate spin preparation/commit and show cover art in closed-selection results. |
| `apps/web/src/components/go-force/results-page.tsx` | modified | Show cover art for finalists and round selections on the public results page. |
| `apps/web/src/components/go-force/admin-controls.tsx` | modified | Add keyboard-operable tabs and an all-games table with inline Edit and Delete actions; retain the add form. |
| `apps/web/src/app/globals.css` | modified | Remove the placeholder wheel’s drawing and animation styles. |
| `apps/web/tests/unit/go-force/*` | added/modified | Cover media duration, animation fallback/timing, action sequencing, result artwork, and tabs/table behavior. |
| `apps/web/tests/e2e/go-force-*.spec.ts` | modified | Update Go Force browser flows for the new tabs, table, and spin status. |

## Diff Highlights

- The provider winner is returned to the facilitator first; `go_force_commit_selection` is called only after the media duration, or immediately for reduced motion and animation failure/interruption.
- The server rechecks facilitator authorization, active round, and candidate eligibility before commit. The existing database insert trigger starts the timer at that later commit; no migration was required.
- Invalid or unavailable animation media no longer discards an otherwise validated provider winner.

## Tests Added or Updated

- `tests/unit/go-force/game-actions.test.ts` — preparation does not commit; separate commit validates eligibility and starts publication.
- `tests/unit/go-force/roulette-reveal.test.tsx` — title remains hidden while spinning; completion, reduced-motion, media-error, and page-interruption paths advance.
- `tests/unit/go-force/wheel-animation.test.ts` — parses animated GIF/WebP durations and treats static/malformed media as immediate fallback.
- `tests/unit/go-force/wheel-of-names-client.test.ts` — missing/malformed/oversized media does not discard a valid winner.
- `tests/unit/go-force/facilitator-selection-result.test.tsx` and `results-page.test.tsx` — verify cover art on facilitator and public result screens.
- `tests/unit/go-force/admin-controls.test.tsx` — verifies tabs, keyboard navigation, eligible/ineligible rows, and inline editing.
- `tests/e2e/go-force-admin.spec.ts`, `go-force-session.spec.ts`, `go-force-accessibility.spec.ts`, `go-force-results.spec.ts` — updated for the revised UI and spin flow.

## Local Verification

- Commands run: `npm run test:unit -- tests/unit/go-force` → 14 files, 65 tests passed.
- Commands run: `npm run typecheck` → passed.
- Commands run: targeted `npx eslint` on changed Go Force source and tests → passed.
- Commands run: targeted `npx prettier --check` on changed TypeScript/TSX files → passed.
- Manual checks: none.
- End-to-end tests were not run; they require the local Supabase and Wheel of Names mock services.

## Deviations from Assessment

- Added `wheel-animation.ts` to determine GIF/WebP playback duration because the browser image element does not expose an animation-finished event.
- Extended the provider client to tolerate invalid/missing/oversized animation media while retaining a validated winner, implementing the clarified no-animation fallback without changing the database schema.

## Follow-ups

- Run the updated Go Force end-to-end suite against the local Supabase and Wheel of Names mock services.
