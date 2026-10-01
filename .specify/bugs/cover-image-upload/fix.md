# Bug Fix: Article cover images are not uploaded to Supabase Storage

- **Slug**: cover-image-upload
- **Fixed**: 2026-10-02
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Replaced the article cover-path text field with a file picker and wired the server action to validate, upload, and persist a public Supabase Storage URL. Added public-read bucket configuration with role-restricted writes, cover removal/replacement cleanup, local image host and upload request limits, and regression coverage/documentation. Follow-up: local Supabase cover URLs now bypass Next.js image optimization so the dev optimizer does not reject loopback IPs; production Supabase images remain optimized.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `apps/web/src/components/articles/article-editor.tsx` | modified | File picker accepts JPEG/PNG/WebP; editors can remove an existing cover. |
| `apps/web/src/features/articles/actions.ts` | modified | Validates and uploads files, stores public URLs, preserves existing images when no new file is chosen, removes old covers after a successful save, and cleans up newly uploaded objects when the article save fails. |
| `apps/web/src/features/articles/article-cover.ts` | added | Shared bucket/size constants, MIME and magic-byte validation, extension selection, and safe same-instance Storage URL path extraction. |
| `apps/web/src/components/articles/article-card.tsx` | modified | Uses the direct local Storage URL instead of routing local covers through Next's private-IP-blocked optimizer. |
| `apps/web/src/components/articles/article-content.tsx` | modified | Applies the same local-image optimizer bypass on article detail pages. |
| `supabase/migrations/0007_article-cover-storage.sql` | added | Creates the public `article-covers` bucket with a 10 MiB limit and JPEG/PNG/WebP allowlist; permits public reads and restricts writes/removals to contributors/admins. |
| `apps/web/next.config.ts` | modified | Allows local Supabase Storage image URLs and raises Server Action body limit to 11 MiB so 10 MiB uploads plus multipart overhead can reach the action. |
| `apps/web/tests/unit/articles/article-cover.test.ts` | added | Tests file type/signature validation, size checks, extension selection, safe Storage URL parsing, and local-only optimizer bypass selection. |
| `apps/web/tests/e2e/contributor-publishing.spec.ts` | modified | Exercises cover upload, preview/public rendering, and editor removal in the contributor publishing flow. |
| `specs/001-blog-site-launch/quickstart.md` | modified | Documents Studio, bucket, table URL, and local object checks. |

## Diff Highlights (optional)

- New uploads are stored under `<authenticated-user-id>/<random-uuid>.<jpg|png|webp>` in `article-covers` and the bucket's `getPublicUrl()` result is stored in `articles.cover_image`.
- Removal/replacement clears or updates the row first, then attempts object cleanup; legacy external/local URLs are never treated as objects in this bucket.
- The server checks both declared MIME type and file signature, and enforces the configured 10 MiB cap.

## Tests Added or Updated

- `apps/web/tests/unit/articles/article-cover.test.ts` — validates JPEG, PNG, and WebP signatures; rejects unsupported/mismatched formats and oversized/empty files; checks Storage URL scope/path extraction and that only local article-cover URLs bypass optimization.
- `apps/web/tests/e2e/contributor-publishing.spec.ts` — uploads a fixture image, confirms it renders in preview and public article, and confirms removal hides it.

## Local Verification

- Commands run: `npm --prefix apps/web run test:unit` → PASS (7 files, 34 tests).
- Commands run: `npm --prefix apps/web run typecheck` → PASS.
- Commands run: `npm --prefix apps/web run lint` → PASS.
- Manual checks: not performed.
- The Playwright end-to-end scenario and Supabase migration/database tests were not run; they require the local Docker/Supabase environment and may modify its seeded data. Run them after starting local Supabase and applying migrations.

## Deviations from Assessment

None. The Next.js Server Action body-size limit was explicitly set to 11 MiB to account for multipart overhead while retaining the 10 MiB Storage/application file limit.

## Follow-ups

- Start local Supabase and apply the new migration (`npx supabase db reset` for a disposable local database, or the normal migration workflow when preserving local data).
- Run `npm --prefix apps/web run test:e2e` and verify the `article-covers` bucket/object and `articles.cover_image` URL in Studio at `http://127.0.0.1:54323`.
