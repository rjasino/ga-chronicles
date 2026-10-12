# Tasks: Site-Wide UI Consistency

**Input**: Design documents from `/specs/007-tailwind-ui-consistency/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ui-components.md, quickstart.md

**Tests**: Included. Constitution Principle II requires automated tests for every change, and plan.md lists unit, e2e, accessibility, and visual checks.

**Organization**: Tasks are grouped by user story (US1 buttons, US2 form fields, US3 whole-site layout, US4 light/dark, legibility, and matte finish) so each story can be implemented and verified independently.

**Ordering rule**: The visual baseline (T002–T003) must be captured on the unmodified code, before any styling change. Legacy CSS rules are removed only after every page that uses them has migrated (T029, T051, T066).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different files, no dependency on an incomplete task
- **[Story]**: US1, US2, US3, or US4
- Exact file paths in every description. All paths are relative to `apps/web/` unless noted.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Capture the pre-migration baseline and prepare the Tailwind toolchain

- [X] T001 [P] Read the Next.js CSS guide at `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` before writing styling code (required by `apps/web/AGENTS.md`)
- [X] T002 [P] Create `apps/web/tests/e2e/visual-consistency.spec.ts` with screenshot checks for `/`, `/articles/a-new-chapter-for-independent-games`, `/sign-in`, `/sign-up`, `/account/password`, `/admin/articles/new`, `/admin/moderation`, and `/admin/users`, in light and dark (`data-theme` set via the theme toggle), at 390 px and 1440 px, masking the dynamic article date and comment timestamps
- [X] T003 Capture the pre-migration baseline by running `npx playwright test tests/e2e/visual-consistency.spec.ts --update-snapshots` in `apps/web/` against the unmodified code (depends on T002)
- [X] T004 Install the Tailwind toolchain with `npm install -D tailwindcss@^4.3 @tailwindcss/postcss@^4.3` in `apps/web/`, updating `apps/web/package.json` and `apps/web/package-lock.json` (depends on T003)
- [X] T005 Create `apps/web/postcss.config.mjs` exporting a PostCSS config with the `@tailwindcss/postcss` plugin (depends on T004)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tailwind and the shared token layer that every story depends on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Update `apps/web/src/app/globals.css`: keep the existing Google Fonts `@import` as the first rule, then add `@import "tailwindcss";` and `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` so dark styles follow the `data-theme` attribute (depends on T005)
- [X] T007 Update `apps/web/src/app/globals.css`: add the `--success` token to `:root` (candidate `#2e6b4f`) and `[data-theme="dark"]` (candidate `#7fd1a3`), and add an `@theme inline` block that maps the existing tokens (`--blue`, `--blue-hover`, `--red`, `--yellow`, `--white`, `--ink`, `--muted`, `--line`, `--paper`, `--card`, `--field-line`, `--danger-bg`, `--danger-ink`, `--success`, `--success-bg`, `--success-ink`, `--success-line`, `--notice-bg`, `--on-brand`) to Tailwind color names. Quote the data-model rules verbatim: "Yellow never fills a button or field (FR-008)" and "must pass the project contrast target as text on its surface in both appearances". Final hex values are confirmed in T069 (depends on T006)
- [X] T008 [P] Create `apps/web/src/components/ui/cn.ts` exporting `cn(...classes)`, which joins class strings and drops falsy values (no extra dependency, per research.md §4)
- [X] T009 Run `npm run typecheck` and `npm run build` in `apps/web/` and confirm the build compiles with the Tailwind PostCSS plugin active (depends on T006, T007)

**Checkpoint**: Foundation ready. Tokens resolve in both appearances and the build is green.

---

## Phase 3: User Story 1 - Every button looks and behaves like one system (Priority: P1) 🎯 MVP

**Goal**: Every button on the site belongs to one of five purposes (primary, secondary, error, success, text), and the same purpose looks identical on every page.

**Independent Test**: Visit the sign-in, sign-up, password, article editor, moderation, and people pages. Confirm every button maps to one purpose and the same purpose looks identical across pages.

### Tests for User Story 1

> **NOTE: Write these tests first and confirm they fail before implementation**

