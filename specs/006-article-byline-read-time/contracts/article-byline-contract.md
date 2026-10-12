# Contract: Article Byline and Read Time

This feature exposes data to readers through the public article page and a read-only database view. It has no write interface.

## 1. Database contract: `public_article_bylines`

- **Access**: `select` granted to `anon` and `authenticated`.
- **Columns**: exactly `article_id`, `display_name`, `username`. No other columns may be added without a spec update, because it would expose account data publicly.
- **Rows**: one per published article with an author. Non-published articles produce no rows.
- **Guarantees**: no email, role, or status column is readable through this view.

## 2. Application contract: `getArticleByline`

Location: `apps/web/src/features/articles/queries.ts`

```ts
export type ArticleByline = { displayName: string | null; username: string };

export async function getArticleByline(articleId: string): Promise<ArticleByline | null>;
```

- Returns `null` when no row exists (no author resolvable). Caller renders the staff fallback.
- Throws `Error("Could not load this article's author.")` on query error, matching the existing error style in `queries.ts`.

## 3. Application contract: `estimateReadMinutes`

Location: `apps/web/src/features/articles/read-time.ts`

```ts
export function estimateReadMinutes(body: string): number;
```

- Pure and synchronous. Returns an integer `>= 1`.
- Uses 200 words per minute, rounded up.
- Excludes markup and images.

## 4. UI contract: article header

Rendered by `ArticleContent` inside `<header className="story__header">`, after the title and date.

Props change:

```ts
export function ArticleContent({ article, byline, readMinutes }: {
  article: Article;
  byline: ArticleByline | null;
  readMinutes: number;
}): JSX.Element;
```

Rendered text:

- Byline: `By {name}` where `name = displayName ?? username`, or `By Game Ako Chronicles staff` when `byline` is `null`.
- Read time: `{readMinutes} min read`, always with an integer of at least 1.
- Both are plain text inside a single `<p className="story__meta">`, ordered byline then read time, so screen readers announce author before read time.

Constraints:

- No horizontal overflow at phone widths.
- Text contrast meets the project target in light and dark themes.
- Existing title, type label, date, cover image, body, and comments are unchanged.

## 5. Page contract: `/articles/[slug]`

- Fetches the byline in parallel with the existing comments and session fetch.
- Returns the same HTTP status and `notFound()` behavior as before for unpublished or missing articles.
- Drafts and previews are not affected; they are rendered by the admin preview route, which is out of scope.
