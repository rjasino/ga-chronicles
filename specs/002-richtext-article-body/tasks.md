# Tasks: Richtext Article Body

**Input**: Design documents from `specs/002-richtext-article-body/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`  
**Tests**: Included because the project constitution requires comprehensive unit and integration testing with automation.

**Organization**: Tasks are grouped by the three user stories in `spec.md`. Every story phase includes its goal and an independent verification criterion.

## Format

`- [ ] T### [P?] [US#?] Description with file path`

- `[P]` appears only where the task can be done independently in separate files.
- `[US#]` is required for user-story tasks and omitted for setup, foundation, and polish tasks.
- Tasks are ordered by execution dependency; tests are defined before the implementation they verify.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the rich-text editor and sanitization dependencies and confirm the test harness can mount the editor.

- [X] T001 Add the Tiptap editor and HTML-sanitization dependencies `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/html`, `sanitize-html`, and `@types/sanitize-html` (dev) to `apps/web/package.json`, then run `npm --prefix apps/web install`.
- [X] T002 [P] Confirm/configure the jsdom test environment in `apps/web/vitest.config.ts` and `apps/web/tests/setup.ts` so Tiptap can mount under Vitest, adding any needed DOM shims (for example `Range` or `Element.prototype.innerText`) without weakening the existing setup.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared image validation, safe rich-HTML handling, the `article_body_images` schema, and the upload action before any user story begins.

- [X] T003 Create `apps/web/src/features/articles/body-image.ts` with the `article-images` bucket constant, allowed formats `image/jpeg`, `image/png`, `image/webp`, the 10 MiB per-file limit, magic-byte content validation generalized from `apps/web/src/features/articles/article-cover.ts`, and public-URL ↔ storage-path helpers.
- [X] T004 Create `apps/web/src/features/articles/richtext/rich-html.ts` with the sanitization allowlist (paragraphs, headings, bold/italic, ordered and unordered lists and items, block quotes, http/https links, and images carrying `src` and `alt`), a plain-text detection heuristic, and plain-text-to-paragraph conversion reusing the split-on-blank-lines logic in `apps/web/src/components/articles/article-content.tsx`.
- [X] T005 Create `supabase/migrations/0008_article-body-images.sql` implementing the `public.article_body_images` table (`id` uuid primary key default `extensions.gen_random_uuid()`, `article_id` uuid NOT NULL references `public.articles(id)` on delete cascade, `storage_path` text NOT NULL, `created_at` timestamptz NOT NULL default `now()`, unique (`storage_path`, `article_id`)) with RLS enabled and author/admin policies; add the `article-images` storage bucket (public, 10 MiB per file, `array['image/jpeg', 'image/png', 'image/webp']::text[]`) with policies mirroring `supabase/migrations/0007_article-cover-storage.sql` (public select, contributor/admin insert with `(storage.foldername(name))[1] = auth.uid()::text`, contributor/admin delete where admin or first folder equals the actor).
- [X] T006 [P] Add pgTAP tests in `supabase/tests/database/article-body-images.test.sql` proving the refs-table unique constraint and RLS (anonymous cannot insert/delete refs; contributors can manage refs of their own articles; admins all), plus the bucket policies (public read; contributor upload only under their own user folder; admin delete anywhere; unauthorized upload/delete denied).
- [X] T007 Refactor `apps/web/src/features/articles/article-cover.ts` to reuse the shared validation and storage-path helpers from `apps/web/src/features/articles/body-image.ts` so the cover flow and body-image flow have one implementation.
- [X] T008 Add the `uploadArticleBodyImage` server action in `apps/web/src/features/articles/actions.ts`: authorize with `can(session.roles, "publish")`, validate the file with the helpers from `apps/web/src/features/articles/body-image.ts`, upload to the `article-images` bucket at `<userId>/<randomUUID()>.<extension>` with `cacheControl: "3600"` and `upsert: false`, and return the public URL or a plain-language error.