- [X] T010 [P] [US1] Vitest tests in `apps/web/tests/unit/ui/button.test.tsx`: each purpose renders its purpose class, `purpose` defaults to `secondary`, `pending` disables the button, native props (`type`, `name`, `value`, `aria-pressed`, `onClick`) pass through, and `ButtonLink` renders an anchor with the same purpose classes
- [X] T011 [P] [US1] Playwright tests in `apps/web/tests/e2e/button-consistency.spec.ts`: computed background of "Publish" is the blue primary fill, "Remove comment" and "Remove article" are the red error fill, "Save draft" is transparent with a blue outline, and "Sign out" has no fill

### Implementation for User Story 1

- [X] T012 [US1] Create `apps/web/src/components/ui/button.tsx` exporting `Button` (purposes `primary`, `secondary`, `error`, `success`, `text`; sizes `default` and `toolbar`; `pending` prop; `active` prop for toolbar toggles) and `ButtonLink` (anchor with the same purpose classes, for "Write an article" and "Create internal account"). Quote the contract verbatim: "Height is at least 44 px at the `default` size on touch-sized screens (FR-013)". Update `specs/007-tailwind-ui-consistency/contracts/ui-components.md` to document `ButtonLink` and `active` (depends on T008, T009)
- [X] T013 [P] [US1] Update `apps/web/src/app/sign-in/page.tsx`: "Continue with Google" uses `<Button purpose="secondary">` (depends on T012)
- [X] T014 [P] [US1] Update `apps/web/src/components/auth/auth-form.tsx`: "Sign in" uses `<Button purpose="primary">` and keeps its "Signing in…" pending label (depends on T012)
- [X] T015 [P] [US1] Update `apps/web/src/components/auth/sign-up-form.tsx`: "Create account" uses `<Button purpose="primary">` with its pending label (depends on T012)
- [X] T016 [P] [US1] Update `apps/web/src/components/auth/password-change-form.tsx`: "Update password" uses `<Button purpose="primary">` (depends on T012)
- [X] T017 [P] [US1] Update `apps/web/src/components/articles/article-editor.tsx`: "Save draft" uses `<Button purpose="secondary">` and "Publish" uses `<Button purpose="primary">`, both keeping `name="intent"` and `value` (depends on T012)
- [X] T018 [P] [US1] Update `apps/web/src/components/comments/comment-form.tsx`: "Post comment" uses `<Button purpose="primary">` (depends on T012)
- [X] T019 [P] [US1] Update `apps/web/src/components/moderation/review-queue.tsx`: "Remove comment" and "Remove article" use `<Button purpose="error">`, keeping their pending labels and `name` attributes (depends on T012)
- [X] T020 [P] [US1] Update `apps/web/src/components/comments/comment-section.tsx`: "Report" uses `<Button purpose="text">` (depends on T012)
- [X] T021 [P] [US1] Update `apps/web/src/components/site-header.tsx`: "Sign out" uses `<Button purpose="text">`, keeping the sign-out form action (depends on T012)
- [X] T022 [P] [US1] Update `apps/web/src/components/admin/people-filters.tsx`: "Apply filters" uses `<Button purpose="secondary" type="submit">` (depends on T012)
- [X] T023 [P] [US1] Update `apps/web/src/components/admin/people-sort.tsx`: "Sort" uses `<Button purpose="secondary" type="submit">` (depends on T012)
- [X] T024 [P] [US1] Update `apps/web/src/components/admin/role-assignment-form.tsx`: "Save roles" uses `<Button purpose="secondary">` (depends on T012)
- [X] T025 [P] [US1] Update `apps/web/src/components/admin/new-account-form.tsx`: "Create account" uses `<Button purpose="primary">` (depends on T012)
- [X] T026 [P] [US1] Update `apps/web/src/components/moderation/comment-settings-form.tsx`: "Save settings" uses `<Button purpose="primary">` (depends on T012)
- [X] T027 [P] [US1] Update `apps/web/src/app/admin/users/page.tsx`: "Create internal account" uses `<ButtonLink purpose="primary" href="/admin/users/new">` (depends on T012)
- [X] T028 [P] [US1] Update `apps/web/src/app/admin/articles/page.tsx`: "Write an article" uses `<ButtonLink purpose="primary" href="/admin/articles/new">` (depends on T012)
- [X] T029 [US1] Update `apps/web/src/features/articles/richtext/editor.tsx`: toolbar controls use `<Button size="toolbar" active={active} aria-pressed={active}>`, keeping their `aria-label` values. Depends on T012, and on the rich-text editor not being changed by another task in this phase
- [X] T030 [US1] Retire legacy button rules from `apps/web/src/app/globals.css` (`.nav-button`, `.button-text`, `.form-stack button`, `.review-item button`, `.button-link`, `.form-stack .button-secondary`, `.role-form .button-secondary`, `.role-form button`, `.rich-button*`). Run only after T013–T029, so no button loses its style during the migration (depends on T013–T029)

