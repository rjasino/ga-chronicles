# Tasks: Editorial Desk UI Fixes

**Input**: Design documents from `/specs/008-editorial-desk-fixes/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/body-image-upload.md, quickstart.md

**Tests**: Included. The spec does not require TDD, but the constitution (Principle II) requires unit tests for each changed component or function, and the plan lists test files per story.

**Organization**: Tasks are grouped by user story (US1–US7 from spec.md) so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1–US7)
- Paths are relative to the repository root. App code lives in `apps/web/`.

## Path Conventions

- App source: `apps/web/src/`
- Unit and integration tests: `apps/web/tests/unit/`, `apps/web/tests/integration/`
- E2E tests: `apps/web/tests/e2e/`
- Styles: `apps/web/src/app/globals.css`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a green baseline and confirm open design inputs before changing code.

- [X] T001 Run the baseline unit and integration suites (`cd apps/web && npx vitest run`) and record any pre-existing failures so they are not attributed to this feature
- [X] T002 Measure the sticky site header height in `apps/web/src/components/site-header.tsx` and record it as the `top` offset for the toolbar (research R4 open item)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared pieces used by the editor stories (US6, US7). MUST complete before those phases.

**CRITICAL**: No US6 or US7 work can begin until this phase is complete.

- [X] T003 Add the `errorCode` field to `BodyImageUploadResult` in `apps/web/src/features/articles/actions.ts` using the union defined in `specs/008-editorial-desk-fixes/contracts/body-image-upload.md` (type only; behavior is wired in T026)
- [X] T004 Add an exported `formatImageSize(bytes: number): string` helper to `apps/web/src/features/articles/body-image.ts` that returns megabytes with one decimal place and "MiB" suffix (for example `12.4 MiB`), and export `ARTICLE_IMAGES_MAX_SIZE` for client use

**Checkpoint**: Shared type and helper ready. Editor work can begin.

---

## Phase 3: User Story 1 - Readable story previews on listing cards (Priority: P1)

**Goal**: Story cards show plain text summaries with no visible tags, keeping existing card styling and truncation.

**Independent Test**: Load the latest stories list with an article whose body contains `<p>` and `<strong>`; the summary shows words only.

### Tests for User Story 1

- [X] T005 [P] [US1] Add unit tests for `richBodyToPlainText` (rich body, legacy plain text, empty body, entities such as `&amp;`, tags removed) in `apps/web/tests/unit/articles/rich-html.test.ts`
- [X] T006 [P] [US1] Create unit tests for the card summary rendering (no tags, 155-character truncation with ellipsis, empty body) in `apps/web/tests/unit/articles/article-card-summary.test.tsx`

### Implementation for User Story 1

- [X] T007 [US1] Implement `richBodyToPlainText(body: string): string` in `apps/web/src/features/articles/richtext/rich-html.ts`: return legacy plain text unchanged; for rich HTML, strip all tags with `sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} })` and decode `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&nbsp;`
- [X] T008 [US1] Update `apps/web/src/components/articles/article-card.tsx` to build the summary from `richBodyToPlainText(article.body)` before applying the existing 155-character slice and ellipsis

**Checkpoint**: Story cards show clean text. US1 is independently verifiable.

---

## Phase 4: User Story 2 - Clear "Editorial desk" heading (Priority: P1)

**Goal**: "Editorial desk" is the page `<h1>` on both editor pages; the existing title becomes an `<h2>`.

**Independent Test**: Open `/admin/articles/new` and `/admin/articles/<id>/edit`; exactly one `h1` reads "Editorial desk".

### Implementation for User Story 2

- [X] T009 [US2] Update `apps/web/src/app/admin/articles/new/page.tsx`: replace the `<p className="article-type">Editorial desk</p>` with an `<h1>` that keeps the same label styling, and change "Write a story" to an `<h2>` with its existing visual size
- [X] T010 [US2] Update `apps/web/src/app/admin/articles/[id]/edit/page.tsx`: replace the "Editorial desk" `<p>` with an `<h1>` using the same styling, and change "Edit story" to an `<h2>` keeping its visual size

### Tests for User Story 2

- [X] T011 [P] [US2] Add an e2e check in `apps/web/tests/e2e/richtext-authoring.spec.ts` that `getByRole("heading", { level: 1, name: "Editorial desk" })` is visible on the new and edit pages

**Checkpoint**: Both editor pages have "Editorial desk" as the only top-level heading.

---

## Phase 5: User Story 3 - Toolbar stays reachable while writing long articles (Priority: P1)

**Goal**: The rich text toolbar stays pinned below the site header while the editor scrolls.

**Independent Test**: Fill the article body beyond the viewport, scroll, and confirm the toolbar remains visible and clickable.

### Implementation for User Story 3

- [X] T012 [US3] In `apps/web/src/app/globals.css`, add `position: sticky`, `top` set to the header height from T002, a matching background, and a `z-index` to `.rich-toolbar`; confirm no ancestor of `.rich-editor` uses `overflow: hidden` or `overflow: auto` on the admin article pages

### Tests for User Story 3

- [X] T013 [P] [US3] Add an e2e test in `apps/web/tests/e2e/richtext-authoring.spec.ts` that fills the body with enough paragraphs to scroll, scrolls down, and asserts the toolbar's bounding box top is within the header offset and the Bold button still applies to a selection

**Checkpoint**: Toolbar stays visible during long-article scrolling.

---

## Phase 6: User Story 4 - Link insertion gives immediate feedback (Priority: P1)

**Goal**: Applied links are styled inside the editor before save.

**Independent Test**: Select a word, add a link, and confirm the word is styled as a link before saving.

### Implementation for User Story 4

- [X] T014 [US4] In `apps/web/src/app/globals.css`, add `.rich-editor__content a` styling that matches the public article link style (`color: var(--blue)`, `font-weight: 700`, `text-decoration: underline`, `text-underline-offset: 3px`)

### Tests for User Story 4

- [X] T015 [P] [US4] Add a unit test in `apps/web/tests/unit/articles/richtext-editor.test.tsx` that the Link toolbar action calls `setLink` with the normalized `https://` href and that empty input leaves the editor unchanged
- [X] T016 [US4] Add an e2e test in `apps/web/tests/e2e/richtext-authoring.spec.ts` that after applying a link (before save), the selected text's computed `color` differs from the surrounding paragraph text and the `text-decoration-line` includes `underline`

