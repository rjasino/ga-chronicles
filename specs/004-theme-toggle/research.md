# Research: Light/Dark Theme Toggle

**Date**: 2026-10-03
**Scope**: Resolve planning decisions for the light/dark theme toggle and the neon "Game Ako" hero visual, per [spec.md](spec.md).

## Decision: Apply the theme with a `data-theme` attribute over the existing CSS-variable token system

- **Decision**: Drive appearance from `data-theme="light" | "dark"` on the root `<html>` element. Keep the current light values as the default token block (`:root`) and add a `[data-theme="dark"]` block that overrides the same custom properties in `apps/web/src/app/globals.css`.
- **Rationale**: The app already routes every color through CSS custom properties (`--blue`, `--ink`, `--muted`, `--line`, `--paper`, etc.) in one global stylesheet. Overriding those tokens per theme changes the entire site — including pages and components that never reference the theme — with zero per-page edits and no JavaScript required to style. It also keeps both themes in one reviewable place.
- **Alternatives considered**: A class on `<body>` (works, but `<html>` is the conventional and earliest-paintable hook); two separate stylesheets swapped at runtime (duplicate maintenance, flash risk); CSS-in-JS or a design-system dependency (new dependency and re-architecture for a small change); `prefers-color-scheme` media queries only (cannot express an explicit user override).
- **Sources**: [spec.md](spec.md) FR-003/FR-011; `apps/web/src/app/globals.css`; `apps/web/src/app/layout.tsx`.

## Decision: Light is the unconditional default; only an explicit stored choice switches it

- **Decision**: Do not read `prefers-color-scheme` for the initial appearance. A first-time visitor always starts in light. Only a valid stored preference (`light`/`dark`) overrides the default, and `light` stays the fallback whenever anything is missing or unreadable.
- **Rationale**: The request states light is the default "and that's why it's currently implemented," and the spec makes this a testable requirement even on dark-mode devices (FR-002, SC-002). Deliberately ignoring the OS setting avoids a first visit that contradicts the owner's intent.
- **Alternatives considered**: Defaulting to the OS setting (rejected — contradicts the explicit default-light requirement); defaulting to light but honoring the OS only when storage is unavailable (adds ambiguity and a second code path for no product value).
- **Sources**: [spec.md](spec.md) FR-002, FR-005, FR-012; SC-002.

## Decision: Persist the choice device-locally and apply it before first paint with a tiny guarded init script

- **Decision**: Store the explicit choice under a single fixed key in `localStorage`. Add a minimal synchronous inline script in the root layout that reads that key and sets `data-theme` on `<html>` before the page content paints, wrapped in `try/catch` so blocked or unavailable storage silently falls back to light. The toggle writes the same key.
- **Rationale**: A device-local preference satisfies "remembered until changed" (FR-005) without accounts, cookies, or server storage (FR-005, Assumptions), and lets a synchronous pre-paint script eliminate the flash of the opposite theme (FR-006, SC-003). Guarding the read satisfies the fail-safe requirement (FR-012) and the private-browsing edge case.
- **Alternatives considered**: A cookie (sends data to the server for no reason, and still needs a pre-paint step); server/session storage (requires auth and schema, contradicting "device-level, no new data"); a post-hydration script only (causes a visible flash — fails SC-003).
- **Sources**: [spec.md](spec.md) FR-005/FR-006/FR-012; SC-003; edge cases "storage unavailable" and "two tabs".

## Decision: Render the toggle as a client button with an accessible name and `aria-pressed`, synced after mount

- **Decision**: Add a `"use client"` `ThemeToggle` button in the shared header. It exposes a clear accessible name and its on/off state via `aria-pressed`, applies the change immediately via the theme helper, and persists it. The server-rendered output reflects the light default; the component reconciles from the live document state after mount so hydration stays deterministic.
- **Rationale**: The rest of the app already uses small `"use client"` islands (auth, editor, forms), so this matches the established pattern. `aria-pressed` is the standard two-state toggle semantics and keeps the control understandable to screen readers (FR-007). Rendering the light default on the server and reconciling client-side avoids hydration mismatches, since the server cannot know the visitor's stored choice.
- **Alternatives considered**: A `<select>` with light/dark options (heavier, implies more than two states); a checkbox styled as a switch (acceptable but `aria-pressed` maps more directly to an appearance toggle); rendering the stored theme during SSR by reading a cookie (adds server/cookie surface and defeats device-local-only persistence).
- **Sources**: [spec.md](spec.md) FR-001/FR-004/FR-007; existing client-island pattern in `apps/web/src/components/**`; `apps/web/src/app/layout.tsx`.