**Checkpoint**: User Story 1 works independently. Every button has one purpose and the e2e button tests pass.

---

## Phase 4: User Story 2 - Form fields look and behave the same everywhere (Priority: P1)

**Goal**: Text fields, text areas, dropdowns, and checkboxes share one appearance and one state set, and every form message uses one shared style and placement.

**Independent Test**: Open sign-in, sign-up, password change, article editor, comment form, and people filters. Confirm each field, dropdown, and checkbox has the same focus and error treatment, and each message uses the same placement and style.

### Tests for User Story 2

> **NOTE: Write these tests first and confirm they fail before implementation**

- [X] T031 [P] [US2] Vitest tests in `apps/web/tests/unit/ui/text-field.test.tsx`: `label` wraps the input (accessible name from the label), `hint` renders, `error` sets `aria-invalid="true"` and links the message with `aria-describedby`, `disabled` passes through, and `TextArea` and `Select` follow the same contract
- [X] T032 [P] [US2] Vitest tests in `apps/web/tests/unit/ui/checkbox.test.tsx`: the label wraps the native checkbox so clicking its text toggles it, `name`, `value`, and `defaultChecked` pass through
- [X] T033 [P] [US2] Vitest tests in `apps/web/tests/unit/ui/message.test.tsx`: `error` renders `role="alert"`, `success` and `notice` render `role="status"`, the `role` prop can override the default, and the `form-error` and `form-success` hook classes are present
- [X] T034 [P] [US2] Playwright tests in `apps/web/tests/e2e/field-consistency.spec.ts`: the focus outline on the sign-in username field matches the outline on the people-filter search field, and a sign-in error message is linked to its field and rendered before the submit button

### Implementation for User Story 2

- [X] T035 [P] [US2] Create `apps/web/src/components/ui/text-field.tsx` exporting `TextField`, `TextArea`, and `Select` per the contract. Quote the state rule verbatim: "Disabled and pending buttons cannot be activated" applies to the same states here; fields use the default, hover, focus, filled, invalid, and disabled states from data-model.md (depends on T008, T009)
- [X] T036 [P] [US2] Create `apps/web/src/components/ui/checkbox.tsx` exporting `Checkbox` per the contract (depends on T008, T009)
- [X] T037 [P] [US2] Create `apps/web/src/components/ui/message.tsx` exporting `Message` with tones `error`, `success`, and `notice` per the contract. Keep the `form-error` and `form-success` hook classes (depends on T008, T009)
- [X] T038 [US2] Update `apps/web/src/components/auth/auth-form.tsx`: username and password use `TextField` with the shared label, and the error uses `<Message tone="error">` (depends on T014, T035, T037)
- [X] T039 [US2] Update `apps/web/src/app/sign-in/page.tsx`: the OAuth error uses `<Message tone="error">` (depends on T013, T037)
- [X] T040 [US2] Update `apps/web/src/components/auth/sign-up-form.tsx`: fields use `TextField` with `hint` for the password rule, and the error uses `<Message tone="error">` (depends on T015, T035, T037)
- [X] T041 [US2] Update `apps/web/src/components/auth/password-change-form.tsx`: new and confirm password use `TextField`, and the error and success use `Message` (depends on T016, T035, T037)
- [X] T042 [US2] Update `apps/web/src/components/articles/article-editor.tsx`: title, slug, and type use `TextField` or `Select`, the body label uses the shared label style, and the error and success use `Message`. The cover image file input is styled with the shared field tokens (depends on T017, T035, T037)
- [X] T043 [US2] Update `apps/web/src/components/comments/comment-form.tsx`: the comment body uses `TextArea`, and the error and success use `Message` (depends on T018, T035, T037)
- [X] T044 [US2] Update `apps/web/src/components/moderation/comment-settings-form.tsx`: "Allow new comments" uses `Checkbox`, the threshold uses `TextField` with `type="number"`, and the error and success use `Message` (depends on T026, T035, T036, T037)
- [X] T045 [US2] Update `apps/web/src/components/admin/new-account-form.tsx`: username, email, and temporary password use `TextField` (password keeps its hint), roles use `Checkbox`, and the error and success use `Message` (depends on T025, T035, T036, T037)
- [X] T046 [US2] Update `apps/web/src/components/admin/role-assignment-form.tsx`: contributor and moderator use `Checkbox`, and the error and success use `Message` (depends on T024, T036, T037)
- [X] T047 [US2] Update `apps/web/src/components/admin/people-filters.tsx`: search uses `TextField`, role and status use `Select` (depends on T022, T035)
- [X] T048 [US2] Update `apps/web/src/components/admin/people-sort.tsx`: sort by and order use `Select` (depends on T023, T035)
- [X] T049 [US2] Update `apps/web/src/components/moderation/review-queue.tsx` and `apps/web/src/components/comments/comment-section.tsx`: inline `role="alert"` and `role="status"` spans use `Message` placed after the button (depends on T019, T020, T037)
- [X] T050 [US2] Retire legacy field and message rules from `apps/web/src/app/globals.css` (`.form-stack input/textarea/select`, `.people-filters__field *`, `.people-sort__field select`, `.check-label*`, `.field-label`, `.form-error`, `.form-success`, `.field-hint`). Run only after T038–T049 (depends on T038–T049)

