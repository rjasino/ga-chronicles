---
description: "Task list for the Light/Dark Theme Toggle feature"
---

# Tasks: Light/Dark Theme Toggle

**Input**: Design documents from `specs/004-theme-toggle/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/theme-contract.md, quickstart.md

**Tests**: Included. The project constitution (Principle II) requires automated verification, and `plan.md` commits to unit tests for the theme helper/toggle plus Playwright e2e for both-theme behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task includes an exact file path

## Path Conventions

- Web app: repository root is `apps/web/`, source under `apps/web/src/`, tests under `apps/web/tests/`
- Shared styles: `apps/web/src/app/globals.css`
- Shared layout: `apps/web/src/app/layout.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the asset and tooling the plan depends on. No dependency or database setup is required.

- [X] T001 Verify the neon "Game Ako" hero asset is present and served at `apps/web/public/brand/neon-GA-01.png` (confirm the 2424×2424 file exists and resolves at `/brand/neon-GA-01.png`) and confirm Vitest/Playwright configs are runnable via `apps/web/package.json` scripts (`test:unit`, `test:e2e`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The theme helper and the dark token system that User Story 1 and User Story 3 both build on.

**⚠️ CRITICAL**: User Story 1 and User Story 3 cannot begin until this phase is complete. User Story 2 does not depend on it.

- [X] T002 [P] Write the theme helper unit test in `apps/web/tests/unit/theme/theme.test.ts`: assert a valid stored `"light"`/`"dark"` value is returned, a missing/invalid value returns `null`, an inaccessible storage throws no error and returns `null`, and applying a theme sets the root document's theme attribute.
- [X] T003 [P] Implement the theme helper in `apps/web/src/features/theme/theme.ts`: export `type Theme = "light" | "dark"`, `THEME_STORAGE_KEY`, `isTheme(value)`, `readStoredTheme()` (wrapped in try/catch, returns `null` on missing/invalid/unavailable storage), `applyTheme(theme)` (sets `document.documentElement.dataset.theme`), and `persistTheme(theme)` (wrapped in try/catch). Validation rule (from `data-model.md`): only exact `"light"`/`"dark"` are valid; anything else resolves to `light`.
- [X] T004 [P] Add the dark theme token overrides and audit hardcoded light-only colors in `apps/web/src/app/globals.css`: add a `[data-theme="dark"]` block overriding `--blue`, `--red`, `--yellow`, `--white`, `--pink`, `--gold`, `--ink`, `--muted`, `--line`, `--paper` plus `color-scheme: dark`, derived from `docs/neon-GA-01.png` (deep blue-black surface, luminous cyan primary, neon red/yellow/magenta accents); convert hardcoded light-only values (e.g. `.article-card` `background: #fff`, `#9aa5b3` borders, `#fff0f0`/`#edf7f0`/`#fff3c8` state backgrounds) to themeable tokens so both themes render consistently.

**Checkpoint**: The helper is unit-green and both themes are styleable foundation ready. User Story 1 can begin.

---

## Phase 3: User Story 1 - Visitor switches the site between light and dark (Priority: P1) 🎯 MVP

**Goal**: A single, accessible header control switches the entire site between light and dark immediately, with no reload and no loss of position.

**Independent Test**: Load any page, activate the theme control, and confirm the whole page changes to dark and back to light with no reload and preserved scroll; keyboard/assistive tech can identify the control and its state.

### Tests for User Story 1

> Write these first and confirm they fail before implementing.

- [X] T005 [P] [US1] Add toggle component unit test in `apps/web/tests/unit/theme/theme-toggle.test.tsx`: the control renders with an accessible name and an on/off pressed state, activating it flips `document.documentElement` theme between light and dark, and it writes the choice via the theme helper.
- [X] T006 [P] [US1] Create `apps/web/tests/e2e/theme-toggle.spec.ts` asserting the default visit renders the light theme and that activating the control switches `html` to `dark` and back to `light` without a page reload.

### Implementation for User Story 1

- [X] T007 [P] [US1] Create the client toggle component `apps/web/src/components/theme-toggle.tsx` (`"use client"`): render a single labeled button with an accessible name and `aria-pressed` reflecting the current theme; on activation apply and persist the opposite theme via `@/features/theme/theme`; reconcile rendered state to the live document after mount (SSR renders the light default to avoid hydration mismatch).
- [X] T008 [US1] Mount `<ThemeToggle />` inside the navigation in `apps/web/src/components/site-header.tsx` so it is reachable from every page that shares the header.
- [X] T009 [US1] Style the toggle in `apps/web/src/app/globals.css`: visible in both themes, adequate activation target, distinct visible focus state, and no wrapping/overflow in the header at 390 px.
- [X] T010 [US1] Extend `apps/web/tests/e2e/accessibility.spec.ts`: assert the toggle exposes an accessible name and pressed state, and run the axe WCAG 2.1 AA checks on the home and sign-in pages in **both** light and dark themes (zero violations).

**Checkpoint**: User Story 1 is independently functional and testable — the site toggles between light and dark.

---

## Phase 4: User Story 2 - Neon "Game Ako" sign as the home hero visual (Priority: P1)

**Goal**: The home hero's right-hand visual is the neon "Game Ako" sign artwork in both themes, framed and legible on desktop and mobile.

**Independent Test**: Open the home page in both themes and confirm the right-hand visual is `/brand/neon-GA-01.png`, framed and legible, with the motto/headline readable and no horizontal overflow at 390 px.

### Tests for User Story 2

- [X] T011 [P] [US2] Update the hero assertion in `apps/web/tests/e2e/responsive-branding.spec.ts` so `.masthead__mark` is expected to have `src` matching `neon-GA-01\.png` and `alt=""`, and the no-overflow check still passes at 390 px, 768 px, and 1440 px.

### Implementation for User Story 2

- [X] T012 [P] [US2] Update `apps/web/src/app/page.tsx`: render `/brand/neon-GA-01.png` (2424×2424) in the `.masthead__mark` slot via `next/image` with explicit `width`/`height`, `priority`, and `alt=""`.
- [X] T013 [US2] Update the `.masthead__mark` styling in `apps/web/src/app/globals.css` to present the artwork inside an intentional frame/panel (so its dark photographic background reads as deliberate on the light theme) and keep it legible and non-overflowing in both themes at desktop and mobile widths.

**Checkpoint**: User Story 2 is independently testable — the home hero shows the neon "Game Ako" sign artwork in both themes.

---

## Phase 5: User Story 3 - Returning visitor's theme choice is remembered (Priority: P2)

**Goal**: A returning visitor's saved choice is applied on load with no visible flash of the opposite theme; a first-time visitor always sees light regardless of the OS color setting.

**Independent Test**: With dark saved, reload the site and confirm dark is applied with no light frame; with no saved choice on a dark-OS-emulated browser, confirm the site still opens light.

### Tests for User Story 3

> Extends the User Story 1 spec; run after T006/T014 so the file exists.

- [X] T014 [P] [US3] Extend `apps/web/tests/e2e/theme-toggle.spec.ts` with: a first visit under an emulated dark `prefers-color-scheme` still renders light; a chosen theme persists across a reload; and a stored dark theme is applied on load without a visible light frame.

### Implementation for User Story 3

- [X] T015 [US3] Add the no-flash initialization script to `apps/web/src/app/layout.tsx`: a minimal synchronous inline script that reads the stored theme via the fixed key, validates it, and sets `document.documentElement.dataset.theme` before the page paints (defaulting to `light`), wrapped so unavailable storage silently falls back to light with no error.

**Checkpoint**: User Story 3 is independently testable — the choice persists and no wrong-theme flash appears.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate release readiness across stories and the project constitution gates.

- [X] T016 [P] Run `npm --prefix apps/web run lint` and `npm --prefix apps/web run typecheck` and fix all findings in the modified/new files.
- [X] T017 Run `npm --prefix apps/web run test:unit` and `npm --prefix apps/web run test:e2e` and resolve all failures, including the updated accessibility and responsive/branding specs.
- [X] T018 [P] Run `npm --prefix apps/web run performance` against the home route on the production build and confirm no regression against `docs/operations/performance-baseline.md` (LCP ≤ 2.5 s, CLS ≤ 0.1).
- [X] T019 Execute the scenarios in `specs/004-theme-toggle/quickstart.md`, run `npm --prefix apps/web run build`, and record the verified commands/results in `quickstart.md`, including the owner's visual check of the framed neon "Game Ako" hero in both themes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately.
- **Foundational (Phase 2)**: Depends on Setup — **blocks US1 and US3**. US2 is not blocked by it.
- **US1 (Phase 3)**: Depends on Foundational.
- **US2 (Phase 4)**: Depends only on Setup; independent of the theme machinery.
- **US3 (Phase 5)**: Depends on Foundational and on US1's e2e file (T006) existing before T014 extends it.
- **Polish (Phase 6)**: Depends on all selected stories being complete.

### User Story Dependencies

- **US1 (P1)**: After Foundational; no dependency on other stories. **MVP.**
- **US2 (P1)**: After Setup; independent of US1/US3 (shares only `globals.css`, so serialize its CSS edit with US1's).
- **US3 (P2)**: After Foundational and US1 (extends the same e2e spec and relies on the toggle from US1).

### Within Each User Story

- Tests are written and fail before implementation.
- Helper/module before the component that consumes it.
- Component before mounting/styling.
- CSS edits to the shared `globals.css` are serialized across stories (T004 → T009 → T013).

### Parallel Opportunities

- **Setup**: single task.
- **Foundational**: T002–T004 touch separate files and can run in parallel.
- **US1**: T005, T006, T007 touch different files; T008 varies `site-header.tsx`; T009 (`globals.css`) and T010 (`accessibility.spec.ts`) are separate files.
- **US2**: T011 (spec) and T012 (`page.tsx`) are independent; T013 (`globals.css`) serializes after T009.
- **US3**: T014 (spec) and T015 (`layout.tsx`) are different files.
- **Polish**: T016 and T018 are independent.

---

## Parallel Example: User Story 1

```bash
# Tests first (different files):
Task: "Add toggle unit test in apps/web/tests/unit/theme/theme-toggle.test.tsx"
Task: "Create apps/web/tests/e2e/theme-toggle.spec.ts"

# Implementation that can run alongside:
Task: "Create apps/web/src/components/theme-toggle.tsx"

# Then integrate (shared files, sequential):
Task: "Mount <ThemeToggle /> in apps/web/src/components/site-header.tsx"
Task: "Style the toggle in apps/web/src/app/globals.css"
Task: "Extend apps/web/tests/e2e/accessibility.spec.ts for both themes"
```

## Parallel Example: User Story 2

```bash
Task: "Update hero assertion in apps/web/tests/e2e/responsive-branding.spec.ts"
Task: "Update apps/web/src/app/page.tsx to render /brand/neon-GA-01.png"
# then (shares globals.css with US1):
Task: "Frame the hero artwork in apps/web/src/app/globals.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (required before US1).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Confirm the light/dark toggle works across pages and is accessible in both themes.
5. Deploy/demo if ready.

### Incremental Delivery

1. Setup + Foundational → theme helper and dark tokens ready.
2. Add US1 → validate the toggle independently → demo (MVP).
3. Add US2 → validate the neon "Game Ako" hero independently.
4. Add US3 → validate persistence and no-flash across reloads.
5. Polish: lint/typecheck, full unit + e2e suites, performance baseline, quickstart validation and owner visual check.

### Notes

- `[P]` is limited to tasks in different files with no incomplete dependency.
- Shared-file edits (`globals.css`, `theme-toggle.spec.ts`) are serialized to avoid conflicts.
- No database, storage service, or new dependency work is required; the change is confined to `apps/web` source, one stylesheet, and test specs.
- The hero artwork is decorative (`alt=""`) in both themes; theme-relevant text remains real text.
