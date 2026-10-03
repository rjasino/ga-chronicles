# Tasks: Homepage Branding

**Input**: Design documents from `specs/003-homepage-branding/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`  
**Tests**: Included because the project constitution requires automated verification and the existing responsive/accessibility suites must keep passing.

**Organization**: Tasks are grouped by the three user stories in `spec.md`. Every story phase includes its goal and an independent verification criterion. No foundational phase is required because the feature is a presentation-only change to existing components (confirmed by `data-model.md`); setup is a single asset/environment check.

## Format

`- [ ] T### [P?] [US#?] Description with file path`

- `[P]` appears only where the task can be done independently in separate files.
- `[US#]` is required for user-story tasks and omitted for setup and polish tasks.
- Tasks are ordered by execution dependency; tests are defined before the implementation they verify.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the brand asset and environment for a presentation-only change.

- [X] T001 Confirm the transparent neon GA logo asset is present and served at `apps/web/public/brand/neon-GA-trans-01.png` (no asset copy or new dependency required; verify it loads via `/brand/neon-GA-trans-01.png` in the running app).

---

## Phase 2: User Story 1 — Visitor recognizes the Game Ako brand on the home page (Priority: P1) — MVP

**Goal**: The home hero shows the channel motto `#fortheloveofgaming`, the right-side visual is the transparent neon GA logo, and the header reads the full "Game Ako Chronicles" wordmark.

**Independent Test**: Open the home page at 1280 px and 390 px; the motto line and neon GA logo render in the hero, the header wordmark is complete, and there is no horizontal overflow.

### Tests for User Story 1

- [X] T002 [P] [US1] Extend `apps/web/tests/e2e/responsive-branding.spec.ts` with home-page assertions: the motto `#fortheloveofgaming` is visible in the hero, the neon GA hero image (`/brand/neon-GA-trans-01.png`) renders, the header shows "Game Ako Chronicles", and `body` scrollWidth equals the viewport width at 390 px and 1280 px.
- [X] T003 [P] [US1] Extend `apps/web/tests/e2e/accessibility.spec.ts` so the home hero's logo is treated as decorative (`alt=""`/no image role announced by axe) and the motto text is reachable; assert no axe violations on the home page.

### Implementation for User Story 1

- [X] T004 [P] [US1] Update `apps/web/src/app/page.tsx`: add the motto brand line `#fortheloveofgaming` inside the hero copy and replace the abstract `GA•` `masthead__mark` div with `next/image` rendering `/brand/neon-GA-trans-01.png` using its intrinsic dimensions, `alt=""`, and `priority`.
- [X] T005 [P] [US1] Update `apps/web/src/components/site-header.tsx`: change the brand text next to the logo from "Chronicles" to the complete wordmark `Game Ako Chronicles`, keeping the logo on the left and the home link/aria-label intact.
- [X] T006 [US1] Update `apps/web/src/app/globals.css` for the new masthead: style the motto as a display-face brand line (not uppercase eyebrow), size the hero logo to fit the right column with responsive stacking at 390 px, and adjust the header wordmark to fit without overflow.

**Checkpoint**: User Story 1 is independently testable — the home page confirms the brand at a glance on desktop and mobile.

---

## Phase 3: User Story 2 — Visitor learns what Game Ako is from the footer (Priority: P1)

**Goal**: Every page's footer explains, in one plain sentence, what Game Ako is and echoes the motto.

**Independent Test**: Open the home page and any other page; the footer shows the description and the motto without layout regression.

### Tests for User Story 2

- [X] T007 [P] [US2] Extend `apps/web/tests/e2e/responsive-branding.spec.ts` (or add a footer case) to assert that the footer on the home page and one article page contains the description and the `#fortheloveofgaming` motto text.

### Implementation for User Story 2

- [X] T008 [US2] Rebuild `apps/web/src/components/site-footer.tsx`: add a one-sentence plain-language description of what Game Ako is and the `#fortheloveofgaming` motto; keep the existing "Play thoughtfully." tagline and the bluesurface identity.
- [X] T009 [US2] Add footer typography/layout in `apps/web/src/app/globals.css` (description line, motto treatment, responsive two-column stacking at 390 px) while preserving the existing muted-on-blue contrast.

**Checkpoint**: User Story 2 is independently testable — the footer carries the "who are you?" context on every page.

---

## Phase 4: User Story 3 — Visitor can reach Game Ako's channels from the footer (Priority: P2)

**Goal**: The footer lists Facebook, YouTube, and Twitch as clearly labeled placeholder links the publisher replaces with real URLs via a single-line edit.

**Independent Test**: Open any page; the footer lists three labeled social entries that are obviously forthcoming and behave as links; editing one `href` to a real URL updates the destination without code changes.

