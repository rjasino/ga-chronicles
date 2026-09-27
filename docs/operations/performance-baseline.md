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

All measured lab LCP/CLS values are below the plan targets. The event timing sample bottoms out at the observer's 16 ms threshold and is not a field INP result; deployed real-user INP and throttled Lighthouse runs remain launch measurements.
