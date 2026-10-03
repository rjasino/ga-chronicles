# Bug Verification: Footer social icons and copyright line

- **Slug**: footer-icons-copyright
- **Tested**: 2026-10-03
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The reported behavior no longer reproduces: the footer renders Facebook, YouTube, and Twitch as accessible icon links and shows a "© <year> Game Ako Chronicles. All rights reserved." line instead of the old "coming soon" placeholder. The reproduction steps were exercised via their automated browser equivalent, and the full regression suite plus lint/type-check/unit tests pass with no regressions.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npm --prefix apps/web run test:e2e -- tests/e2e/footer-socials.spec.ts` (opens `/`, scrolls to footer, inspects social area and legal line) | pass | Icons visible with accessible names; legal line shows `© 20xx Game Ako Chronicles … All rights reserved`; no "coming soon" text remains. |
| New / updated tests | `npm --prefix apps/web run test:e2e -- tests/e2e/footer-socials.spec.ts tests/e2e/accessibility.spec.ts` | pass | 7 tests: icon links by accessible name, decorative `aria-hidden` SVGs, exactly 3 links, copyright text, placeholder click stays on-site, and zero axe WCAG 2.1 AA violations in both themes. |
| Regression suite | `npm --prefix apps/web run test:e2e` | pass | 31 passed (full Chromium suite), including responsive-branding and theme-toggle footer assertions. |
| Unit tests | `npm --prefix apps/web run test:unit` | pass | 75 passed (14 files); no unit logic touched by the fix. |
| Lint | `npm --prefix apps/web run lint` | pass | 0 errors. |
| Type-check | `npm --prefix apps/web run typecheck` | pass | No errors. |

## Output Excerpts

```text
Running 7 tests using 1 worker
  ok 6 [chromium] › tests\e2e\footer-socials.spec.ts:3:5 › the footer presents the channels as accessible social icons (740ms)
  ok 7 [chromium] › tests\e2e\footer-socials.spec.ts:13:5 › the footer shows a copyright line and placeholder links never send visitors away (729ms)
  7 passed (18.0s)
```

```text
  31 passed (1.7m)
```

```text
 Test Files  14 passed (14)
      Tests  75 passed (75)
```

## Residual Risks

- The reproduction was performed with automated browser checks (Playwright/Chromium), which is the automated equivalent of the assessment's manual steps; no separate manual pass was done.
- Icon glyph fidelity (whether the Facebook/YouTube/Twitch marks look exactly as the owner expects) is a visual-review matter not covered by assertions; the assessment flagged this class of owner review.
- Placeholder `#` links remain by design; real channel URLs are still an owner follow-up, so clicking a social icon currently stays on the page.

## Recommendation

Close the bug — verified end-to-end. The footer now presents social media icons with accessible names, the "coming soon" placeholder is replaced by an all-rights-reserved copyright line, and the full suite (31 e2e + 75 unit) plus lint/type-check pass with no regressions. Only remaining item is the owner supplying real channel URLs (and optionally confirming icon styling visually).