### Tests for User Story 3

- [X] T010 [P] [US3] Add `apps/web/tests/e2e/footer-socials.spec.ts`: assert Facebook, YouTube, and Twitch labels are present as links, each link is marked as forthcoming (so it can never be mistaken for a live-but-wrong channel), and activating a placeholder does not open a broken/wrong destination.

### Implementation for User Story 3

- [X] T011 [US3] Add the three placeholder social links (Facebook, YouTube, Twitch) to `apps/web/src/components/site-footer.tsx`: plainly labeled, a harmless placeholder `href` target, a visible "coming soon" forthcoming treatment, and `rel="noopener noreferrer"` prepared so a single-line edit of each `href` publishes the real URL with no other change.
- [X] T012 [US3] Style the social link row and forthcoming label in `apps/web/src/app/globals.css` (distinct focus state, keyboard-reachable, readable contrast on the blue surface, no overflow at 390 px).

**Checkpoint**: User Story 3 is independently testable — the owner can confirm the placeholder socials and swap in real URLs.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Validate release readiness across stories and the project constitution gates.

- [X] T013 [P] Run `npm --prefix apps/web run lint` and `npm --prefix apps/web run typecheck` and fix all findings in the modified files.
- [X] T014 Run `npm --prefix apps/web run test:e2e` and resolve failures across the extended responsive/accessibility and the new footer specs.
- [X] T015 [P] Run `npm --prefix apps/web run performance` against the home route with the optimized production build and confirm the brand changes did not regress the recorded baseline in `docs/operations/performance-baseline.md`.
- [X] T016 Execute the scenarios in `specs/003-homepage-branding/quickstart.md`, record verified commands/results there, and flag the owner's visual check of the neon GA hero logo (size/placement) since the PNG could not be previewed in this environment.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately; a single asset check with no dependencies.
- **User Stories (Phases 2–4)**: All start after Setup; there is no blocking foundational phase because this is a presentation-only change. US1, US2, and US3 can proceed in parallel when separate contributors are available.
- **Polish (Final Phase)**: Begins after the selected user stories are integrated; responsive/accessibility suites and the performance baseline must re-pass before merge.

### User Story Dependencies

- **US1 (P1)**: Depends only on Setup; the home hero and header are self-contained.
- **US2 (P1)**: Depends only on Setup; the footer description is independent of the hero.
- **US3 (P2)**: Depends only on Setup (its footer file changes are staged after US2's footer rebuild to avoid same-file conflicts in a single-worker flow); the social placeholders are independent of the hero.

### Parallel Opportunities

- Setup: single task; nothing to parallelize.
- US1: T002 and T003 are separate test files; T004/T005 touch different components and can run in parallel before T006's shared CSS.
- US2 and US3 use separate page assertions; T007 and T010 are independent specs.
- Within each story, tests marked `[P]` can be authored before implementation begins.

### Parallel Execution Examples

```text
US1: T002 responsive assertions || T003 axe assertions || T004 page.tsx || T005 site-header.tsx
US2: T007 footer description assertions || T008 site-footer.tsx
US3: T010 social placeholder specs || T011 site-footer.tsx (after T008)
```

## Independent Test Criteria by Story

- **US1**: Home page at 1280 px and 390 px shows the motto, the neon GA hero logo, and the full header wordmark with no horizontal overflow or axe violations.
- **US2**: The footer on the home page and one article page shows the plain-language description and the motto.
- **US3**: The footer lists Facebook, YouTube, and Twitch as clearly forthcoming placeholder links; editing one `href` to a real URL changes the destination with no other edit.

## Implementation Strategy

### Suggested MVP

**US1 alone** is the smallest independent slice — the home hero and header wordmark give the strongest immediate brand signal and are verifiable without the footer. Because the footer answers "who are you?" on every page, **US1 + US2** form the recommended MVP; **US3** (social placeholders) trails as the owner-prepared discovery slice.

### Incremental Delivery

1. Complete Setup (asset check).
2. Deliver US1 and validate the hero/wordmark on desktop + mobile.
3. Deliver US2 and validate the site-wide footer description.
4. Deliver US3 and validate the replaceable social placeholders.
5. Run polish tasks: lint/typecheck, full e2e suite, performance baseline, quickstart validation with the owner's logo visual check.

### Notes

- The `[P]` marker is limited to work in different files with no incomplete dependency.
- All user-story tasks have a story label and are grouped under the matching priority phase.
- Browser tests are included to satisfy the project constitution and should be written before the feature implementation they verify.
- No database, storage, or new dependency work is required; the change is confined to `apps/web` components, one stylesheet, and test specs.