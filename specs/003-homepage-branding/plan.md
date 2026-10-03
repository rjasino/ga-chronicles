# Implementation Plan: Homepage Branding

**Branch**: `003-homepage-branding` | **Feature context**: `003-homepage-branding` | **Date**: 2026-10-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-homepage-branding/spec.md`

## Summary

Refine the public brand surface: add the channel motto `#fortheloveofgaming` to the home hero, replace the abstract `GA•` hero mark with the real transparent neon GA logo, complete the header wordmark to "Game Ako Chronicles", and add a site-wide footer that explains what Game Ako is with labeled Facebook/YouTube/Twitch placeholder links the publisher swaps to real URLs later. This is a presentation-only change implemented within the existing brand system (flat matte palette, Space Grotesk/DM Sans) and single Next.js application — no new dependencies, no data schema, no behavior changes outside the header, home hero, and footer.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 24 LTS, React 19, Next.js 16.3 (App Router, server components)

**Primary Dependencies**: Existing application only — Next.js, React, `next/image` for the hero logo (transparent neon GA asset already present under `apps/web/public/brand/`). No new npm packages are required.

**Storage**: None — the feature introduces no persisted data and no schema changes.

**Testing**: Playwright browser tests — extend the existing responsive and accessibility specs (`apps/web/tests/e2e/responsive-branding.spec.ts`, `accessibility.spec.ts`) to cover the hero/header/footer brand surface; no new unit/integration logic because the change is static presentation.

**Target Platform**: Responsive public website — desktop and mobile viewports, plus the existing admin/auth areas which share the header/footer.

**Project Type**: Single full-stack web application (presentation change to pages/components).

**Performance Goals**: Preserve the project's public-page Core Web Vitals targets (LCP ≤ 2.5 s, CLS ≤ 0.1). Load the hero logo with `next/image` using explicit intrinsic dimensions and priority to avoid layout shift, and re-run the established home-route baseline after the change.

**Constraints**: Stay within the existing flat, matte brand identity (blue `#123a72`, red `#c6363d`, yellow `#f4c84a`, white `#fffefa`; Space Grotesk display + DM Sans body). The motto must render as real accessible text, not an image. The social placeholder links must be obviously replaceable by a non-developer (plain labeling, single-line edit). No horizontal scrolling at 390 px.

**Scale/Scope**: Small, static UI refinement. Out of scope: palette/type redesign, article reading UI, content management for the new copy, and analytics.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / gate | Plan response | Status |
|---|---|---|
| I. Code quality and review | Small, focused edits to existing components/CSS following project conventions; code review before merge. | PASS |
| II. Unit and integration testing | No new pure logic is introduced; extend the existing Playwright responsive and accessibility coverage to the hero/header/footer and run the full suite. | PASS |
| III. Consistent, accessible UX | On-brand matte identity preserved; motto and social labels are real text; keyboard focus and no-overflow behavior verified at mobile/desktop widths. | PASS |
| IV. Security | No new input surfaces or secrets; when real social URLs are later added they must use safe link attributes (`rel`); nothing user-authored is rendered. | PASS |
| V. Performance | Hero logo optimized via `next/image` with intrinsic dimensions; re-run the public-page baseline for the home route. | PASS |

**Pre-research gate**: PASS. No constitutional conflict or requested exception.

## Project Structure

### Documentation (this feature)

```text
specs/003-homepage-branding/
├── plan.md                   # This file (/speckit.plan command output)
├── research.md               # Phase 0 output (/speckit.plan command)
├── data-model.md             # Phase 1 output (/speckit.plan command)
├── quickstart.md             # Phase 1 output (/speckit.plan command)
├── contracts/
│   └── branding-contract.md  # Phase 1 output (/speckit.plan command)
└── tasks.md                  # Created by /speckit.tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Modified: hero motto line + neon GA hero logo
│   │   └── globals.css                  # Modified: masthead, brand wordmark, footer styles
│   └── components/
│       ├── site-header.tsx              # Modified: full "Game Ako Chronicles" wordmark
│       └── site-footer.tsx              # Modified: description + motto + social links
├── public/brand/neon-GA-trans-01.png    # Existing transparent neon GA logo (hero visual)
└── tests/e2e/
    ├── responsive-branding.spec.ts      # Modified: home hero/header/footer assertions
    └── accessibility.spec.ts            # Modified: footer/social labels + hero alt assertions
```

**Structure Decision**: Extend the single Next.js application by editing the three presentation components and the page they render on; keep the change entirely in the existing component/CSS structure with no new architecture.

## Phase 0 Research Summary

Research decisions and sources are recorded in [research.md](research.md). Key outcomes: render the hero with the transparent neon GA asset via `next/image` (decorative, `alt=""`, priority, intrinsic size to avoid CLS); present `#fortheloveofgaming` as a short display-face brand line rather than an uppercase eyebrow (per the frontend-design direction and the spec's current kicker style); complete the header wordmark as inline text beside the existing logo; and model the footer as a blue brand band that combines a one-sentence description, the motto, and three labeled placeholder social links marked as forthcoming. No new dependencies or data are needed.

## Phase 1 Design Summary

- [data-model.md](data-model.md) confirms this is a presentation-only change with no entities or schema impact.
- [contracts/branding-contract.md](contracts/branding-contract.md) defines the observable home-hero, header-wordmark, and footer behavior, including the replaceable social placeholders.
- [quickstart.md](quickstart.md) provides local setup and end-to-end validation scenarios for the brand surface.

**Post-design Constitution Check**: PASS. The proposed changes keep public pages on-brand, accessible, responsive, and performant; no violations require a waiver.

## Complexity Tracking

No constitutional violations or unnecessary layers are proposed. A redesigned token system, a separate marketing site, and a CMS for the new copy were rejected because the brief is a focused refinement of the existing single-application brand surface.