**Checkpoint**: Foundation ready — shared validation and sanitization helpers exist, `article_body_images` and the `article-images` bucket are deployed and policy-tested, and contributors/admin can upload body images.

---

## Phase 3: User Story 1 — Contributor composes an article with rich text and inline images (Priority: P1) — MVP

**Goal**: A contributor composes a body with formatted text and inline images that are stored automatically, then saves a draft and previews it.

**Independent Test**: Sign in as a contributor, create an article, apply at least two text formats, insert one image chosen from a file, and save a draft; the preview shows the formatting and the image in place. An unsupported or >10 MiB file is rejected with a plain-language message while the body stays intact.

### Tests for User Story 1

- [X] T009 [P] [US1] Add unit tests for the sanitization allowlist (allowed tags/attributes preserved, scripts/event handlers/styled attributes removed) and plain-text detection/conversion in `apps/web/tests/unit/articles/rich-html.test.ts`.
- [X] T010 [P] [US1] Add unit tests for body-image validation (magic bytes, formats, size limit) and public-URL ↔ storage-path helpers in `apps/web/tests/unit/articles/body-image.test.ts`.
- [X] T011 [US1] Add a component test for the editor value flow (init from HTML, typing, image-insert callback, hidden `body` field sync, sanitized submit value, legacy plain-text init) in `apps/web/tests/unit/articles/richtext-editor.test.tsx`.
- [X] T012 [US1] Add browser tests for the rich authoring journey (format text, insert image, save draft, preview reflects content, invalid file rejected without losing the body) in `apps/web/tests/e2e/richtext-authoring.spec.ts`.

### Implementation for User Story 1

- [X] T013 [P] [US1] Create the Tiptap extension set in `apps/web/src/features/articles/richtext/extensions.ts` using `@tiptap/starter-kit` and `@tiptap/extension-image` configured so image insertion requires the upload flow rather than raw URLs.
- [X] T014 [US1] Create the client rich-text editor in `apps/web/src/features/articles/richtext/editor.tsx` (headless toolbar for headings, bold/italic, lists, block quotes, links, and image insert; the image button calls `uploadArticleBodyImage` and inserts the returned URL; sanitized HTML is written to a hidden `body` input for the existing form; legacy plain-text bodies are converted to HTML on init).
- [X] T015 [US1] Replace the body `<textarea>` with the rich editor in `apps/web/src/components/articles/article-editor.tsx`, keeping the existing `useActionState` draft/publish flow and error/message presentation.
- [X] T016 [US1] Apply sanitize-on-save in `apps/web/src/features/articles/actions.ts` (sanitize the submitted `body` through `apps/web/src/features/articles/richtext/rich-html.ts` before persisting) while `apps/web/src/features/articles/schema.ts` still rejects a non-empty-after-trimming violation without losing the draft.

**Checkpoint**: User Story 1 is independently testable — an author can produce and preview a rich article with auto-stored images.

---

## Phase 4: User Story 2 — Reader reads rich published articles with responsive images (Priority: P1)

**Goal**: Anonymous readers see formatted text and images that fit the reading column on any device, with legacy plain-text articles still readable.

**Independent Test**: Publish an article with formatted text and at least one image, then open it anonymously at 1280 px and 390 px viewports: text is legible, images fit the column and keep proportions, there is no horizontal scrolling, below-fold images do not block the rest of the article, and a legacy plain-text article still renders as paragraphs.

### Tests for User Story 2

- [X] T017 [P] [US2] Extend the unit tests in `apps/web/tests/unit/articles/rich-html.test.ts` for the render transform (container-fit/lazy image markup, sanitize-on-render, legacy plain-text conversion).
- [X] T018 [US2] Add browser tests for anonymous responsive reading (desktop and mobile image fit, no horizontal overflow, below-fold lazy loading, legacy article readability) in `apps/web/tests/e2e/richtext-reading.spec.ts`.

### Implementation for User Story 2