**Checkpoint**: User Story 2 works independently. Fields, checkboxes, and messages match across forms, and the field e2e tests pass.

---

## Phase 5: User Story 3 - The whole site shares one layout and component language (Priority: P2)

**Goal**: Every page uses the same header, footer, page width, section headings, cards, lists, tables, empty states, pagination, and status styling.

**Independent Test**: Visit the home page, an article, sign-in, the editor, moderation, and the people list. Confirm the header, footer, and page width are identical, and that empty states, lists, and pagination follow the same style.

### Tests for User Story 3

> **NOTE: Write these tests first and confirm they fail before implementation**

- [ ] T051 [P] [US3] Playwright tests in `apps/web/tests/e2e/layout-consistency.spec.ts`: the `.site-header` and `.site-footer` bounding boxes are equal on `/` and `/articles/a-new-chapter-for-independent-games`; `.page-shell` width is the same on home, article, and sign-in; the empty state on the comment section uses the shared empty-state style; pagination is styled and keyboard-focusable

### Implementation for User Story 3

- [X] T052 [P] [US3] Update `apps/web/src/components/site-footer.tsx` with Tailwind utilities for layout, social links, and text. Keep the `site-footer__*` hook classes (depends on T009)
- [X] T053 [P] [US3] Update `apps/web/src/components/theme-toggle.tsx` with Tailwind utilities for track, thumb, and text. Keep `aria-pressed` and the `theme-toggle*` hook classes (depends on T009)
- [X] T054 [US3] Update `apps/web/src/components/site-header.tsx` layout, brand, and navigation with Tailwind utilities, keeping the `site-header`, `brand`, and `brand__logo` hook classes. Depends on T021 (same file)
- [X] T055 [P] [US3] Update `apps/web/src/app/page.tsx`: masthead, motto, section heading, and empty state use Tailwind utilities, keeping the `masthead*`, `section-heading`, and `empty-state` hook classes (depends on T009)
- [X] T056 [P] [US3] Update `apps/web/src/components/articles/article-card.tsx` with Tailwind utilities for the card, image, fallback, and summary. Keep `article-card*` hook classes (depends on T009)
- [X] T057 [US3] Update `apps/web/src/components/articles/article-content.tsx`: header, byline and read-time row, cover, and rich body typography (headings, lists, blockquote, links, images) use Tailwind utilities. Keep `story__body`, `story__byline`, `story__read-time`, and `story__meta` hook classes (depends on T009)
- [X] T058 [US3] Update `apps/web/src/components/comments/comment-section.tsx` comment list, comment items, and comments-off notice with Tailwind utilities. Depends on T049 (same file)
- [X] T059 [US3] Update `apps/web/src/components/moderation/review-queue.tsx` review items and state line with Tailwind utilities. Depends on T049 (same file)
- [X] T060 [P] [US3] Update `apps/web/src/components/admin/pagination.tsx` with Tailwind utilities for summary, list, items, and the current-page state (`aria-current`), keeping `pagination*` hook classes (depends on T009)
- [X] T061 [P] [US3] Update `apps/web/src/components/admin/people-list.tsx` with Tailwind utilities for rows, name, email, status, and roles, keeping `people-row*` hook classes (depends on T009)
- [X] T062 [US3] Update the admin list and page layout in `apps/web/src/app/admin/articles/page.tsx` and `apps/web/src/app/admin/users/page.tsx` with Tailwind utilities for `admin-page`, `section-heading`, and `admin-list`. Depends on T027 and T028 (same files)
- [X] T063 [US3] Update `apps/web/src/app/admin/moderation/page.tsx` admin layout and published-articles list with the same utilities. Depends on T009
- [X] T064 [P] [US3] Update `apps/web/src/app/sign-up/page.tsx`, `apps/web/src/app/account/password/page.tsx`, and `apps/web/src/app/not-found.tsx` with Tailwind utilities for auth page shell, auth panel, and not-found layout (depends on T009)
- [X] T065 [P] [US3] Update `apps/web/src/app/admin/articles/[id]/preview/page.tsx` preview notice with the `notice` message tone (depends on T037)
- [ ] T066 [US3] Update `apps/web/src/features/articles/richtext/editor.tsx` content area and toolbar layout with Tailwind utilities, keeping the `rich-editor*` and `rich-toolbar*` hook classes. Depends on T029 (same file)
- [ ] T067 [US3] Retire legacy layout rules from `apps/web/src/app/globals.css` (`.site-header*`, `.brand*`, `.masthead*`, `.latest`, `.section-heading*`, `.article-grid`, `.article-card*`, `.empty-state`, `.story*`, `.auth-*`, `.admin-*`, `.people-*`, `.pagination*`, `.comment-*`, `.review-*`, `.rich-editor*`, `.rich-toolbar*`, `.preview-notice`, `.comments-off`, `.not-found*`, `.text-link`, `.site-footer*`). Keep tokens, the dark variant, base rules, and the reduced-motion block. Run only after T052–T066 (depends on T052–T066)

