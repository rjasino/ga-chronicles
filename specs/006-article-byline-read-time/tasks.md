# Tasks: Article Author Byline and Read Time

**Input**: Design documents from `/specs/006-article-byline-read-time/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/article-byline-contract.md, quickstart.md

**Tests**: Included. Constitution Principle II requires unit, integration, and automated tests for every change, and plan.md lists them.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every description

## Path Conventions

- Web app: `apps/web/src/`, `apps/web/tests/`
- Database: `supabase/migrations/`, `supabase/tests/database/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the environment and check the framework docs before writing code

- [X] T001 [P] Read the Next.js 16 guides for async page `params` and server components in `apps/web/node_modules/next/dist/docs/01-app/` before writing any code (required by `apps/web/AGENTS.md`)
- [X] T002 Establish a green baseline: run `npm run typecheck` and `npm run test:unit` in `apps/web/`, then `npx supabase start` and `npx supabase test db` at the repo root (per `specs/006-article-byline-read-time/quickstart.md`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Resolve the open decision that affects the byline view definition

**CRITICAL**: The byline view (US1) must not be written until this is resolved

- [X] T003 Check whether `public.accounts` has an active or disabled column in `supabase/migrations/0001_core_schema.sql`, and record the decision in the section "2. Byline display rule" of `specs/006-article-byline-read-time/research.md` (the plan assumes no status filter)

**Checkpoint**: Foundation ready. User story work can begin.

---

## Phase 3: User Story 1 - Reader sees who wrote the article (Priority: P1) 🎯 MVP

**Goal**: Each published article page shows "By {display name or username}", or "By Game Ako Chronicles staff" when no author resolves.

**Independent Test**: Open any published article and confirm a labeled author line names the author. No other part of the page changes.

### Tests for User Story 1

> **NOTE: Write these tests first and confirm they fail before implementation**

- [X] T004 [P] [US1] pgTAP test in `supabase/tests/database/article-bylines.test.sql`: `anon` can select from `public_article_bylines`; the view's columns are exactly `article_id`, `display_name`, `username`; draft and removed articles produce no rows
- [X] T005 [P] [US1] Vitest test in `apps/web/tests/unit/articles/article-content.test.tsx`: byline shows the display name when set; shows the username when `displayName` is null; shows "By Game Ako Chronicles staff" when `byline` is null

### Implementation for User Story 1

- [X] T006 [US1] Create migration `supabase/migrations/0009_article-bylines.sql` defining `public.public_article_bylines` with the columns `article_id`, `display_name`, `username`. Quote the data-model constraints verbatim: "Inner join `articles` to `accounts` on `author_id`", "Filter `articles.status = 'published'`", "Grant `select` to `anon` and `authenticated`", "The view is read-only. No insert, update, or delete grants." Follow the `public_comments` view pattern in `supabase/migrations/0004_comments-and-reports.sql`
- [X] T007 [US1] Add `ArticleByline` type and `getArticleByline(articleId)` to `apps/web/src/features/articles/queries.ts` per the application contract: returns `null` when no row exists; throws `Error("Could not load this article's author.", { cause: error })` on query error
- [X] T008 [US1] Update `apps/web/src/app/articles/[slug]/page.tsx` to fetch the byline in the existing `Promise.all` alongside comments and session, then pass `byline` to `ArticleContent`
- [X] T009 [US1] Update `apps/web/src/components/articles/article-content.tsx` to accept a `byline: ArticleByline | null` prop and render `<p className="story__byline">By {displayName ?? username}</p>` inside `story__header`, falling back to "By Game Ako Chronicles staff" when `byline` is null
- [X] T010 [US1] Add a byline assertion to `apps/web/tests/e2e/public-articles.spec.ts` that the published article page contains text starting with "By "

**Checkpoint**: User Story 1 works independently. Readers see the author on every published article.

---

## Phase 4: User Story 2 - Reader sees how long the article takes to read (Priority: P1)

**Goal**: Each published article shows "{N} min read", where N is a whole number of at least 1.

**Independent Test**: Open articles of different lengths and confirm each shows a read time, and the longer article shows a value greater than or equal to the shorter one.

### Tests for User Story 2

> **NOTE: Write these tests first and confirm they fail before implementation**

- [X] T011 [P] [US2] Vitest test in `apps/web/tests/unit/articles/read-time.test.ts` covering `estimateReadMinutes`: empty body returns 1; image-only body returns 1; markup-only body returns 1; legacy plain text is counted directly; markup and `<img>` alt text add no words; 200 words returns 1; 201 words returns 2; longer text never returns less than shorter text
- [X] T012 [US2] Extend `apps/web/tests/unit/articles/article-content.test.tsx` (same file as T005, so run after it) to assert the rendered text "{readMinutes} min read"

### Implementation for User Story 2

- [X] T013 [P] [US2] Create `apps/web/src/features/articles/read-time.ts` exporting `estimateReadMinutes(body: string): number`. Quote the data-model rules verbatim: "`max(1, ceil(N / 200))`", "Markup and image elements contribute no words", "Output is always a positive integer." Reuse `isPlainTextBody` from `apps/web/src/features/articles/richtext/rich-html.ts` for legacy detection
- [X] T014 [US2] Update `apps/web/src/app/articles/[slug]/page.tsx` to compute `readMinutes = estimateReadMinutes(article.body)` and pass it to `ArticleContent` (depends on T008 and T013)
- [X] T015 [US2] Update `apps/web/src/components/articles/article-content.tsx` to accept a `readMinutes: number` prop and render `<p className="story__read-time">{readMinutes} min read</p>` in `story__header` (depends on T009)
- [X] T016 [US2] Add a read time assertion to `apps/web/tests/e2e/public-articles.spec.ts` that the page contains "min read" (depends on T010)

**Checkpoint**: User Stories 1 and 2 both work independently. Readers see the author and the read time.

---

## Phase 5: User Story 3 - Byline and read time read well on every screen (Priority: P2)

**Goal**: The byline and read time appear together in one compact, legible row that fits phone and desktop widths in light and dark appearances, and is announced in order.

**Independent Test**: View an article at phone and desktop widths in both themes. Confirm both items are visible and readable, nothing overflows horizontally, and accessibility checks report no violations.

### Tests for User Story 3

- [X] T017 [US3] Update `apps/web/tests/unit/articles/article-content.test.tsx` to assert that byline and read time are both inside one `.story__meta` element, in that order (depends on T012)
- [X] T018 [US3] Add a phone-width check to `apps/web/tests/e2e/responsive-branding.spec.ts`: on the public article page at about 375px, `document.documentElement.scrollWidth` is not greater than `clientWidth`, and the byline and read time are visible
- [X] T019 [P] [US3] Add the article page (`/articles/a-new-chapter-for-independent-games`) to the axe checks in `apps/web/tests/e2e/accessibility.spec.ts` for both light and dark themes, asserting zero violations

### Implementation for User Story 3

- [X] T020 [US3] Update `apps/web/src/components/articles/article-content.tsx` to group byline and read time in one `<p className="story__meta">` containing `<span className="story__byline">` then `<span className="story__read-time">`. Use a CSS separator, not text, so screen readers hear "By {name}" then "{N} min read" (depends on T015)
- [X] T021 [US3] Add `.story__meta` styles in `apps/web/src/app/globals.css` using existing light and dark color tokens and a wrapping flex row, so the line never causes horizontal overflow at phone widths and meets the project contrast target in both themes

**Checkpoint**: All user stories are independently functional and presented consistently.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Final checks across all stories

- [X] T022 [P] Run `npm run typecheck`, `npm run lint`, and `npm run format` in `apps/web/`, and fix any issues in the changed files
- [ ] T023 Run `npm run performance` and compare the article page results to `docs/operations/performance-baseline.md`; record the result for the PR description (Principle V)
- [X] T024 Run the validation steps in `specs/006-article-byline-read-time/quickstart.md` end to end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup. Blocks US1's view migration (T006)
- **User Stories (Phase 3+)**: Depend on Foundational
- **Polish (Phase N)**: Depends on all user stories

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational. No dependency on other stories
- **US2 (P1)**: Shares `page.tsx`, `article-content.tsx`, and `public-articles.spec.ts` with US1, so it runs after US1's edits to those files (T008, T009, T010). Its read-time logic (T013) is independent and can be written in parallel with US1
- **US3 (P2)**: Restructures the header created in US1 and US2 (T020 depends on T015). Run after both

### Within Each User Story

- Tests are written and fail before implementation
- Data (view and helper) before the query and page wiring
- Page wiring before component rendering
- Story checkpoint before the next story

### Parallel Opportunities

- US1 tests: T004 and T005 (different files)
- US2: T011 and T013 (different files), in parallel with US1 work
- US3: T019 in parallel with T018 (different files)
- Polish: T022 is parallel with itself across files; T023 and T024 run after T022 fixes land

---

## Parallel Example: User Story 1 and User Story 2 (read-time logic)

```bash
# Different files, can run in parallel:
Task: "T004 pgTAP test in supabase/tests/database/article-bylines.test.sql"
Task: "T013 Create apps/web/src/features/articles/read-time.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (T003)
3. Complete Phase 3: US1 (T004 to T010)
4. **STOP and VALIDATE**: Open a published article and confirm the author line

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add US1 (author byline) → test → demo
3. Add US2 (read time) → test → demo. Both are P1, so this completes the core request
4. Add US3 (layout and accessibility polish) → test → release
5. Polish and benchmark before merge

---

## Notes

- [P] tasks touch different files and have no dependencies on incomplete tasks
- [Story] labels map each task to its user story for traceability
- The test file for `ArticleContent` (`article-content.test.tsx`) is shared by US1, US2, and US3, so its tasks run in order
- Commit after each task or logical group
- Stop at any checkpoint to validate that story independently
