# Quickstart: Light/Dark Theme Toggle Validation

This guide describes local setup and end-to-end checks for the theme toggle and the neon "Game Ako" hero visual.

## Prerequisites

- Node.js 24 LTS and npm
- Local Supabase running (or a shared `.env.local` pointing at a reachable project), since the app renders the public article list on the home page
- `apps/web/.env.local` based on `.env.example`

No asset step is required: the neon "Game Ako" sign artwork is already committed at `apps/web/public/brand/neon-GA-01.png` (2424×2424).

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
npm --prefix apps/web run test:unit
npm --prefix apps/web run test:e2e
npm --prefix apps/web run build
npm --prefix apps/web run performance
```

Expected results:

- **Unit** (`tests/unit/theme/theme.test.tsx`): the theme helper resolves a valid stored `light`/`dark` value, falls back to `light` for missing/invalid/unreadable values, and applies the root theme attribute; the toggle component renders an accessible control, flips the document theme, and persists the choice.
- **E2E** (`tests/e2e/theme-toggle.spec.ts`): a first visit is light even when the browser emulates a dark color scheme; the toggle switches the site to dark and back; a chosen theme survives reload; a stored dark choice applies with no visible light frame.
- **Updated existing specs**: `responsive-branding.spec.ts` asserts the hero visual is `/brand/neon-GA-01.png`; `accessibility.spec.ts` asserts the toggle's accessible name/state and reports zero axe violations on representative public pages in **both** themes.
- **Build/performance**: production build succeeds and the home route remains at or better than the recorded baseline in `docs/operations/performance-baseline.md`.

## End-to-end scenarios

1. **Default light**: Open the site in a fresh browser profile (no stored preference) and with the OS/browser emulated as dark. Confirm the site presents light.
2. **Toggle to dark**: Activate the theme control in the header. Confirm the entire page (header, hero, article list, footer) switches to the dark palette immediately, with no reload and no loss of scroll position.
3. **Toggle back**: Activate the control again. Confirm the site returns to light and the control's announced state updates.
4. **Persistence**: Choose dark, then reload and navigate between pages. Confirm dark is applied on load. Close and reopen the tab and confirm the choice is still dark.
5. **No flash**: With dark saved, reload and observe the very first painted frame; confirm no light flash appears before dark.
6. **Storage unavailable**: Block or clear the preference storage (or use a private window that rejects it). Confirm the site still opens in light with no error and the toggle still works for the session.
7. **Hero visual**: On the home page in both themes, confirm the right-hand visual is the neon "Game Ako" sign artwork, legible and framed, with the motto and headline readable.
8. **Accessibility**: Tab to the toggle and confirm a visible focus indicator; in each theme, run the accessibility checks and confirm zero WCAG 2.1 AA violations on the home and sign-in pages.
9. **Responsive/no-regression**: Check the home page and an article page at 390 px, 768 px, and 1440 px in both themes for no horizontal scrolling, and confirm the article reading experience and all existing content are unchanged.

## Verified implementation results

Validated on 2026-10-03 with Node 24, Next.js 16.3, local Supabase (Docker), Chromium.

| Check | Result |
|---|---|
| `npm --prefix apps/web run lint` | PASS — 0 errors |
| `npm --prefix apps/web run typecheck` | PASS |
| `npm --prefix apps/web run test:unit` | PASS — 75 tests, including the new theme helper and toggle unit tests |
| `npm --prefix apps/web run test:e2e` | PASS — 31 Chromium scenarios, including default-light, toggle, persistence, no-flash, both-theme axe, and the updated hero/footer assertions |
| `npm --prefix apps/web run build` | PASS — optimized production build |
| `npm --prefix apps/web run performance` | Home route at or above baseline: median LCP 208 ms (1280 px) / 168 ms (390 px), CLS .003 / .034, unchanged CLS; recorded in `docs/operations/performance-baseline.md` |
| Theme behavior | First visit opens light even with the browser emulating a dark color scheme; the toggle switches the whole site dark/light without reload; the choice persists across reload and is applied before the document finishes loading |
| Accessibility | Zero axe WCAG 2.1 AA violations on home and sign-in in both light and dark themes; toggle exposes an accessible name and pressed state |

## Owner visual check

The neon "Game Ako" sign artwork is a square image with a dark photographic background. After the home page renders, confirm the hero framing, size, and placement look right in both themes and tell the team if the artwork should sit larger, smaller, or with more/less matting.

## References

- Observable behavior: [contracts/theme-contract.md](contracts/theme-contract.md)
- Preference rules: [data-model.md](data-model.md)
- Requirements and success criteria: [spec.md](spec.md)
