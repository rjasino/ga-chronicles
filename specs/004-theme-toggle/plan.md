# Implementation Plan: Light/Dark Theme Toggle

**Branch**: `004-theme-toggle` | **Date**: 2026-10-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-theme-toggle/spec.md`

## Summary

Add a visitor-controlled light/dark appearance to the public site. Light remains the default for first-time visitors (regardless of their operating-system color setting); a small, accessible toggle in the shared header switches the whole site to a dark theme whose palette is derived from the neon "Game Ako" sign artwork (`docs/neon-GA-01.png`) — a deep blue-black backdrop with luminous cyan, red, yellow, and magenta accents. The visitor's explicit choice is remembered on their device and applied before first paint so no flash of the wrong theme is visible. The home hero's right-hand visual is switched from the transparent logo to the neon "Game Ako" sign artwork itself, presented in an intentional frame so it reads as deliberate on both themes. Implemented with the existing stack (Next.js App Router, React 19, one global stylesheet, `next/image`); no new npm packages, no database or server-side storage, and no behavior changes outside appearance and the hero visual.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 24 LTS, React 19, Next.js 16.3 (App Router, server components with targeted client islands)

**Primary Dependencies**: Existing application only — Next.js, React, `next/image` for the 2424×2424 hero asset already committed at `apps/web/public/brand/neon-GA-01.png`. No new npm packages are required.

**Storage**: Device-local browser preference only (the theme value `light`/`dark`). No database tables, no Supabase changes, no server session, no schema migration.

**Testing**: Vitest + Testing Library (jsdom) for the theme helper and toggle component unit tests; Playwright for end-to-end toggle, persistence, no-flash, both-theme accessibility, and responsive checks. Existing responsive/branding and accessibility specs are updated for the new hero asset and theme.

**Target Platform**: Responsive public website on desktop and mobile, applied site-wide to every page that shares the header/footer (home, articles, sign-in, account, and admin areas).

**Project Type**: Single full-stack Next.js web application — this feature is presentation plus a small client-side interaction.

**Performance Goals**: Preserve the recorded public-page baseline (LCP ≤ 2.5 s, CLS ≤ 0.1). Keep the no-flash initialization script minimal and synchronous, load the hero artwork via `next/image` with explicit intrinsic dimensions and priority, and add no render-blocking fonts or libraries.

**Constraints**: Light is the mandatory default regardless of `prefers-color-scheme`; no visible flash of the opposite theme for returning visitors; WCAG 2.1 AA contrast in both themes for text, controls, focus indicators, and essential imagery; no horizontal overflow at 390 px; preserve the existing type families (Space Grotesk / DM Sans) and brand identity; theme change must not reload the page or lose scroll/input state; guard against unavailable storage. Out of scope: a "follow system" third state, account-level preference, per-page overrides, typography redesign, and content changes.

**Scale/Scope**: Small, bounded UI feature. One new client component, one small pure helper module, one init script in the root layout, CSS variable overrides plus toggle/hero styling in one stylesheet, and the associated tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / gate | Plan response | Status |
|---|---|---|
| I. Code quality and review | Theme logic is isolated in a small, documented helper (`features/theme/theme.ts`) and a focused client component; edits follow existing component/CSS conventions; code review before merge. | PASS |
| II. Unit and integration testing | The theme helper and toggle component get Vitest unit tests; Playwright covers default/toggle/persist/no-flash and both-theme accessibility and responsiveness; the existing suite must keep passing. | PASS |
| III. Consistent, accessible UX | One palette derived from the existing brand accents, applied consistently site-wide; toggle exposes purpose/state to assistive tech; WCAG 2.1 AA verified in both themes; reduced-motion respected; no layout shift. | PASS |
| IV. Security | Preference is a non-sensitive device-local value; the init script reads only a fixed key from `localStorage` and writes a fixed attribute, with no user-authored content rendered; no new network surface or secret. | PASS |
| V. Performance | Tiny synchronous init script prevents reflow/flash; hero artwork optimized via `next/image` with intrinsic size and priority; public-page baseline re-run after the change. | PASS |

**Pre-research gate**: PASS. No constitutional conflict or requested exception.

## Project Structure

### Documentation (this feature)

```text
specs/004-theme-toggle/
├── plan.md                        # This file (/speckit.plan command output)
├── research.md                    # Phase 0 output
├── data-model.md                  # Phase 1 output
├── quickstart.md                  # Phase 1 output
├── contracts/
│   └── theme-contract.md          # Phase 1 output
└── tasks.md                       # Created by /speckit.tasks (NOT created here)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Modified: light default attr + no-flash theme init script
│   │   ├── page.tsx                    # Modified: hero visual -> /brand/neon-GA-01.png in a framed panel
│   │   └── globals.css                 # Modified: dark token overrides + toggle and hero styles
│   ├── components/
│   │   ├── site-header.tsx             # Modified: mount <ThemeToggle /> in the shared header
│   │   └── theme-toggle.tsx            # New: client toggle (aria-pressed, persisted choice)
│   └── features/
│       └── theme/
│           └── theme.ts                # New: storage key, safe read, apply helpers (unit-tested)
├── public/brand/neon-GA-01.png         # Existing 2424×2424 neon "Game Ako" sign artwork (hero visual)
└── tests/
    ├── unit/theme/theme.test.tsx       # New: helper + toggle unit tests
    └── e2e/
        ├── theme-toggle.spec.ts        # New: default/toggle/persist/no-flash + both-theme checks
        ├── responsive-branding.spec.ts # Modified: hero image assertion -> neon-GA-01
        └── accessibility.spec.ts       # Modified: toggle semantics + both-theme axe checks
