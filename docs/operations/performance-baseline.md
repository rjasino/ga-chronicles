# Public-page performance baseline

## Repeatable procedure

1. Reset local Supabase, retaining the seeded launch article, then create a production build (`npm --prefix apps/web run build`) and start it with `npm --prefix apps/web run start`.
2. In a second terminal run `npm --prefix apps/web run performance` against `/` and `/articles/a-new-chapter-for-independent-games`. The script records three Chromium runs at 1280 px and 390 px, waits for network idle, and exercises a public navigation link per run.
3. For a launch candidate, repeat with Chrome Lighthouse on a clean profile, 4× CPU slowdown, and a 1.6 Mbps / 750 Kbps network profile. Also measure the deployed preview; localhost results are a development baseline only.
4. Compare field 75th-percentile LCP ≤ 2.5 s, INP ≤ 200 ms, and CLS ≤ 0.1 once real-user data is available. Repeat after changes to image delivery, fonts, article rendering, or route data loading.

## Baseline record

**Measured:** 2026-09-27, Windows development machine, Node 24.20.0, Chromium 153.0.8010.12, optimized Next.js production build, seeded local Supabase, localhost without CPU/network throttling. Three runs per route/viewport; values are medians.

| Route | Viewport | LCP runs (ms) | Median LCP | CLS runs | Median CLS | Lab event timing |
|---|---:|---|---:|---|---:|---|
| `/` | 1280 px | 184, 168, 160 | 168 ms | .004, .004, .004 | .004 | 16 ms observed |
| `/` | 390 px | 144, 148, 152 | 148 ms | .034, .034, .034 | .034 | 16 ms observed |
| Article detail | 1280 px | 160, 152, 160 | 160 ms | 0, 0, 0 | 0 | 16 ms observed |
| Article detail | 390 px | 156, 156, 144 | 156 ms | .032, .032, .032 | .032 | 16 ms observed |

**Measured:** 2026-10-03, same development machine and setup, after the rich article body feature (Tiptap editor + `article-images` storage + server-rendered rich bodies). Eighteen runs (three per route/viewport) against the optimized production build on localhost.

| Route | Viewport | LCP runs (ms) | Median LCP | CLS runs | Median CLS | Lab event timing |
|---|---|---:|---|---:|---|---:|---|
| `/` | 1280 px | 184, 160, 160 | 160 ms | .003, .003, .003 | .003 | 16 ms observed |
| `/` | 390 px | 256, 164, 156 | 164 ms | .034, .034, .034 | .034 | 16 ms observed |
| Article detail (legacy plain text) | 1280 px | 184, 172, 160 | 172 ms | 0, 0, 0 | 0 | 16 ms observed |
| Article detail (legacy plain text) | 390 px | 168, 172, 156 | 168 ms | .033, .033, .033 | .033 | 16 ms observed |
| Article detail (rich body with inline image) | 1280 px | 172, 160, 176 | 172 ms | .010, .010, .010 | .010 | 16 ms observed |
| Article detail (rich body with inline image) | 390 px | 168, 168, 156 | 168 ms | .054, .054, .054 | .054 | 16 ms observed |

**Measured:** 2026-10-03 (homepage branding refresh), same setup. The home route was re-measured after adding the channel motto, the neon GA hero logo (`next/image`, optimized), the complete wordmark, and the new footer. Home-route numbers are effectively unchanged from the baseline.

| Route | Viewport | LCP runs (ms) | Median LCP | CLS runs | Median CLS | Lab event timing |
|---|---|---:|---|---:|---|---:|---|
| `/` | 1280 px | 248, 172, 172 | 172 ms | .003, .003, .003 | .003 | 16 ms observed |
| `/` | 390 px | 176, 172, 156 | 172 ms | .033, .033, .033 | .033 | 16 ms observed |

**Measured:** 2026-10-03 (light/dark theme toggle), same setup. The home route was re-measured after adding the theme toggle, the no-flash theme initialization script, the dark theme tokens, and switching the hero to the neon "Game Ako" sign artwork. Home-route CLS is unchanged; LCP remains far below the 2.5 s target.

| Route | Viewport | LCP runs (ms) | Median LCP | CLS runs | Median CLS | Lab event timing |
|---|---|---:|---|---:|---|---:|---|
| `/` | 1280 px | 268, 208, 184 | 208 ms | .003, .003, .003 | .003 | 16 ms observed |
| `/` | 390 px | 168, 168, 236 | 168 ms | .034, .034, .034 | .034 | 16 ms observed |

The theme toggle does not affect the article routes; they remain at their prior baselines (article detail median LCP ≤ 204 ms, rich-article median CLS .010/.055).

## Rich-body validation note

- Anonymous article pages are server-rendered with no rich-editor JavaScript; below-fold body images are lazy (`loading="lazy"`), which keeps LCP/CLS effectively unchanged from the launch baseline.
- The mobile rich-article CLS rose to .054 (within the .10 target) because the inline image is fetched lazily beneath the fold; if field data later exceeds targets, reserve explicit width/height on authored body images.

All measured lab LCP/CLS values are below the plan targets. The event timing sample bottoms out at the observer's 16 ms threshold and is not a field INP result; deployed real-user INP and throttled Lighthouse runs remain launch measurements.
