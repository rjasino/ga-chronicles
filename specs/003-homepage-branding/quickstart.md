# Quickstart: Homepage Branding Validation

This guide describes local setup and end-to-end checks for the branded home page, header, and footer.

## Prerequisites

- Node.js 24 LTS and npm
- Local Supabase running (or a shared `.env.local` pointing at a reachable project), since the app renders the public article list on the home page
- `apps/web/.env.local` based on `.env.example`

The transparent neon GA logo is already committed at `apps/web/public/brand/neon-GA-trans-01.png`; no asset step is required.

## Start the local environment

From the repository root:

```sh
npm --prefix apps/web install
npx supabase start && npx supabase db reset
npm --prefix apps/web run dev
```

Open `http://127.0.0.1:3000`.

## Automated validation

Run from the repository root:

```sh
npm --prefix apps/web run lint
npm --prefix apps/web run typecheck
npm --prefix apps/web run test:e2e
npm --prefix apps/web run build
```

Expected results:

- The extended responsive/branding spec asserts the home hero motto, the neon GA hero logo, the full "Game Ako Chronicles" wordmark, and the footer description/socials at desktop and mobile widths, with no horizontal overflow.
- The accessibility spec asserts the new text (motto, description, link labels) is reachable, the decorative hero logo does not announce as content, and keyboard focus is visible on footer links.

## End-to-end scenarios

1. **Hero brand**: Open the home page. Confirm `#fortheloveofgaming` appears inside the hero as a readable brand line; confirm the right-side visual is the transparent neon GA logo, not the old circular mark.
2. **Wordmark**: On the home page and any other page (e.g., an article), confirm the header reads "Game Ako Chronicles" with the logo on the left.
3. **Footer description**: Scroll to the footer on the home page and on an article page; confirm it explains what Game Ako is in one plain sentence plus the motto.
4. **Social placeholders**: Confirm the footer lists Facebook, YouTube, and Twitch, each an obviously-forthcoming link; activate one and confirm it does not land on a wrong live service.
5. **Replace a placeholder (owner task)**: Edit the footer's single-line link target for one social to a real URL, hard-refresh, and confirm the link resolves correctly. This is the only step the publisher performs, with no code changes.
6. **Responsive/no-regression**: Re-check the home page at 390 px and 1280 px for legible stacking and no horizontal scrolling, and confirm the article reading experience is unchanged.

## Verified implementation results

Validated on 2026-10-03 with Node 24, Next.js 16.3, local Supabase (Docker):

| Check | Result |
|---|---|
| `npm --prefix apps/web run lint` | PASS — 0 errors |
| `npm --prefix apps/web run typecheck` | PASS |
| `npm --prefix apps/web run test:e2e` | PASS — 25 Chromium scenarios, including the new hero/header/footer and social-placeholder assertions |
| `npm --prefix apps/web run build` | PASS — optimized production build |
| `npm --prefix apps/web run performance` | Home route unchanged from baseline (LCP 172 ms, CLS .003/.033); recorded in `docs/operations/performance-baseline.md` |
| Visual/DOM check | Hero logo rendered at 260 px (desktop) / 150 px (mobile) via `next/image`; motto in Space Grotesk red; wordmark 212 px (desktop) / 178 px (mobile); no horizontal overflow at 1280 px or 390 px |

## Owner visual check

The neon GA logo could not be visually previewed in this environment. After the home page renders, confirm the logo size, placement, and any rotation/breathing room look right against the hero column, and tell the team if it should sit larger, smaller, or with more space.

## Shutdown

```sh
npx supabase stop
```

See [data-model.md](data-model.md) (no data scope) and [the branding contract](contracts/branding-contract.md) for the observable behavior being validated.