```

**Structure Decision**: Extend the single Next.js application in place. Theme state lives in a tiny feature module (`features/theme/`) and a client component under `components/`, mirroring the existing split between `features/*` logic and `components/*` UI. The global token system in `globals.css` is extended rather than replaced, so every existing page inherits both themes without per-page edits. No new routes, no new dependencies, and no data-layer changes.

## Complexity Tracking

> No constitutional violations or unnecessary layers are proposed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | — | — |

## Phase 0 Research Summary

Research decisions and sources are recorded in [research.md](research.md). Key outcomes:

- **Theme mechanism**: a `data-theme="light|dark"` attribute on the root `<html>` element, with the default light tokens in `:root` and dark overrides under `[data-theme="dark"]` in the existing `globals.css`. This reuses the app's current CSS-variable token system and requires no JavaScript to style.
- **Default and persistence**: default is always light and never derives from `prefers-color-scheme`; only an explicit stored choice overrides it. The choice is stored device-locally.
- **No flash**: a tiny synchronous initialization script in the root layout applies a stored choice before the page paints, wrapped in error handling so unavailable storage fails safe to light.
- **Toggle**: a `"use client"` button in the shared header with an accessible name and `aria-pressed`, syncing its rendered state to the document after mount to avoid hydration mismatch.
- **Dark palette**: derived from the neon sign — deep blue-black surfaces with luminous cyan as the primary/accent, plus neon red, yellow, and magenta echoes of the artwork, preserving the existing type families.
- **Hero visual**: serve `public/brand/neon-GA-01.png` (2424×2424) through `next/image` with an explicit frame so the dark artwork reads intentionally on the light theme.
- **Testing/dependencies**: no new npm packages; unit tests for the pure helper and toggle, Playwright for end-to-end theme behavior and both-theme accessibility/responsiveness.

## Phase 1 Design Summary

- [data-model.md](data-model.md) defines the single device-local "theme preference" value, its allowed values, default, and read/write rules; no server data is involved.
- [contracts/theme-contract.md](contracts/theme-contract.md) documents the observable contract: root theme attribute, toggle semantics and state, persistence and no-flash behavior, hero visual, and both-theme accessibility guardrails.
- [quickstart.md](quickstart.md) provides local setup, automated commands, and end-to-end validation scenarios for both themes.

**Post-design Constitution Check**: PASS. The design keeps public pages on-brand, accessible in both themes, responsive, and performant, with no new data or dependency surface; no violations require a waiver.