**Checkpoint**: User Story 3 works independently. Layout and components match across pages and the layout e2e tests pass.

---

## Phase 6: User Story 4 - Every element stays legible and usable in light and dark appearances (Priority: P2)

**Goal**: Every element keeps its legibility, focus indicator, and state feedback in both appearances, with a matte finish.

**Independent Test**: Toggle between light and dark on each main page type. Confirm every element is legible, focus and state indicators are visible, and no element has gloss, gradient, or glow effects.

### Tests for User Story 4

- [ ] T068 [P] [US4] Extend `apps/web/tests/e2e/accessibility.spec.ts` with an axe check (WCAG 2.2 A and AA tags, same as existing tests) for the article, sign-in with an error message, moderation, people list, and article editor, each in light and dark. Write before T069 so failures show the contrast gaps (depends on T067)

### Implementation for User Story 4

- [ ] T069 [US4] Run `npx playwright test tests/e2e/visual-consistency.spec.ts` and `tests/e2e/accessibility.spec.ts` in `apps/web/`, then tune the token values in `apps/web/src/app/globals.css` (`--success`, `--success-ink`, `--muted`, `--danger-ink`) to pass the contrast target in both appearances. Record the final values in `specs/007-tailwind-ui-consistency/data-model.md` (depends on T068)
- [ ] T070 [US4] Review the visual diff for each page in `apps/web/tests/e2e/visual-consistency.spec.ts-snapshots/` in both appearances at 390 px and 1440 px. Accept intended differences (preflight spacing, button and field styling) and fix unintended breaks. Record accepted and fixed items in `specs/007-tailwind-ui-consistency/visual-review.md` (depends on T067)
- [ ] T071 [US4] Matte finish audit: search `apps/web/src/` and `apps/web/src/app/globals.css` for `box-shadow`, `text-shadow`, `gradient`, `drop-shadow`, and `backdrop-filter`, and remove any found, except the focus outline. Quote the rule: "no gloss, gradients, glow effects, or heavy shadows (FR-010)" (depends on T067)
- [ ] T072 [US4] Verify focus indicators and disabled and pending states in both appearances for the shared elements in `apps/web/src/components/ui/button.tsx`, `apps/web/src/components/ui/text-field.tsx`, and `apps/web/src/components/ui/checkbox.tsx`. Confirm the yellow `--yellow` focus outline is visible on each surface (depends on T012, T035, T036, T069)