**Checkpoint**: Link feedback is visible in the editor before save.

---

## Phase 7: User Story 5 - Bulleted and numbered lists work as expected (Priority: P1)

**Goal**: Bullet and numbered lists show markers in the editor and on the public article page.

**Independent Test**: Select three paragraphs, apply bullets, then numbers; markers appear in both cases and on the public page.

### Implementation for User Story 5

- [X] T017 [US5] In `apps/web/src/app/globals.css`, add `list-style-type: disc` for `ul` and `list-style-type: decimal` for `ol` inside `.rich-editor__content` and `.story__body`, with `list-style-position: outside` so markers are not clipped by the existing `padding-left`

### Tests for User Story 5

- [X] T018 [P] [US5] Add an e2e test in `apps/web/tests/e2e/richtext-authoring.spec.ts` that applies bullets (computed `list-style-type` is `disc`) and numbers (`decimal`), toggles back to paragraphs, and saves; and in `apps/web/tests/e2e/public-articles.spec.ts` that the public article renders `ul`/`ol` with the same computed marker style

**Checkpoint**: Lists are visible as true lists in editor and public view.

---

## Phase 8: User Story 6 - Blocking loading state during inline image upload (Priority: P2)

**Goal**: A full-viewport loading modal blocks interaction with the page during inline image upload.

**Independent Test**: Upload an image and confirm the overlay covers the page and blocks clicks and keyboard input until upload completes.

### Tests for User Story 6

- [X] T019 [P] [US6] Add unit tests in `apps/web/tests/unit/articles/richtext-editor.test.tsx` that the upload modal renders with `role="dialog"` and `aria-modal="true"` while `uploading` is true, and is absent after the upload resolves or rejects

### Implementation for User Story 6

- [X] T020 [US6] In `apps/web/src/features/articles/richtext/editor.tsx`, render a full-viewport overlay (`role="dialog"`, `aria-modal="true"`, spinner, "Uploading image…" text) while `uploading` is true, and move focus into the dialog on open and back to the Image button on close
- [X] T021 [US6] While the overlay is open, set `inert` on the direct children of `document.body` other than the overlay container, and restore them in the effect cleanup, in `apps/web/src/features/articles/richtext/editor.tsx`
- [X] T022 [US6] Add `.rich-upload-modal` styles to `apps/web/src/app/globals.css` (fixed `inset: 0`, `z-index` above the sticky toolbar, a dimmed backdrop, centered card using existing `--card` and `--line` tokens)

