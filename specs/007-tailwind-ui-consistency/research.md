# Research: Site-Wide UI Consistency

## 1. Tailwind CSS 4 with Next.js 16

- **Decision**: Install `tailwindcss` and `@tailwindcss/postcss` (both 4.3.x, the current release). Add `postcss.config.mjs` with the `@tailwindcss/postcss` plugin. Start `globals.css` with `@import "tailwindcss";`.
- **Rationale**: The bundled Next.js docs (`01-app/01-getting-started/11-css.md`) describe exactly this setup for Next 16 with Turbopack. Turbopack runs PostCSS config files natively (`08-turbopack.md`), so no custom build step is needed.
- **Alternatives considered**:
  - *Tailwind 3 with `tailwind.config.js`*: rejected. The request specifies Tailwind 4, and v4 moves configuration into CSS.
  - *Tailwind via the Vite or CLI plugin*: not applicable to Next.js.

## 2. Dark and light appearances

- **Decision**: Keep the `data-theme` attribute on `<html>` as the only switch. Declare a custom dark variant with `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`, as the Tailwind dark-mode docs describe for a data attribute.
- **Rationale**: The existing theme system already sets `data-theme` before paint (the inline script in `layout.tsx`), has an e2e suite (`theme-toggle.spec.ts`), and stores the choice under `game-ako-theme`. Changing the mechanism would risk the no-flash behavior the project already tests.
- **Alternatives considered**:
  - *Default `prefers-color-scheme` dark variant*: rejected. The site defaults to light even when the OS prefers dark (`theme-toggle.spec.ts`: "a first visit stays light even when the device prefers dark").
  - *A `.dark` class on `<html>`*: rejected. It would change the existing attribute contract that tests and the init script depend on.

## 3. Palette and tokens

- **Decision**: Keep the existing CSS custom properties (`--blue`, `--red`, `--yellow`, `--white`, `--ink`, `--muted`, `--line`, `--paper`, `--card`, `--field-line`, and the `--danger-*`, `--success-*`, `--notice-*` groups) on `:root` and `[data-theme="dark"]`. Expose them to Tailwind with `@theme inline`, mapping each to a color name (for example `--color-brand: var(--blue)`), so utilities like `bg-brand` and `text-danger` resolve to the active theme's value.
- **Rationale**: One token source keeps both appearances in sync automatically. Using `inline` makes utilities read the live variable, so switching `data-theme` recolors everything with no class changes.
- **Success green (FR-009, Option C)**: add a muted matte green pair, one per appearance:
  - Light: a deep, low-saturation green for text and borders on white and the existing `--success-bg` tint.
  - Dark: a softer green that keeps contrast on the dark surface.
  - Exact hex values are chosen during implementation and must pass the project contrast check (see §7). Candidate starting points: light `#2e6b4f`, dark `#7fd1a3`.
- **Alternatives considered**:
  - *Replace the variables with Tailwind's default palette*: rejected. It would drop the brand colors the spec requires.
  - *Hard-code colors in utilities*: rejected. Each theme would need every class duplicated.

## 4. Shared element components vs. utility classes in each page

- **Decision**: Create a small `ui/` set (Button, TextField/TextArea/Select, Checkbox, Message). Each component defines its variants and states in one typed map. Pages compose components and do not style raw `button`, `input`, or `select` elements.
- **Rationale**: The current inconsistency comes from styling being scoped by container (for example `.form-stack button`, `.review-item button`, `.people-filters__field select`), so the same element looks different per page. A single component is the only way to guarantee one look and one set of states, which the spec requires (FR-002, FR-003, FR-016).
- **Variant mechanism**: a plain TypeScript map from variant name to a class string, plus a `cn` helper that joins strings and drops falsy values. No `class-variance-authority` or `tailwind-merge` dependency, because the variant set is small and fixed.
- **Alternatives considered**:
  - *`class-variance-authority` (cva)*: viable, but adds a dependency for a handful of variants. Rejected to keep the dependency list small.
  - *Only `@apply` component classes in CSS*: viable, but the spec's goal is one component definition per element; TSX components enforce usage in code review and in tests more directly.

## 5. Keeping test hooks working

- **Decision**: Keep the existing semantic class names on markup where the test suite selects them (`form-error`, `form-success`, `admin-list`, `review-item`, `comment-list`, `people-row__*`, `story__body`, `story__byline`, `story__read-time`, `masthead__motto`, `masthead__mark`, `site-footer__*`, `rich-editor`, `comment-section`, `pagination`). These classes carry no styling after migration; styling comes from Tailwind utilities or the shared components.
- **Rationale**: The e2e suite (about 48 tests) and unit tests select these classes. Renaming them would be a large test change unrelated to the spec. Keeping them preserves FR-016 and makes the migration reviewable.
- **Alternatives considered**:
  - *Switch all tests to `data-testid` or roles*: rejected for this feature. It improves test robustness but changes many tests at once; can be a later cleanup.

## 6. Preflight and existing global rules

- **Decision**: Keep Tailwind's preflight (the default base reset). Re-declare the few global rules the site depends on in `globals.css` (body font and color, `html` background, the focus-visible outline using `--gold`, `scroll-behavior`, the reduced-motion rule).
- **Rationale**: Preflight normalizes margins and element defaults, which is part of "consistent elements". The site-specific base rules are few and intentional.
- **Impact to verify**: preflight changes heading margins, list styles, and button defaults. These are expected changes that the screenshot review covers.

## 7. Verification approach

- **Visual baseline (before migration)**: capture Playwright screenshots of the key pages (home, article detail, sign-in, sign-up, password, article editor, article preview, moderation, people list, comment area) at 390 px and 1440 px in both appearances, and store them as the pre-migration reference.
- **Visual check (after migration)**: compare against the baseline. Expected differences (spacing from preflight, button and field styles) are reviewed and accepted per page. Unexpected layout breaks fail the check.
- **Accessibility**: axe checks already cover the key pages. Extend them to the new variants (all five button purposes, text fields, checkboxes, messages) in both appearances. Contrast must meet the project target for the new success green.
- **Performance**: run `npm run performance` against a production build before and after the change, using the procedure in `docs/operations/performance-baseline.md`. Compare LCP and CLS. Also compare the size of the generated CSS.
- **Dependencies**: run `npm audit` after installing Tailwind (Constitution IV).

## 8. Known risks

- **Test selector drift**: an accidental class rename would break many e2e tests. Mitigation: §5 keeps the hooks.
- **Visual regression from preflight**: mitigation: §7 visual baseline.
- **Rich-text editor**: its toolbar and content area use separate styling today (`rich-button`, `rich-editor__content`). Mitigation: migrate it last and verify the toolbar, focus, and active states against the existing e2e tests (`richtext-authoring.spec.ts`).
- **Matte success green contrast**: a new color may fail the contrast target on one appearance. Mitigation: choose values during implementation and verify with axe before merge.
