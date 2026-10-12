# Data Model: Article Author Byline and Read Time

No tables or columns are added or changed. This feature adds one read-only view and derives one value at render time.

## Existing entities (read-only use)

### Article (`public.articles`)

| Field | Use in this feature |
|-------|---------------------|
| `id` | Join key to the byline view |
| `slug` | Lookup on the public page (unchanged) |
| `body` | Source for read time (legacy plain text or sanitized rich HTML) |
| `author_id` | Links to `accounts.id` through the byline view |
| `status` | Only `published` articles appear in the byline view |

### Account (`public.accounts`)

| Field | Use in this feature |
|-------|---------------------|
| `id` | Join key |
| `username` | Fallback byline name (FR-002) |
| `display_name` | Preferred byline name when set (FR-002) |

Account email, roles, and any other columns are never exposed by this feature.

## New view: `public.public_article_bylines`

Defined in migration `0009_article-bylines.sql`.

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `article_id` | uuid | `articles.id` | Primary key of the view (one row per published article) |
| `display_name` | text | `accounts.display_name` | Nullable; trimmed empty strings are treated as null in SQL |
| `username` | text | `accounts.username` | Always present |

Selection rule:

- Inner join `articles` to `accounts` on `author_id`.
- Filter `articles.status = 'published'`.
- Grant `select` to `anon` and `authenticated`.

Articles with no resolvable author have no row. The application renders the neutral fallback in that case (see contract).

Validation and state rules:

- The view is read-only. No insert, update, or delete grants.
- Draft, preview, and removed articles produce no row, so their bylines are never exposed publicly (spec: drafts and previews unaffected).

## Derived value: read time

Not stored. Computed by `estimateReadMinutes(body)` in `apps/web/src/features/articles/read-time.ts` each time the public article renders.

| Input | Output |
|-------|--------|
| Body with no readable words (empty, image-only, markup-only) | `1` |
| Body with N readable words | `max(1, ceil(N / 200))` |

Rules:

- Markup and image elements contribute no words.
- Legacy plain-text bodies are counted directly.
- Output is always a positive integer.

## Relationships

- `articles.author_id` → `accounts.id` (existing foreign key)
- `public_article_bylines.article_id` → `articles.id` (view definition)
