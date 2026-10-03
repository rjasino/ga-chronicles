# Bug Fix: Footer social links use icons and the placeholder line becomes a copyright notice

- **Slug**: footer-icons-copyright
- **Fixed**: 2026-10-03
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The footer now presents Facebook, YouTube, and Twitch as accessible, dependency-free inline SVG icons instead of text links, and the "Channel links go here — coming soon." placeholder is replaced by a copyright line, "© <year> Game Ako Chronicles. All rights reserved." Placeholder `#` destinations are preserved so the owner can still swap in real URLs with a one-line edit.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `apps/web/src/components/site-footer.tsx` | modified | `socialLinks` now carry an SVG path; each link renders an `aria-hidden` icon with an `aria-label`; replaced the forthcoming paragraph with the copyright line using `new Date().getFullYear()`. |
| `apps/web/src/app/globals.css` | modified | Added `.site-footer__social-link` icon sizing (28px target, 22px SVG), `currentColor` hover; renamed `.site-footer__forthcoming` → `.site-footer__legal` for the copyright line. |
| `apps/web/tests/e2e/footer-socials.spec.ts` | modified | Now asserts icon links by accessible name, decorative SVGs, the copyright text, and that placeholders do not leave the site. |

## Diff Highlights (optional)

```tsx
// apps/web/src/components/site-footer.tsx
<a className="site-footer__social-link" href={href} rel="noopener noreferrer" aria-label={name}>
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d={path} /></svg>
</a>
...
<p className="site-footer__legal">© {new Date().getFullYear()} Game Ako Chronicles. All rights reserved.</p>
```

```css
/* apps/web/src/app/globals.css */
.site-footer__social-link { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; color: var(--on-brand); text-decoration: none; }
.site-footer__social-link svg { width: 22px; height: 22px; display: block; }
.site-footer__social-link:hover { color: var(--yellow); }
.site-footer__legal { margin: 0; color: rgba(255, 255, 255, .62); font-size: .8rem; }
```

## Tests Added or Updated

- `apps/web/tests/e2e/footer-socials.spec.ts` → "the footer presents the channels as accessible social icons" — pins the three links by accessible name (`aria-label`), asserts each contains a decorative (`aria-hidden="true"`) SVG, and that there are exactly three links.
- `apps/web/tests/e2e/footer-socials.spec.ts` → "the footer shows a copyright line and placeholder links never send visitors away" — pins the `© 20xx Game Ako Chronicles … All rights reserved` text and that clicking a placeholder keeps the visitor on the site.

## Local Verification

- Commands run: `npm --prefix apps/web run lint` → PASS (0 errors)
- Commands run: `npm --prefix apps/web run typecheck` → PASS
- Commands run: `npm --prefix apps/web run test:e2e -- tests/e2e/footer-socials.spec.ts tests/e2e/accessibility.spec.ts` → PASS (7 tests)
- Commands run: `npm --prefix apps/web run test:e2e` → PASS (31 tests, full suite)
- Manual checks: none beyond automated browser assertions; the accessibility spec confirms axe reports zero WCAG 2.1 AA violations with the icon-only links in both themes.

## Deviations from Assessment

- The assessment said renaming `.site-footer__forthcoming` to `.site-footer__legal` was optional; the rename was applied for clarity since "forthcoming" no longer describes the content.
- The assessment suggested inline SVG icons; the implementation uses one shared SVG wrapper per link with per-platform path data, avoiding any new dependency as recommended. No other deviations.

## Follow-ups

- The owner should replace each `href="#"` with the real channel URL when available (single-line edit per link, no code changes).
- No further action required for the copyright line; the year is computed at render time.
