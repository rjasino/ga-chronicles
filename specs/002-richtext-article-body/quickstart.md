# Quickstart: Richtext Article Body Validation

This guide describes local setup and end-to-end checks for the rich article body feature. It extends the validation guide in `specs/001-blog-site-launch/quickstart.md` (same app and backend).

## Prerequisites

- Node.js 24 LTS and npm
- Docker running for the local Supabase services
- Supabase CLI
- `apps/web/.env.local` based on `.env.example`, populated only with local Supabase values
- No external provider credentials are needed for routine checks

## Start the local environment

From the repository root:

```sh
npm --prefix apps/web install
npx supabase start
npx supabase db reset
npm --prefix apps/web run dev
```

`db reset` applies the latest migrations, including the new `article_body_images` table and the `article-images` storage bucket, and seeds the disposable local users already documented in the launch quickstart (reader, contributor, moderator, admin, contributor+moderator).

Open the local web address printed by the development server and sign in as `localcontributor` (or `localadmin`).

## Automated validation

Run from the repository root:

```sh
npm --prefix apps/web run test:unit
npm --prefix apps/web run test:database
npm --prefix apps/web run test:e2e
npm --prefix apps/web run lint
npm --prefix apps/web run typecheck
npm --prefix apps/web audit --audit-level=moderate
```

Expected results:

- Unit tests cover body HTML sanitization and plain-text detection, image file validation (magic bytes, formats, size limits), rich-text editor read/write of the hidden body field, and reference reconciliation used for cleanup.
- Database tests prove the `article_body_images` table constraints/RLS and the `article-images` bucket policies: public read, contributor/admin upload under the author's own folder, contributor/admin delete, admin-only delete of others' objects.
- Browser tests exercise rich authoring, insert/replace/remove of inline images, preview and publish, anonymous responsive reading, and legacy plain-text rendering; axe runs on the editor and article pages.

## End-to-end scenarios

1. **Rich authoring**: Sign in as a contributor, create an article, apply headings, bold/italic, a list, and a link, insert at least one JPEG/PNG/WebP image (exactly like choosing a file), and save a draft. Verify the preview shows the formatting and the image in place. Confirm an unsupported or >10 MiB file is rejected with a clear message while the body stays intact.
2. **Responsive public reading**: Publish the article and open it anonymously at 1280 px and 390 px viewport widths. Verify formatted text renders, every image fits the reading column with its proportions, and there is no horizontal scrolling. Confirm images below the fold do not block initial rendering.
3. **Edit and lifecycle**: Reopen the article, replace the image, republish, and verify the new image shows publicly and the replaced stored object was removed. Remove the image entirely, republish, verify it disappears from the public page, and verify the stored object is cleaned up.
4. **Backwards compatibility**: Open a seeded article created before this feature and verify its plain-text body still renders as readable paragraphs with no re-entry.
5. **Accessibility and performance**: Run automated accessibility checks on the editor and a published article; manually verify the editor toolbar is keyboard-operable. Re-run the project's performance baseline on a representative article page with several images and keep results that show readers receive no editor JavaScript and below-fold images are lazy.

## Verified implementation results

Validated on 2026-10-03 with Node 24, Next.js 16.3, Tiptap v3, and local Supabase (Docker):

| Check | Result |
|---|---|
| `npm --prefix apps/web run lint` | PASS — 0 errors |
| `npm --prefix apps/web run typecheck` | PASS |
| `npm --prefix apps/web run test:unit` | PASS — 63 tests across 12 files |
| `npm --prefix apps/web run test:database` | PASS — 45 pgTAP assertions across 7 files |
| `npm --prefix apps/web run test:e2e` | PASS — 19 Chromium scenarios, including the new rich-authoring, responsive-reading, and image-lifecycle flows |
| `npm --prefix apps/web run build` | PASS — optimized production build |
| `npm --prefix apps/web audit --audit-level=moderate` | 5 high severity (dev-only `braces` chain in the ESLint toolchain; tracked in `docs/operations/security-review.md`; no forced breaking fix applied) |
| `npm --prefix apps/web run performance` | Recorded in `docs/operations/performance-baseline.md`, including the rich article route with inline images |

## Verify local inline-image storage

With local Supabase running, open Supabase Studio at <http://127.0.0.1:54323> and select **Storage → article-images**. Inserted images appear under `<user-id>/<uuid>.<ext>`. The `article_body_images` table (via **Table Editor**) lists the per-article references. Removing an image and resaving should remove its object from the bucket once no reference remains. The saved article body contains public storage URLs of the form `http://127.0.0.1:54321/storage/v1/object/public/article-images/<user-id>/<uuid>.<ext>`.

## Shutdown

```sh
npx supabase stop
```

See [data-model.md](data-model.md) for entities/invariants and [the rich body contract](contracts/rich-body-contract.md) for expected observable behavior.