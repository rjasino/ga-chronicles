# Bug Fix: Wheel of Names Spin Stack Overflow

- **Slug**: wheel-spin-stack-overflow
- **Fixed**: 2026-11-22
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Replaced whole-string base64 regex validation—which overflowed the regexp engine stack for large animations—with bounded, iterative validation. Added safe provider diagnostics and normalized unexpected action errors so stack traces are logged server-side rather than returned to the facilitator.

Also removed explicit `encType` from the annual-game Server Action forms, clearing the separate React warning while preserving file uploads.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `apps/web/src/features/go-force/wheel-of-names-client.ts` | modified | Iterative base64 validation, 8 MiB animation limit, request correlation ID, and redacted response/error metadata logging. |
| `apps/web/src/features/go-force/game-actions.ts` | modified | Unexpected errors now produce a stable retry message; known provider errors include a reference ID. |
| `apps/web/src/components/go-force/admin-controls.tsx` | modified | Removed redundant `encType` from annual-game Server Action forms. |
| `apps/web/tests/unit/go-force/wheel-of-names-client.test.ts` | modified | Covers large valid, malformed, and oversized animation strings. |
| `apps/web/tests/unit/go-force/game-actions.test.ts` | added | Verifies provider failure does not commit/publish and valid winners are committed before publishing. |
| `apps/web/tests/e2e/go-force-admin.spec.ts` | modified | Verifies file upload still works and the React form warning is absent. |

## Tests Added or Updated

- `wheel-of-names-client.test.ts` — validates a 5 MB animation without stack overflow; rejects malformed and over-limit input safely.
- `game-actions.test.ts` — ensures provider errors do not call the database RPC and valid results commit before broadcast.
- `go-force-admin.spec.ts` — checks annual-game file upload and absence of the `encType` console warning.

## Local Verification

- `npm run test:unit` → **34 files, 212 tests passed**
- `npm run typecheck` → passed
- `npm run lint` → passed with the existing `@next/next/no-img-element` warning in `roulette-reveal.tsx`
- With `PLAYWRIGHT_BASE_URL` set to `http://127.0.0.1:3000`, `npx playwright test tests/e2e/go-force-admin.spec.ts --grep "annual-game Server Action forms"` → passed

## Deviations from Assessment

- The 8 MiB animation ceiling is a conservative implementation choice; the actual provider animation length remains unverified. The server logs only the length and response metadata, not the animation or API key.
- The reported provider response was not replayed because its body and real credential were not supplied.

## Follow-ups

- Retry a real spin and check the dev-server log for the request reference and `animationLength`; share only the length and winner-field presence.
- Complete a provider-backed rehearsal after verifying the response fits the configured size limit.

## Follow-up Adjustment (2026-11-22)

The user's provider diagnostics later showed HTTP 200, winner fields present, and an animation length of 9,886,656 characters—above the initial 8 MiB ceiling. The client now requests non-looping 300 px / 15 FPS WebP output and allows up to 12 MiB, while keeping iterative validation and MIME-aware rendering. Unit coverage now includes the observed animation length. The optimized provider request itself has not yet been exercised against the real service.

Additional files updated: `apps/web/src/components/go-force/facilitator-session.tsx`, `apps/web/src/components/go-force/roulette-reveal.tsx`, `apps/web/tests/unit/go-force/roulette-reveal.test.tsx`, and `apps/web/tests/e2e/fixtures/wheel-of-names.ts`.
