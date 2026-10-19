# Implementation Plan: Editorial Desk UI Fixes

**Branch**: `008-editorial-desk-fixes` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-editorial-desk-fixes/spec.md`

## Summary

Seven fixes across the public story list and the article editor (`/admin/articles/new` and `/admin/articles/[id]/edit`):

1. Story card summaries show plain text, not raw HTML tags.
2. "Editorial desk" becomes a page heading on both editor pages.
3. The rich text toolbar stays pinned while a long article is scrolled.
4. Links render styled inside the editor as soon as they are applied.
5. Bullet and numbered lists render with visible markers, in the editor and on the public page.
6. Inline image upload shows a blocking loading modal.
7. Oversized inline images show a clear error with the limit and the file size.

Root causes found in the current code (see [research.md](./research.md)):

- **Card tags**: `article-card.tsx` slices the stored HTML body directly.
- **Lists**: Tailwind v4 preflight removes list markers. `globals.css` only sets `padding-left` on `ul`/`ol`, so lists indent with no bullets or numbers.
- **Link feedback**: the editor has no link styling. Preflight sets `a { color: inherit }` and only `.story__body a` is styled, so applied links look like plain text until saved.
- **Editorial desk**: rendered as a `<p class="article-type">` on both editor pages.
- **Oversized image**: a 10 MiB limit is enforced on the server only. The client has no pre-check, and the upload call has no error handling, so an over-limit request can fail without a message.

## Technical Context

**Language/Version**: TypeScript (strict), React 19 via Next.js 16 App Router

**Primary Dependencies**: Next.js 16, Tiptap 3 (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`), Tailwind CSS v4, sanitize-html

**Storage**: Supabase Postgres for articles; Supabase Storage bucket `article-images` for inline images. No schema change.

**Testing**: Vitest for unit and integration tests (`apps/web/tests/unit`, `apps/web/tests/integration`); Playwright for e2e (`apps/web/tests/e2e`, including existing `richtext-authoring.spec.ts`, `richtext-reading.spec.ts`, `public-articles.spec.ts`)

**Target Platform**: Modern desktop and mobile browsers; server runtime Node for Next.js

**Project Type**: Web application (monorepo, Next.js app in `apps/web`)

**Performance Goals**: No added network calls on the story list; plain-text card derivation is a synchronous string operation per card. Toolbar pinning uses CSS only, with no scroll listeners.

**Constraints**: Article bodies remain sanitized by the existing allowlist. Image size limit stays at 10 MiB (`ARTICLE_IMAGES_MAX_SIZE`), and the Next server action body limit stays at 11 MB. No new runtime dependencies.

**Scale/Scope**: Small. Changes touch about 8 files and add or update about 4 test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality**: Changes reuse existing helpers (`validateImageFile`, `sanitizeRichHtml`, `richBodyHasContent`) rather than duplicating logic. New helpers get doc comments only where behavior is not obvious. **Pass.**
- **II. Testing Standards**: Each change gets a unit test (card text helper, list CSS contract, link rendering, size validation message, upload modal state) and an e2e check for lists, links, and oversized uploads. **Pass, provided tests are added.**
- **III. UX Consistency**: Reuses the existing `Message` component, toolbar `Button` styling, and card typography. The loading modal follows the existing visual language (dark card surfaces, `--blue`/`--yellow` tokens). **Pass.**
- **IV. Security**: Image format and size validation stay on the server. The client pre-check is advisory only and does not replace the server check. The sanitize allowlist is unchanged. **Pass.**
- **V. Performance**: No new dependencies and no scroll listeners. The card plain-text step runs on at most a short slice of each body. **Pass.**

**Gate result**: No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/008-editorial-desk-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (no persisted model change)
├── quickstart.md        # Phase 1 output (manual and automated validation)
├── contracts/
│   └── body-image-upload.md   # Phase 1 output (upload action result shape)
├── checklists/
│   └── requirements.md
└── spec.md
```

### Source Code (repository root)

```text
apps/web/src/
├── components/articles/
│   ├── article-card.tsx          # FR-001/002: render plain-text summary
│   └── article-editor.tsx        # (no change expected)
├── features/articles/
│   ├── actions.ts                # FR-013/015: structured size error from uploadArticleBodyImage
│   ├── body-image.ts             # Export size limit for client use; size message helper
│   └── richtext/
│       ├── rich-html.ts          # New richBodyToPlainText helper
│       ├── editor.tsx            # FR-004..006, 011..014: toolbar, link, upload modal, errors
│       └── extensions.ts         # (no change expected)
├── app/
│   ├── globals.css               # FR-003/004/005/007: list markers, link style, sticky toolbar, modal
│   └── admin/articles/
│       ├── new/page.tsx          # FR-003: Editorial desk as heading
│       └── [id]/edit/page.tsx    # FR-003: Editorial desk as heading

apps/web/tests/
├── unit/articles/
│   ├── article-card-summary.test.tsx   # new: FR-001/002
│   ├── body-image.test.ts              # extend: FR-013 message with file size
│   └── richtext-editor.test.tsx        # extend: link, list, modal, error
├── integration/
│   └── article-body-cleanup.test.ts    # existing; check it still passes
└── e2e/
    ├── richtext-authoring.spec.ts      # extend: lists, link feedback, toolbar sticky, oversized image
    └── public-articles.spec.ts         # extend: card shows no tags; public list renders bullets
```

**Structure Decision**: Changes stay inside the existing `apps/web` feature folders. Card text logic goes next to the other rich-body helpers in `rich-html.ts`, and all editor UI stays in `richtext/editor.tsx`. No new feature module is created.

## Phase 0: Research

See [research.md](./research.md). All NEEDS CLARIFICATION items are resolved there, including:

- Confirmed list and link root causes in the current CSS and Tiptap setup.
- Chose a text-only derivation for card summaries.
- Chose the approach for the blocking modal and the sticky toolbar.
- Confirmed the Next.js server action body limit (`serverActions.bodySizeLimit` set to 11 MB; the Next default is 1 MB).

## Phase 1: Design

- **Data model**: no new persisted entities. See [data-model.md](./data-model.md).
- **Contracts**: the only changed interface is the `uploadArticleBodyImage` result shape, adding a machine-readable `errorCode`. See [contracts/body-image-upload.md](./contracts/body-image-upload.md).
- **Quickstart**: manual and automated validation steps. See [quickstart.md](./quickstart.md).

### Post-design Constitution re-check

- **I**: Helpers reuse existing validation; no duplication. **Pass.**
- **II**: Test plan covers every FR (unit + e2e). **Pass.**
- **III**: Modal and toolbar follow existing tokens and components. **Pass.**
- **IV**: Server-side validation and sanitize allowlist unchanged. **Pass.**
- **V**: CSS-only sticky toolbar and no new dependencies. **Pass.**

**Result**: All gates pass after design. No unresolved clarifications remain.

## Complexity Tracking

> Not applicable. No constitution violations.
