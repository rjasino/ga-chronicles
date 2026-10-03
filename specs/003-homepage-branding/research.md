# Research: Homepage Branding

**Date**: 2026-10-03
**Scope**: Resolve planning decisions for the home hero, header wordmark, and site footer brand refresh, per [spec.md](spec.md).

## Decision: Use the existing transparent neon GA asset as the hero visual via `next/image`

- **Decision**: Replace the abstract `GA•` circular mark in the home hero with the transparent neon "GA" logo already present in the app's brand assets, rendered with `next/image` using its intrinsic dimensions, as a decorative element (`alt=""`, `aria-hidden`), eager/priority on the home page.
- **Rationale**: The real logo is the strongest brand artifact the channel owns and is more distinctive than the placeholder circle; `next/image` with explicit sizing keeps the launch CLS target (no layout shift from the logo) and serves an optimized format. It stays decorative because the motto and wordmark carry the label semantics.
- **Alternatives considered**: Keeping the abstract `GA•` circle fails the brief. A CSS background would complicate the transparent PNG and hurt `next/image` optimization. A plain `<img>` works but loses the existing image-optimization and sizing discipline used elsewhere in the app.
- **Sources**: [spec.md](spec.md) FR-002; existing cover/hero image handling in `apps/web/src/app/page.tsx` and `apps/web/next.config.ts`.

## Decision: Present `#fortheloveofgaming` as a short display-face brand line, not an uppercase eyebrow

- **Decision**: Add the motto as a genuine brand line inside the hero — set in the display face at a readable size with the existing accent palette — rather than as another tracked ALL-CAPS eyebrow above the headline.
- **Rationale**: The homepage already uses an uppercase kicker ("Independent games. Clear-eyed stories."); stacking a second uppercase label above the headline reads as generic template chrome and dilutes both lines. The motto is the channel's voice, so it deserves its own composed treatment (display face, sentence-case, on-brand accent), staying one composed element among a quiet hero.
- **Alternatives considered**: An uppercase kicker duplication (generic, low distinctiveness). Replacing the existing kicker with the motto (loses the editorial positioning). Making the motto a link (scope creep — the brief limits links to the footer socials).
- **Sources**: [spec.md](spec.md) FR-001/FR-005; frontend-design direction (distinctive, restrained hero; avoid uppercase-eyebrow defaults); existing `.masthead__kicker` styling in `apps/web/src/app/globals.css`.

## Decision: Complete the header wordmark as inline text beside the existing logo

- **Decision**: Change the header brand from logo + "Chronicles" to logo + "Game Ako Chronicles", keeping the logo on the left of the banner as today.
- **Rationale**: The truncated "Chronicles" reads as a fragment to first-time visitors; the full, explicit wordmark confirms brand identity at a glance (the hero's job), with no layout cost since the wordmark is short.
- **Alternatives considered**: Showing the wordmark as an image/svg (heavier, less accessible than text). Leaving "Chronicles" (fails FR-003).
- **Sources**: [spec.md](spec.md) FR-003; `apps/web/src/components/site-header.tsx`.

## Decision: Model the footer as a blue brand band with description, motto, and replaceable social links

- **Decision**: Rebuild `site-footer.tsx` as a brand band on the existing blue surface: a one-sentence plain-language description of what Game Ako is, the motto, and three labeled social entries — Facebook, YouTube, Twitch — each a real link with a placeholder target and an explicit "forthcoming" indicator so the publisher can swap in real URLs with a single-line edit and no code changes.
- **Rationale**: One footer block gives every page the "who are you?" context the spec requires (FR-004/005) and keeps the socials discoverable (FR-006). Labels use the platforms' names (not icons) so the owner can immediately see what to replace, and the forthcoming treatment prevents dead-end confusion.
- **Alternatives considered**: A shallow one-line footer (fails the description and socials asks). Icons-only social buttons (ambiguous before URLs exist, harder to edit). Clipboard-only content via a CMS (out of scope; static copy is sufficient for this brief).
- **Sources**: [spec.md](spec.md) FR-004–006; existing `.site-footer` styling in `apps/web/src/app/globals.css`.

## Decision: No new dependencies and no data changes

- **Decision**: Implement the whole feature with the existing stack (Next.js, React, `next/image`, one global stylesheet). No new npm packages, no database migrations, no new routes or components beyond edits to existing files.
- **Rationale**: The change is static presentation; adding dependencies or storage for content that is hardcoded and swapped manually adds unnecessary surface. The motto and descriptions are brand copy, not content-managed data.
- **Alternatives considered**: A copy/asset backend (unnecessary scope), a design-system library (overkill for three presentation edits).
- **Sources**: plan Technical Context; `apps/web/package.json`.

## Resolved planning unknowns

- **Hero visual**: transparent neon GA logo via `next/image`, decorative, intrinsic sizing.
- **Motto**: display-face, sentence-case brand line in the hero, echoed in the footer.
- **Wordmark**: full "Game Ako Chronicles" inline beside the left-positioned logo.
- **Footer**: blue brand band with description + motto + three labeled placeholder social links marked forthcoming.
- **Dependencies/data**: none. No remaining unknowns for Phase 1.