### E2E for User Story 6

- [X] T023 [P] [US6] Add an e2e test in `apps/web/tests/e2e/richtext-authoring.spec.ts` that delays the upload request (Playwright route interception), asserts the dialog is visible, and asserts that a click on the Save draft button and a Tab-based focus change do not reach the page while it is open

**Checkpoint**: The inline upload blocks the page until it finishes.

---

## Phase 9: User Story 7 - Clear error for oversized images (Priority: P2)

**Goal**: Oversized inline images are rejected before upload with a message that states the limit and the file size; server errors carry a code.

**Independent Test**: Choose an image over 10 MiB and confirm the message names the limit and the file size, and no image is inserted.

### Tests for User Story 7

- [X] T024 [P] [US7] Add unit tests in `apps/web/tests/unit/articles/body-image.test.ts` for `validateArticleBodyImage`: a file of `ARTICLE_IMAGES_MAX_SIZE + 1` bytes returns "Inline images must be 10 MiB or smaller. This image is 10.0 MiB." (the sizes match `formatImageSize`); a file of exactly `ARTICLE_IMAGES_MAX_SIZE` bytes is accepted; JPEG, PNG, and WebP are accepted, other types rejected
- [X] T025 [P] [US7] Add unit tests for `uploadArticleBodyImage` error codes in `apps/web/tests/unit/articles/upload-body-image.test.ts`, mocking `getVerifiedSession` and `createClient` the same way the existing article tests do, covering `not_signed_in`, `missing_file`, `too_large`, `invalid_type`, `invalid_signature`, and `upload_failed`

### Implementation for User Story 7

- [X] T026 [US7] In `apps/web/src/features/articles/actions.ts`, return the matching `errorCode` for every branch of `uploadArticleBodyImage` (depends on T003)
- [X] T027 [US7] Update `validateImageFile` in `apps/web/src/features/articles/body-image.ts` so the size message reads `${subject} must be ${limit} MiB or smaller. This image is ${formatImageSize(file.size)}.` (depends on T004); update the existing cover-image test expectations in `apps/web/tests/unit/articles/article-cover.test.ts` to match
- [X] T028 [US7] In `apps/web/src/features/articles/richtext/editor.tsx`, add a client-side size check in `insertImage` before calling `uploadArticleBodyImage`, using `ARTICLE_IMAGES_MAX_SIZE` and `formatImageSize`, that sets `imageError` and returns without uploading
- [X] T029 [US7] In `apps/web/src/features/articles/richtext/editor.tsx`, wrap the `uploadArticleBodyImage` call in try/catch so a thrown error (for example a request above the 11 MB server action body limit) shows the `too_large` message when the file exceeds the limit and the `upload_failed` message otherwise; clear `imageError` when a valid file is selected

### E2E for User Story 7

- [X] T030 [P] [US7] Add an e2e test in `apps/web/tests/e2e/richtext-authoring.spec.ts` that selects a generated file larger than 10 MiB, asserts the message "Inline images must be 10 MiB or smaller. This image is" is shown, asserts no `img` is added to the body, then selects a valid image and asserts the error clears

**Checkpoint**: Oversized images show a clear message; valid uploads still work.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Verify the feature as a whole and confirm quality gates.

- [X] T031 Run the full unit and integration suites (`cd apps/web && npx vitest run`) and confirm no new failures compared with T001
- [ ] T032 Run the affected e2e specs (`cd apps/web && npx playwright test tests/e2e/richtext-authoring.spec.ts tests/e2e/public-articles.spec.ts tests/e2e/richtext-reading.spec.ts`)
- [X] T033 [P] Run type checking and lint (`cd apps/web && npx tsc --noEmit` and the project lint script) and fix any issues introduced by this feature
- [ ] T034 Run the manual validation steps in `specs/008-editorial-desk-fixes/quickstart.md` and confirm each expected result

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Start immediately.
- **Foundational (Phase 2)**: Depends on Setup. Blocks US6 and US7.
- **US1–US5 (Phases 3–7)**: US1 depends on nothing beyond Setup. US2 depends on nothing. US3 depends on T002. US4 and US5 depend only on the CSS file and can run in any order.
- **US6 (Phase 8)**: Depends on Phase 2 (T003/T004) only for shared types; can start after Phase 2.
- **US7 (Phase 9)**: Depends on T003 and T004 and on US6 (T020–T021), since both edit `editor.tsx`.
- **Polish (Phase N)**: Depends on all desired stories being complete.