**Checkpoint**: User Story 4 works independently. Every element passes contrast and focus checks in both appearances, with a matte finish.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Final checks across all stories

- [ ] T073 [P] Verify test hooks still exist: for every class listed in `specs/007-tailwind-ui-consistency/research.md` §5, confirm it appears in markup under `apps/web/src/` (grep). Fix any removed hook (depends on T067)
- [X] T074 [P] Run `npm run typecheck`, `npm run lint`, and `npm run test:unit` in `apps/web/`, and fix any issues in changed files (depends on T067)
- [ ] T075 Run `npm run test:e2e` and `npm run test:a11y` in `apps/web/`. All existing e2e tests must pass unchanged, and the new visual, button, field, layout, and accessibility checks must pass (depends on T074)
- [X] T076 [P] Run `npm audit` in `apps/web/` and record the result for the new dev dependencies `tailwindcss` and `@tailwindcss/postcss` (Constitution IV)
- [ ] T077 Performance benchmark: build with `npm run build`, start the production server on a free port (port 3000 is currently in use by an unrelated `next start` process, PID 4160), run `PERFORMANCE_BASE_URL=http://127.0.0.1:<port> npm run performance`, and compare to `docs/operations/performance-baseline.md`. Also record the size of the generated CSS in `.next/static/` before and after. Record LCP, CLS, and CSS size in the PR description (Constitution V, depends on T075)
- [ ] T078 [P] Sync `specs/007-tailwind-ui-consistency/contracts/ui-components.md` with the implemented API (`ButtonLink`, `Button` `active`, file input styling) (depends on T072)
- [ ] T079 Run the validation steps in `specs/007-tailwind-ui-consistency/quickstart.md` end to end (depends on T075, T077)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T002–T003 must run before any styling change.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories.
- **User Stories (Phases 3–6)**: All depend on Foundational. US1 is the MVP. US2 depends on US1 for the same files (`auth-form.tsx`, `sign-in/page.tsx`, and others). US3 depends on US1 and US2 for shared files. US4 verifies everything.
- **Polish (Phase N)**: Depends on all user stories.

### Within Each User Story

- Tests are written first and fail before implementation.
- Shared elements (`ui/*`) before pages that use them.
- Legacy CSS removal only after every page that uses the rule has migrated (T030, T050, T067).

### Parallel Opportunities

- Setup: T001 and T002 in parallel.
- Foundational: T008 in parallel with T006–T007.
- US1: T010 and T011 in parallel. T013–T028 are in different files and can run in parallel once T012 completes.
- US2: T031–T034 in parallel. T035–T037 in parallel. T038–T049 are in different files and can run in parallel after their dependencies.
- US3: T052, T053, T055, T056, T060, T061, T064, T065 in parallel.
- Polish: T073, T074, T076 in parallel.

---

## Parallel Example: User Story 1

```bash
# Tests in parallel:
Task: "T010 Vitest tests in apps/web/tests/unit/ui/button.test.tsx"
Task: "T011 Playwright tests in apps/web/tests/e2e/button-consistency.spec.ts"

# After T012 (Button component), these are in different files:
Task: "T014 apps/web/src/components/auth/auth-form.tsx"
Task: "T018 apps/web/src/components/comments/comment-form.tsx"
Task: "T019 apps/web/src/components/moderation/review-queue.tsx"
Task: "T022 apps/web/src/components/admin/people-filters.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (capture the visual baseline first)
2. Complete Phase 2: Foundational (Tailwind, dark variant, tokens)
3. Complete Phase 3: US1 (buttons)
4. **STOP and VALIDATE**: button e2e tests and a visual check of the button pages

### Incremental Delivery

1. Setup + Foundational → build green
2. US1 buttons → test → review
3. US2 fields and messages → test → review
4. US3 layout and components → test → review
5. US4 contrast, focus, and matte review → test
6. Polish, benchmark, and merge

---

## Notes

- [P] tasks touch different files and have no dependencies on incomplete tasks
- [Story] labels map each task to its user story for traceability
- Files edited by more than one task (`site-header.tsx`, `comment-section.tsx`, `review-queue.tsx`, `auth-form.tsx`, `sign-in/page.tsx`, `richtext/editor.tsx`, and others) are sequenced by their dependencies, not marked [P]
- Commit after each task or logical group
- Stop at any checkpoint to validate that story independently
