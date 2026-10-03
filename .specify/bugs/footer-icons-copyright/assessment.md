# Bug Assessment: Footer social links use text instead of icons; placeholder line should become a copyright notice

- **Slug**: footer-icons-copyright
- **Created**: 2026-10-03
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: low

## Report (verbatim or summarized)

> Adjust the social links in the footer instead of using text use social media icons. The "Channel links go here..." text should change to all rights reserved.

No URL was supplied; this is a pasted, verbatim request. It is a small presentation/content change request rather than a defect, but it is grounded in current code and clearly actionable.

## Symptom

Observed: the site footer renders the three social entries as plain text links ("Facebook", "YouTube", "Twitch") and shows the placeholder sentence "Channel links go here — coming soon." beneath them. Expected: the social entries render as recognizable social-media icons, and the placeholder sentence is replaced by an "All rights reserved" copyright line.

## Reproduction

1. Start the app and open any page (e.g. `/`).
2. Scroll to the footer.
3. Observe that the social area shows the text labels **Facebook**, **YouTube**, **Twitch** and the line "Channel links go here — coming soon."
4. Open in both light and dark themes (the new theme toggle) to confirm both surfaces.

No [NEEDS CLARIFICATION] required for reproduction; behavior is deterministic static markup.

## Suspected Code Paths

- `apps/web/src/components/site-footer.tsx:1-5` — `socialLinks` defines `{ name, href }` entries; `name` is rendered as the link's visible text.
- `apps/web/src/components/site-footer.tsx:17-21` — the `<ul className="site-footer__social-list">` maps each social to `<a>{name}</a>`, with no icon and no `aria-label`.
- `apps/web/src/components/site-footer.tsx:22` — `<p className="site-footer__forthcoming">Channel links go here — coming soon.</p>` is the text to replace with a copyright line.
- `apps/web/src/app/globals.css:152-155` — `.site-footer__social-list` layout and `.site-footer__social-list a` / `:hover` styles are sized for text; icon sizing (min target, alignment, hover/focus) will need adjustment. `.site-footer__forthcoming` styling applies to the placeholder line.
- `apps/web/tests/e2e/footer-socials.spec.ts:3-16` — asserts visible link names (still satisfiable via `aria-label`) and asserts `.site-footer__forthcoming` contains `/coming soon/i`; the latter will fail once the text changes and must be updated.
- `apps/web/tests/e2e/accessibility.spec.ts:27` — asserts the first social link is visible; relevant to icon-only link accessibility (axe checks accessible name).

## Root Cause Hypothesis

Confidence: **high**. The footer was built for the prior branding feature (003) with text labels and an explicit "coming soon" placeholder affordance to guide the owner before real URLs existed. The requested change is a straightforward presentation/content update to that existing markup and its associated styles and tests. There is no logic bug; the "root cause" is simply the current text-based implementation.

## Proposed Remediation

**Preferred**: Keep the change dependency-free by rendering inline SVG icons (no icon library is present in `apps/web/package.json`). In `site-footer.tsx`, give each entry an icon renderer and render `<a href={href} rel="noopener noreferrer" aria-label={name}>` containing an `aria-hidden` SVG that uses `currentColor` (so it inherits the footer's `--on-brand` color and the existing yellow hover). Because the icons are icon-only, the `aria-label` is required so the links retain accessible names ("Facebook", "YouTube", "Twitch") and continue to pass `getByRole("link", { name })` and axe checks. Replace the `<p className="site-footer__forthcoming">…</p>` with a legal line such as `© {new Date().getFullYear()} Game Ako Chronicles. All rights reserved.` (`site-footer.tsx` is a server component, so a computed year is safe). Update `globals.css` so `.site-footer__social-list a` is an inline-flex target of at least ~24×24 px with visible focus, sized SVG (`width/height: 24px`), and a hover color; restyle or rename `.site-footer__forthcoming` to a `.site-footer__legal` class for the copyright line (renaming is clearer but optional).

**Alternatives**:
- Add a small icon package (e.g. `lucide-react`/`react-icons`). Rejected: introduces a new production dependency for three glyphs, contradicting the feature's zero-dependency approach and the constitution's preference for simple, reviewed changes.
- Keep text labels and add icons alongside them. Rejected: contradicts the explicit request to use icons instead of text; also increases footer width.

**Files likely to change**:
- `apps/web/src/components/site-footer.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/tests/e2e/footer-socials.spec.ts`
- (possibly) `apps/web/tests/e2e/accessibility.spec.ts`

**Tests to add or update**:
- Update `footer-socials.spec.ts`: assert the three links remain present by accessible name (`aria-label`), assert each contains a decorative `<svg>` (e.g. `aria-hidden="true"`), and replace the `coming soon` assertion with a copyright assertion (e.g. `.site-footer__legal` matches `/all rights reserved/i` and a year).
- Keep the placeholder-destination behavior assertion (`href="#"` keeps the visitor on the site) so the owner can still swap in real URLs with a single-line edit.
- Confirm `accessibility.spec.ts` still passes: axe must see an accessible name for each icon-only link and the icon must be hidden from assistive tech.

## Risks & Considerations

- **Accessibility regression (primary risk)**: icon-only links without an accessible name fail axe and screen readers. Mitigate with `aria-label` plus `aria-hidden` SVGs.
- **Contrast/focus in both themes**: icons must meet contrast and show a visible focus indicator on the dark `--brand-band` surface; reuse `currentColor` + the existing yellow hover, and verify focus outlines.
- **Test drift**: the current "coming soon" assertion and any text-name assumptions will break; tests must be updated in the same change.
- **Loss of the "forthcoming" affordance**: removing "coming soon" makes the `#` placeholders less obviously temporary. Acceptable per the request; keep `href="#"` and `rel` so the owner still only edits one line per link.
- **No data/security/migration impact**: static presentation only; no API, schema, or performance change.

## Open Questions

- None blocking. [NEEDS CLARIFICATION: whether the copyright should name the owner/brand exactly as "Game Ako Chronicles" and show a computed current year vs. a fixed year — assumed yes to both.]