### Within Each User Story

- Tests are written first and should fail before the implementation task for that story.
- Helpers (T007) before the component that uses them (T008).
- Shared file edits in the same story run sequentially (for example T020 → T021 → T028 → T029 all touch `editor.tsx`).

### Parallel Opportunities

- T001 and T002 can run in parallel.
- Within US1: T005 and T006 in parallel.
- US2 (T009, T010) and US1 (T005–T008) touch different files and can run in parallel.
- US3 (T012), US4 (T014), and US5 (T017) all edit `globals.css`; run them sequentially in one pass to avoid conflicts.
- US6 tests (T019, T023) and US7 tests (T024, T025, T030) are in different files and can run in parallel with each other.
- Polish: T033 in parallel with T031 and T032.

---

## Parallel Example: User Story 1

```text
Task: "T005 [US1] Unit tests for richBodyToPlainText in apps/web/tests/unit/articles/rich-html.test.ts"
Task: "T006 [US1] Card summary tests in apps/web/tests/unit/articles/article-card-summary.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete US1 (T005–T008).
3. **Validate**: the latest stories list shows no tags.
4. Demo if ready.

### Incremental Delivery

1. Setup + Foundational → shared pieces ready.
2. Add US1 (cards) → validate → demo.
3. Add US2 (heading) → validate.
4. Add US3, US4, US5 (toolbar, links, lists — all P1) → validate each in the editor.
5. Add US6 (loading modal) and US7 (oversized error) → validate.
6. Polish (Phase N) → full suite → quickstart.

---

## Notes

- [P] tasks touch different files and have no dependency on incomplete tasks.
- [Story] labels map each task to a user story in `spec.md` for traceability.
- The image size limit (`ARTICLE_IMAGES_MAX_SIZE` = 10 MiB = `10 * 1024 * 1024` bytes) and allowed formats (JPEG, PNG, WebP) are fixed by data-model.md and are not changed by this feature.
- Server action body limit (`serverActions.bodySizeLimit: "11mb"` in `apps/web/next.config.ts`) stays as is.
- Commit after each task or logical group.

---

## Summary

- **Total tasks**: 34
- **Setup**: 2 (T001–T002)
- **Foundational**: 2 (T003–T004)
- **US1 (card previews)**: 4 (T005–T008)
- **US2 (Editorial desk heading)**: 3 (T009–T011)
- **US3 (sticky toolbar)**: 2 (T012–T013)
- **US4 (link feedback)**: 3 (T014–T016)
- **US5 (lists)**: 2 (T017–T018)
- **US6 (loading modal)**: 5 (T019–T023)
- **US7 (oversized error)**: 7 (T024–T030)
- **Polish**: 4 (T031–T034)

**Parallel opportunities**: 12 tasks are marked [P], and US1, US2, and the test tasks for US6 and US7 can run in parallel across files.

**Independent test per story**: listed under each phase's **Independent Test** line. Each story is verifiable on its own through the e2e or unit checks above.

**Suggested MVP scope**: User Story 1 (T005–T008), the highest-visibility fix with the smallest change.

**Format validation**: All tasks use `- [ ] Txxx [P?] [USx?] Description with file path`. Setup, Foundational, and Polish tasks have no story label, as required. US phase tasks all have a story label.

---

## Implementation Notes

- **T032 (e2e run) and T034 (manual validation) are not done.** The e2e suite needs the dev server and a local Supabase with seeded users. Neither was running in the implementation environment (Supabase did not respond, and port 3000 was closed). The new e2e tests were written but have not been executed.
- **T002**: the site header is not sticky, so the toolbar uses `top: 0`. No header height measurement was needed.
- **T009/T010**: "Editorial desk" is the `<h1>` on both pages, styled with the large display title. The old page title ("Write a story" / "Edit story") is now a plain description paragraph, not an `<h2>`. This changed the plan in research R8.
- **T018**: list markers are checked on the article preview page, which uses the same `.story__body` markup as the public article. The public article spec was not changed.
- **T027**: the cover-image size message also gets the "This image is X MiB." suffix, because it shares `validateImageFile`. The existing cover test still passes unchanged.
- **T028/T029**: the client checks size before uploading, so a file over the limit never reaches the server. The catch around the upload only handles unexpected failures and shows a generic message. Server-side size errors still come back through `result.error`.