- [X] T019 [P] [US2] Add responsive rich-body styles in `apps/web/src/app/globals.css`: `.story__body img { max-width: 100%; height: auto; }`, consistent rich-text typography, and visible `alt`/focus treatment within the existing matte palette.
- [X] T020 [P] [US2] Implement `renderRichBody` in `apps/web/src/features/articles/richtext/rich-html.ts` (sanitize-on-render defense-in-depth, legacy plain-text conversion to paragraphs, and lazy-load injection for below-fold images).
- [X] T021 [US2] Update `apps/web/src/components/articles/article-content.tsx` to render the body through `renderRichBody` (replacing the current split-on-blank-lines paragraph rendering) while preserving the existing cover-image markup.
- [X] T022 [US2] Seed one rich published article with a formatted body and an inline image fixture in `supabase/seed.sql` and `apps/web/tests/fixtures/richtext-inline-image.svg` so US2 and US3 can be validated without authoring first.
- [X] T023 [US2] Verify public delivery: inline-image URLs resolve from the public `article-images` bucket, the `remotePatterns` in `apps/web/next.config.ts` still cover the storage host if `next/image` is used, and no rich-editor client code is imported on the anonymous article route.

**Checkpoint**: User Story 2 is independently testable with the seeded rich article — reading works end-to-end for anonymous visitors on desktop and mobile.

---

## Phase 5: User Story 3 — Contributor edits and maintains rich content with inline images (Priority: P2)

**Goal**: A contributor adds, removes, or replaces inline images in an existing article; superseded stored files are cleaned up so orphaned uploads do not accumulate.

**Independent Test**: Edit a published article that has an inline image, remove the image, and republish; the public page no longer shows it and the stored object is removed. Replacing an image also removes the old object, and a failed save preserves the authored content.

### Tests for User Story 3

- [X] T024 [P] [US3] Add unit tests for body-image reference extraction and reconciliation (parse a sanitized body into `article-images` storage paths, compute removed references, produce cleanup candidates) in `apps/web/tests/unit/articles/body-image-refs.test.ts`.
- [X] T025 [P] [US3] Add an integration test proving save-time cleanup deletes orphaned objects while preserving still-referenced ones, using a mocked Supabase storage client, in `apps/web/tests/integration/article-body-cleanup.test.ts`.
- [X] T026 [US3] Add browser tests for the lifecycle flows (remove image → republish → gone from page and bucket; replace image → old object removed; empty-body rejection preserves previous content) in `apps/web/tests/e2e/richtext-lifecycle.spec.ts`.

### Implementation for User Story 3

- [X] T027 [P] [US3] Create `apps/web/src/features/articles/body-image-refs.ts` with functions to extract `article-images` storage paths from a sanitized body, reconcile an article's rows in `article_body_images` against the new body, and delete bucket objects no longer referenced by any article.
- [X] T028 [US3] Integrate reference reconciliation into `saveArticle` in `apps/web/src/features/articles/actions.ts` (after a successful save, reconcile refs and delete orphaned objects best-effort, logging failures like the existing cover-image cleanup).
- [X] T029 [US3] Verify empty-body rejection still works for rich HTML bodies in `apps/web/src/features/articles/schema.ts` (non-empty after trimming on the submitted body value) and adjust if the HTML wrapper elements change the trimmed value.

**Checkpoint**: User Story 3 is independently testable — editing maintains rich content and storage stays clean across remove/replace cycles.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Validate release readiness across stories and the project constitution gates.

