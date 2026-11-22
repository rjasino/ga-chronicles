# Bug Verification: Wheel of Names Spin Stack Overflow

- **Slug**: wheel-spin-stack-overflow
- **Tested**: 2026-11-22
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The revised client accepts a synthetic base64 string matching the observed 9,886,656-character size without stack overflow, requests optimized WebP output, and preserves winner validation. The optimized request has not been sent to the real provider, so the real spin-to-commit flow remains unverified.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Real Wheel of Names spin from the facilitator screen | skipped | Would call the external provider; no explicit authorization for a post-fix network call was given. |
| New / updated tests | `npm run test:unit` | pass | 34 files, 212 tests, including the observed animation length, malformed/oversized data, request options, and no-commit-on-provider-error coverage. |
| Regression suite | `npx playwright test tests/e2e/go-force-admin.spec.ts --grep "annual-game Server Action forms"` with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000` | pass | Upload worked and the React `encType` warning was absent. |
| Full E2E suite | `npm run test:e2e` | not-run | Not rerun after the follow-up adjustment; the earlier full run had visual-baseline and rich-text failures. |
| Lint / type-check | `npm run lint`; `npm run typecheck` | pass | Lint had 0 errors and one `@next/next/no-img-element` warning in `roulette-reveal.tsx`. |

## Output Excerpts

```text
Tests       212 passed (212)
Typecheck   passed
```

```text
1 passed (19.4s)
```

The pre-adjustment provider log showed HTTP 200, `animationLength: 9886656`, and both winner fields present. The old 8 MiB limit rejected that response. Unit tests now verify that a synthetic base64 string of that length passes the 12 MiB validator and that the client requests WebP, 300 px, 15 FPS, and no loop. The large synthetic string does not validate actual WebP image decoding.

## Residual Risks

- The actual provider response to the optimized WebP request may have a different length or behavior.
- The 12 MiB ceiling is based on the reported response plus headroom; a larger response will still be rejected safely.
- The provider-backed database commit and player reveal were not exercised after the follow-up adjustment.

## Recommendation

Hold for one post-fix provider spin. Confirm the server log shows HTTP 200, an animation length below 12 MiB, and winner fields present; then verify the selection row and facilitator/player reveal. Share metadata only—not the API key or animation body.
