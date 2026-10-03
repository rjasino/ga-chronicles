# Implementation Plan: Richtext Article Body

**Branch**: `002-richtext-article-body` | **Feature context**: `002-richtext-article-body` | **Date**: 2026-10-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-richtext-article-body/spec.md`

## Summary

Let contributors compose the article body as rich text with formatting and inline images. When an author inserts an image, it is stored automatically in a dedicated Supabase Storage bucket and referenced from the body; published pages render the rich body server-side with images that scale to the reading column on any device. Use the Tiptap editor (open-source core) in the existing article authoring area, store sanitized rich HTML in the existing `articles.body` column, and track inline-image references in a new database table so removed images are cleaned up from storage. Legacy plain-text articles continue to render unchanged.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 24 LTS, React 19, Next.js 16.3 (App Router, server actions)

**Primary Dependencies**: Next.js, React, `@supabase/supabase-js` + `@supabase/ssr`, Zod (existing); new for this feature: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/html`, and `sanitize-html`; Vitest, React Testing Library, Playwright, and Supabase CLI/pgTAP for verification

**Storage**: Supabase Postgres — `articles.body` (existing `text` column) stores sanitized rich HTML; new `public.article_body_images` reference table tracks per-article inline image paths; a new public Supabase Storage bucket `article-images` holds the binary image files (10 MiB per file, JPEG/PNG/WebP)

**Testing**: Unit tests for HTML sanitization/plain-text detection, image validation, and reference reconciliation; database/RLS tests with pgTAP for the new table and bucket; Playwright end-to-end tests for rich authoring, publishing, responsive reading, and image lifecycle; existing Vitest/Playwright/axe setup reused

**Target Platform**: Responsive web — anonymous public readers plus authenticated contributors/admins in the existing authoring area; desktop and mobile viewports

**Project Type**: Single full-stack web application (Next.js + Supabase), extending the existing `apps/web` app

**Performance Goals**: Preserve the project's established public-page Core Web Vitals targets (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile) on representative article pages; readers receive no rich-editor JavaScript; body images below the fold load lazily so they do not block rendering

**Constraints**: Rich-editor client code must stay on the authoring pages only; the article-save server action must keep fitting within the existing 11 MiB server-action body limit while a single inline image may be up to 10 MiB; `articles.body` must keep rendering legacy plain-text bodies; edited HTML is untrusted input and must be sanitized before any reader sees it; image fit must never overflow the reading column or introduce horizontal scrolling

**Scale/Scope**: Small invited contributor team, one publication; inline images up to 10 MiB each; no per-article image-count cap at launch; per-image limits match the existing cover-image rules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / gate | Plan response | Status |
|---|---|---|
| I. Code quality and review | Follow the existing feature-oriented structure and conventions in `apps/web`/`supabase`; generalize the proven cover-image helpers instead of duplicating them; code review before merge. | PASS |
| II. Unit and integration testing | Cover sanitization and plain-text detection, image file validation, reference reconciliation and storage cleanup, DB/RLS permissions for the new table and bucket, and end-to-end authoring/publishing/reading flows with automated tests. | PASS |
| III. Consistent, accessible UX | Keep the editor visually on-brand and headless; toolbar stays keyboard-operable and labeled; images keep alt text; verify responsive behavior with no horizontal scroll and run axe checks on authoring and reading flows. | PASS |
| IV. Security | Sanitize authored HTML on save and again on render (defense-in-depth); authorize uploads server-side and at the storage bucket via RLS; keep the editor's client bundle out of public pages; audit new dependencies. | PASS |
| V. Performance | Render rich bodies server-side for anonymous readers with lazy below-fold images; keep editor JavaScript away from public leaf pages; re-run the established performance baseline against representative article pages. | PASS |

**Pre-research gate**: PASS. No constitutional conflict or requested exception.

## Project Structure

### Documentation (this feature)

```text
specs/002-richtext-article-body/
├── plan.md                   # This file (/speckit.plan command output)
├── research.md               # Phase 0 output (/speckit.plan command)
├── data-model.md             # Phase 1 output (/speckit.plan command)
├── quickstart.md             # Phase 1 output (/speckit.plan command)
├── contracts/
│   └── rich-body-contract.md # Phase 1 output (/speckit.plan command)
└── tasks.md                  # Created by /speckit.tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── components/articles/
│   │   ├── article-editor.tsx        # Modified: body field becomes the rich editor
│   │   └── article-content.tsx       # Modified: server-side rich body renderer
│   ├── features/articles/
│   │   ├── schema.ts                 # Body remains required (rich HTML now)
│   │   ├── actions.ts                # Modified: save reconciles image refs + cleanup;
│   │   │                             #   adds uploadArticleBodyImage server action
│   │   ├── article-cover.ts          # Generalized (shared image validation helpers)
│   │   ├── body-image.ts             # New: bucket constants, image validation, storage path helpers
│   │   └── richtext/
│   │       ├── editor.tsx            # New: client rich-text editor (Tiptap)
│   │       ├── extensions.ts         # New: editor extension set (StarterKit + Image)
│   │       └── rich-html.ts          # New: sanitize allowlist, plain-text detection, render transform
│   └── tests/                        # New unit tests for rich-html/body-image/refs logic
└── package.json                      # Modified: add Tiptap + sanitize-html deps

supabase/
├── migrations/0008_article-body-images.sql   # New: refs table + article-images bucket + RLS
├── seed.sql                                 # Modified only if a rich seeded article is added
└── tests/database/article-body-images.test.sql  # New pgTAP tests

apps/web/tests/e2e/                    # New rich-editor scenarios (author, publish, read, edit)
```

**Structure Decision**: Extend the single Next.js application with the editor as a client component under `features/articles/richtext`, keeping the server action and data boundaries in the existing article feature files. Add the reference table and bucket in one new Supabase migration so image lifecycle is enforced at the storage/database boundary exactly like the existing cover-image features.

## Phase 0 Research Summary

Research decisions and source links are recorded in [research.md](research.md). Key outcomes: adopt the Tiptap editor (open-source core; React 19/Next 16 compatible, headless, built-in Image extension); store sanitized HTML in the existing `articles.body` column (no migration of stored bodies, legacy plain text detected and rendered as before); upload body images through a dedicated server action into a new public `article-images` bucket mirroring the `article-covers` RLS patterns; track per-article image references in a new `article_body_images` table so deletes/replacements clean up storage; render approved HTML server-side with lazy, container-fitted images using plain responsive CSS rather than server-rendering the editor's client framework.

## Phase 1 Design Summary

- [data-model.md](data-model.md) defines the rich-body semantics of `articles.body`, the new `article_body_images` reference table, and the `article-images` storage bucket with integrity and authorization rules.
- [contracts/rich-body-contract.md](contracts/rich-body-contract.md) defines the observable authoring, upload, persistence, rendering, and cleanup behavior for contributors, readers, and the storage boundary.
- [quickstart.md](quickstart.md) provides local setup and end-to-end validation scenarios for the rich body feature.

**Post-design Constitution Check**: PASS. The proposed boundaries keep authoring and reading flows testable, keep the rich-editor client bundle off public reader pages, sanitize authored content at two boundaries, and preserve the project's performance baselines. No violations require a waiver.

## Complexity Tracking

No constitutional violations or unnecessary layers are proposed. A separate CMS, a server-side rich-text framework for readers, client-side rendering of body content, and storing binary images inside the database were rejected because they duplicate or contradict the existing single-application, server-rendered launch architecture.