# Bug Verification: Article cover images are not uploaded to Supabase Storage

- **Slug**: cover-image-upload
- **Tested**: 2026-10-02
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The cover-image validation, URL handling, and local optimizer-bypass unit tests pass, and lint/type-check found no regressions. The reported Next.js error was caused by the image optimizer rejecting `127.0.0.1` as a private IP; local article-cover URLs now render directly without using that optimizer, while production images remain optimized. The actual Storage upload and rendered image were not exercised because local Supabase/Docker is stopped, so end-to-end verification remains incomplete.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Open an uploaded local cover on article card/detail page | skipped | Local Supabase services were stopped, so no uploaded object was available to exercise the browser rendering path. |
| New / updated tests | `npm --prefix apps/web run test:unit` | pass | 7 test files, 34 tests passed, including cover type/signature, size, Storage URL checks, and local-only optimizer-bypass selection. |
| Regression suite | `npm --prefix apps/web run test:e2e` and Supabase database tests | skipped | Requires the local Supabase/Docker stack; the E2E flow writes articles and Storage objects. |
| Lint / type-check | `npm --prefix apps/web run lint`; `npm --prefix apps/web run typecheck` | pass | Both commands completed successfully. |

## Output Excerpts

```text
Test Files  7 passed (7)
Tests       34 passed (34)
npm --prefix apps/web run typecheck  → passed
npm --prefix apps/web run lint       → passed
Local Supabase image diagnosis: optimizer rejected loopback IP `127.0.0.1`; local cover URLs now bypass optimization for direct browser loading.
```

## Residual Risks

- The new `article-covers` bucket migration and Storage RLS policies have not been applied or tested against the local Supabase database.
- The real file upload, saved public URL in `articles.cover_image`, direct local image rendering, and removal/object cleanup need an end-to-end run with local Supabase running.
- Unit tests do not prove Supabase Storage API permissions or the Next.js Server Action multipart limit in a live request.

## Recommendation

Hold for local integration verification. Start local Supabase, apply migrations using the appropriate local workflow, then run `npm --prefix apps/web run test:e2e` and inspect **Storage → article-covers** plus `articles.cover_image` in Studio at `http://127.0.0.1:54323`. Avoid `npx supabase db reset` if the local database contains data that must be preserved. Close the bug only after the uploaded image URL loads and removal is confirmed end-to-end.
