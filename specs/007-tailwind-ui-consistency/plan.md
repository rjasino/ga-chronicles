# Implementation Plan: Site-Wide UI Consistency

**Branch**: `007-tailwind-ui-consistency` (no git branch created) | **Date**: 2026-10-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-tailwind-ui-consistency/spec.md`

## Summary

Migrate the entire Game Ako Chronicles site from its single hand-written stylesheet to Tailwind CSS 4, and build one set of shared elements (buttons, text fields, text areas, dropdowns, checkboxes, status messages) so every page uses the same purposes, states, and appearances. Keep the existing light and dark appearances (`data-theme`), and keep the palette of blue, white, red, and yellow in a matte finish, adding a muted matte green as the success color (FR-009).

Technical approach:

- **Tailwind 4 pipeline**: install `tailwindcss` and `@tailwindcss/postcss` (4.3.x) and add the PostCSS plugin, as the Next.js docs describe.
- **Single token source**: keep the existing color variables on `:root` and `[data-theme="dark"]` as the one source of truth, and expose them to Tailwind through `@theme inline`. Dark mode is driven by the `data-theme` attribute through a custom `dark` variant.
- **Shared element components**: a small set of React components under `src/components/ui/` define the variants and states once. Pages compose them instead of styling raw elements.
- **Stable test hooks**: existing semantic class names used by the test suite (for example `form-error`, `admin-list`, `review-item`, `story__body`) remain on the markup, so the end-to-end and unit tests keep working.
- **Verification**: visual baselines are captured before the migration so the change can be reviewed page by page in both appearances, and the performance baseline is re-measured before merge.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 19, Next.js 16.3 (App Router, Turbopack, PostCSS)

**Primary Dependencies**: existing `next`, `react`, `@supabase/ssr`, `sanitize-html`, `@tiptap/*`, `zod`. New: `tailwindcss` 4.3.x, `@tailwindcss/postcss` 4.3.x (dev dependencies). No component-variant library is added (see research.md).

**Storage**: N/A. No database, migration, or data changes.

**Testing**: Vitest + Testing Library (`apps/web/tests/unit/`), Playwright e2e (`apps/web/tests/e2e/`) with `@axe-core/playwright` accessibility checks; new Playwright screenshot checks for key pages in both appearances. Database tests are unaffected.

**Target Platform**: Web, desktop and mobile browsers at 390 px, 768 px, and 1440 px widths; light and dark appearances.

**Project Type**: Web application (Next.js app in `apps/web`, Supabase backend).

**Performance Goals**: No regression on the public article and home pages against `docs/operations/performance-baseline.md` (median LCP and CLS). Tailwind's generated CSS is expected to be smaller than the current stylesheet; confirm with a bundle-size check.

**Constraints**:
- Keep the light and dark appearances and the palette: blue, white, red, yellow, and the new matte success green.
- Matte finish: flat fills, no gloss, gradients, glow effects, or heavy shadows (FR-010).
- Do not change labels, actions, form submission, or the theme toggle's behavior (FR-015).
- Keep existing automated checks passing (FR-016).
- Google Fonts (DM Sans, Space Grotesk) remain the typefaces.

**Scale/Scope**: Every route in the app (about 20 pages and layouts), roughly 25 components with markup, 124 `className` usages, and about 245 lines of current global CSS.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality | Shared components are documented with their props and states (contracts/ui-components.md). Existing class names are kept only where tests need them, not as styling. Reviewed before merge. | PASS (planned) |
| II. Testing Standards | Unit tests for each shared component's variants and states; e2e tests and axe checks updated for the migrated pages; screenshot checks for light and dark on key pages. | PASS (planned) |
| III. UX Consistency | This is the core of the feature. One purpose per variant, one state model, one palette. Visual review against the spec's acceptance scenarios before merge. | PASS |
| IV. Security | Adds two dev dependencies. Their versions are pinned in the lockfile and tracked for known vulnerabilities (`npm audit`) before merge. No new runtime code paths or data handling. | PASS (planned) |
| V. Performance | Benchmark against `docs/operations/performance-baseline.md` before merge, comparing LCP and CLS for public routes. Confirm CSS size does not increase. | PASS (benchmark required before merge) |

**Result**: No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-tailwind-ui-consistency/
├── spec.md
├── plan.md                    # This file
├── research.md                # Phase 0 output
├── data-model.md              # Phase 1 output (design tokens and component states)
├── quickstart.md              # Phase 1 output
├── contracts/
│   └── ui-components.md       # Phase 1 output (shared element props and variants)
├── checklists/
│   └── requirements.md
└── tasks.md                   # Created by /speckit.tasks (not by this command)
```

### Source Code (repository root)

```text
apps/web/
├── package.json                               # MODIFIED: add tailwindcss, @tailwindcss/postcss
├── postcss.config.mjs                         # NEW: @tailwindcss/postcss plugin
├── src/
│   ├── app/
│   │   ├── globals.css                        # MODIFIED: @import tailwindcss, @custom-variant dark, @theme inline tokens, base rules; page-specific rules removed as migrated
│   │   ├── layout.tsx                         # MODIFIED: uses Tailwind-styled shell
│   │   └── **/page.tsx                        # MODIFIED: className moved to shared components / utilities
│   ├── components/
│   │   ├── ui/                                # NEW: shared elements
│   │   │   ├── button.tsx                     # primary, secondary, error, success, text
│   │   │   ├── text-field.tsx                 # text input, text area, select (shared states)
│   │   │   ├── checkbox.tsx
│   │   │   ├── message.tsx                    # error, success, notice, info messages
│   │   │   └── cn.ts                          # class-joining helper (no extra dependency)
│   │   ├── site-header.tsx, site-footer.tsx, theme-toggle.tsx   # MODIFIED
│   │   ├── articles/*.tsx, comments/*.tsx, admin/*.tsx, auth/*.tsx, moderation/*.tsx   # MODIFIED
│   └── features/articles/richtext/editor.tsx  # MODIFIED: toolbar uses Button (toolbar size) and tokens
└── tests/
    ├── unit/ui/button.test.tsx                # NEW
    ├── unit/ui/text-field.test.tsx            # NEW
    ├── unit/ui/checkbox.test.tsx              # NEW
    ├── unit/ui/message.test.tsx               # NEW
    └── e2e/visual-consistency.spec.ts         # NEW: screenshot checks, light and dark, key pages
```

**Structure Decision**: The Next.js app in `apps/web` keeps its existing layout. Shared elements live in a new `src/components/ui/` folder, the standard place for reusable UI in this codebase. Global CSS keeps only the design tokens, the base reset, and the Tailwind import, so the styling source of truth is explicit.

## Complexity Tracking

> Not applicable. No Constitution Check violations.