## Decision: Derive the dark palette from the neon "Game Ako" sign, reusing the existing token names

- **Decision**: Fill the existing tokens with a dark palette inspired by the artwork: a deep blue-black page surface, subtly raised dark panels, near-white body text, softened cool-gray muted text, low-contrast dark borders, and luminous **cyan** as the primary/action color, with **neon red**, **yellow**, and **magenta** mapping the existing red/yellow/pink accents. Focus outlines use the bright yellow. Keep Space Grotesk and DM Sans unchanged.
- **Rationale**: The artwork's identity is a dark brick backdrop crossed by glowing cyan, red, yellow, and magenta tubes; mapping the existing accent tokens onto those hues keeps the site recognizably "Game Ako" in the dark while maintaining contrast and the existing structural color roles (FR-003, FR-009). Reusing token names means no component changes are needed for color.
- **Alternatives considered**: A neutral gray dark mode (ignores the requested artwork basis); inverting the light palette (produces muddy, low-contrast results and breaks brand color roles); adding an entirely new token set (unnecessary churn for the same roles).
- **Sources**: `docs/neon-GA-01.png`; [spec.md](spec.md) FR-003/FR-009; SC-007; existing token roles in `apps/web/src/app/globals.css`.

## Decision: Switch the hero visual to the neon "Game Ako" sign, framed, via `next/image`, in both themes

- **Decision**: Replace `/brand/neon-GA-trans-01.png` in the home hero with `/brand/neon-GA-01.png` (2424×2424), rendered with `next/image` using explicit intrinsic dimensions and `priority`, inside an intentional frame/panel so the artwork's dark photographic background reads as deliberate on the light theme.
- **Rationale**: The owner explicitly asked to use this image on the right of the hero, and the asset is already committed under the app's public brand folder (FR-008). Because the PNG is a dark square rather than a transparent cut-out, a frame makes it look intentional in both themes instead of like an accidental dark block (spec Assumption). `next/image` handles the large asset with responsive sizing and optimization while avoiding layout shift.
- **Alternatives considered**: Keeping the transparent logo (contradicts the request); using a CSS background (complicates optimization and intrinsic sizing); a plain `<img>` (loses the app's established image discipline).
- **Sources**: [spec.md](spec.md) FR-008; Assumptions "Hero artwork on both themes" and "Asset availability"; `apps/web/src/app/page.tsx`; `docs/neon-GA-01.png`.

## Decision: No new dependencies; verify with unit and browser tests

- **Decision**: Implement with the existing stack and add tests: Vitest unit tests for the theme helper and toggle component, plus Playwright e2e for default-light, toggle, persistence, no-flash, both-theme accessibility, and responsiveness. Update the existing hero-image assertion to the new asset.
- **Rationale**: The change has a small amount of genuinely testable logic (resolve/apply/persist), which the project constitution requires to be unit-tested; the visible behavior and both-theme accessibility are best proven end-to-end. No library is needed for either.
- **Alternatives considered**: Browser tests only (leaves the helper untested, weaker against the constitution); unit tests only (cannot prove no-flash or both-theme axe cleanliness).
- **Sources**: [spec.md](spec.md) SC-004/SC-005; project constitution Principle II; `apps/web/vitest.config.ts`; `apps/web/playwright.config.ts`.

## Resolved planning unknowns

- **Theme mechanism**: `data-theme` attribute over the existing CSS-variable tokens; no per-page edits.
- **Default/persistence**: unconditional light default (ignore OS setting); explicit choice stored device-locally under one fixed key.
- **No-flash**: tiny synchronous, error-guarded init script in the root layout.
- **Toggle**: client button with accessible name + `aria-pressed`, reconciled after mount.
- **Dark palette**: deep blue-black surfaces + neon cyan primary with red/yellow/magenta accents, existing type unchanged.
- **Hero visual**: `public/brand/neon-GA-01.png` via `next/image` in an intentional frame, both themes.
- **Dependencies/data**: none beyond device-local storage; no remaining unknowns for Phase 1.