- [X] T030 [P] Run `npm --prefix apps/web run typecheck` and `npm --prefix apps/web run lint` and fix all findings in the new and modified files.
- [X] T031 [P] Run `npm --prefix apps/web audit --audit-level=moderate` after adding the editor dependencies and record the result in `docs/operations/security-review.md`.
- [X] T032 Run the full suites `npm --prefix apps/web run test:database`, `test:unit`, and `test:e2e` and resolve failures across the new test files.
- [X] T033 [P] Re-run the performance baseline with `npm --prefix apps/web run performance` against a published article containing several images, confirm no rich-editor JavaScript reaches anonymous readers, and update `docs/operations/performance-baseline.md`.
- [X] T034 [P] Run automated axe checks and a manual keyboard review on the editor and article pages (extending `apps/web/tests/e2e/accessibility.spec.ts`) and fix findings.
- [X] T035 Execute every applicable scenario in `specs/002-richtext-article-body/quickstart.md`, including Studio verification of the `article-images` bucket and `article_body_images` table, and record verified commands/results in that file.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately; dependency installation and test-harness verification are independent of each other.
- **Foundational (Phase 2)**: Begins after Setup and blocks all story implementation. The shared helpers, schema, bucket, and upload action are intentional prerequisites every story builds on.
- **User Stories (Phases 3–5)**: Begin after Foundation. US1 and US2 can proceed in parallel when separate contributors are available; US3 depends on US1 (the editor) and US2 (the seeded rich article) but is otherwise an independent lifecycle increment.
- **Polish (Final Phase)**: Begins after the selected user stories are integrated; dependency audit and performance checks must be completed before merge.

### User Story Dependencies

- **US1 (P1)**: Depends only on Setup and Foundation; rich authoring is fully verifiable through draft save and preview.
- **US2 (P1)**: Depends only on Setup and Foundation; it is independently testable via the seeded rich article added in T022 and does not require the editor.
- **US3 (P2)**: Depends on Setup, Foundation, US1 (editor + save path), and US2's seeded rich article (T022), which provides a rich article to edit without authoring first.

### Parallel Opportunities

- Setup: T001 and T002 use separate files and can run in parallel.
- Foundation: T006 is an independent database test file and can be authored alongside T003/T004; T003, T004, and T005 are separately pathed and parallelizable before T007/T008 integrate them.
- After Foundation, US1 and US2 are separable story tracks; US3 builds on both.
- Within each story, the separately pathed tests marked `[P]` can be authored in parallel before implementation begins.
- Final-phase documentation and tooling tasks marked `[P]` touch separate scripts/documents and can run in parallel.

### Parallel Execution Examples

```text
US1: T009 sanitize/plain-text unit test || T010 body-image unit test || T012 authoring browser test
US2: T017 render unit test || T018 reading browser test || T019 globals.css styling
US3: T024 refs unit test || T025 cleanup integration test || T027 body-image-refs.ts
```

## Independent Test Criteria by Story

- **US1**: Contributor creates a rich draft with at least two text formats and one file-inserted image; preview shows them; an invalid/oversized file is rejected clearly without disturbing the body.
- **US2**: Anonymous reader opens a seeded rich article at 1280 px and 390 px; images fit the reading column with proportions preserved and no horizontal scrolling; below-fold images lazy-load; a legacy plain-text article still renders.
- **US3**: Contributor removes an inline image and republishes; the public page and the bucket no longer show it; replacing an image removes the old object; a failed save preserves the authored content.

## Implementation Strategy

### Suggested MVP

The smallest independent MVP slice is **US1** (rich authoring with auto-stored images), which is fully verifiable through draft save and preview without the public site. Because authored content exists to be read, the reader-facing MVP pairs **US1 + US2**; **US3** is the follow-on maintenance increment that keeps storage clean.

### Incremental Delivery

1. Complete Setup and Foundation; verify the `article-body-images` database tests and bucket policies pass.
2. Deliver US1 and validate rich authoring with a file-inserted image.
3. Deliver US2 (including the seeded rich article) and validate anonymous responsive reading.
4. Deliver US3 and validate remove/replace image lifecycle and storage cleanup.
5. Complete polish tasks: typecheck/lint, dependency audit, full suites, performance baseline, accessibility, and quickstart validation.

### Notes

- The `[P]` marker is limited to work in different files with no incomplete dependency.
- All user-story tasks have a story label and are grouped under the matching priority phase.
- Unit, database/RLS, and browser tests are included to satisfy the project constitution and should be written before the feature implementation they verify.
- No task deploys to production; storage/RLS and sanitization policy tests are all runnable against the local Supabase environment.