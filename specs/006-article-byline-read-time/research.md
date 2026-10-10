# Research: Article Author Byline and Read Time

## 1. How readers can see the author's name

- **Decision**: Expose the byline through a new public view, `public_article_bylines`, granted to `anon` and `authenticated`.
- **Rationale**: `public.accounts` has only self/admin select policies (`0001`, `0006`), so anonymous readers cannot join it directly. The repo already solves this for comments with `public_comments` (`0004`), which joins `accounts` and exposes only `display_name`. Reusing that pattern keeps the security model consistent and does not weaken `accounts` RLS.
- **Alternatives considered**:
  - *Loosen `accounts` RLS to allow public reads*: rejected. It would expose `username` and any future columns for every account, against Principle IV.
  - *Fetch the author server-side with the service role*: rejected. It adds a privileged path into a public page and bypasses the database-level control the project already uses.
  - *Store the author name on the article row*: rejected. It duplicates data and goes stale when a display name changes.

## 2. Byline display rule

- **Decision**: `byline = nullif(trim(display_name), '')` falling back to `username`. If no row exists for the article (no assigned or resolvable author), the UI shows the neutral label "Game Ako Chronicles staff".
- **Rationale**: Matches FR-002 and FR-012 and the spec edge cases. Doing the coalesce in SQL keeps the view as the single source of the rule; the TS fallback is only for the missing-row case.
- **Resolved**: `public.accounts` has `status text not null default 'active' check (status in ('active', 'disabled'))` (`0001_core_schema.sql`). Disabled accounts cannot sign in or comment, but the spec requires disabled authors to keep their byline on existing articles. Decision: the view does **not** filter on `accounts.status`. It joins on `author_id` and filters only on `articles.status = 'published'`.

## 3. Read time algorithm

- **Decision**: Pure function `estimateReadMinutes(body: string): number`:
  1. If the body is legacy plain text (`isPlainTextBody`), use the raw text.
  2. Otherwise strip markup with the same tag-stripping approach used by `richBodyHasContent`, so `<img>` contributes no text and attributes such as `alt` are not counted.
  3. Collapse whitespace, split on spaces, count non-empty tokens.
  4. `minutes = max(1, ceil(words / 200))`.
- **Rationale**: Spec assumption of ~200 wpm, rounded up, minimum 1 (FR-003, FR-004, FR-005). Reusing the existing `isPlainTextBody` detection keeps legacy and rich bodies consistent (spec edge case "Legacy plain-text articles").
- **Alternatives considered**:
  - *Parse HTML with a DOM parser on the server*: rejected. It adds a dependency and cost for no gain over tag stripping on already-sanitized content.
  - *Use `sanitize-html` with `allowedTags: []` to extract text*: viable, and it handles entities better. Chosen only if entity handling (`&amp;`, `&nbsp;`) affects counts materially; the unit tests should cover entities either way.
  - *Store `read_minutes` on save*: rejected. The spec requires no migration for existing articles and no stored value (Assumption "No stored read time").

## 4. Where the header content lives

- **Decision**: Render the byline and read time inside the existing `<header className="story__header">` in `ArticleContent`, after the title and date, as text (not images).
- **Rationale**: FR-008 and FR-011 require them presented together in the header and exposed as readable text. Keeping them in the same component avoids a second header and keeps the existing date and title untouched (FR-013).
- **Accessibility**: Use plain text ("By {name} · {N} min read") inside a `<p>`, with the author name as normal text. No icon-only indicators. Verify contrast with `@axe-core/playwright` in both themes.

## 5. Testing approach

- **Decision**:
  - Vitest unit tests for `estimateReadMinutes`: empty body, image-only body, legacy plain text, markup excluded, rounding up, long article growth.
  - Vitest unit test for the byline selection and "staff" fallback.
  - pgTAP test: anon can select from `public_article_bylines`; the view exposes no `email` or role columns; drafts and removed articles are excluded.
  - Playwright: public article shows byline and read time; accessibility spec covers the article page in both themes.
- **Rationale**: Principle II requires unit and integration coverage and automated execution.
