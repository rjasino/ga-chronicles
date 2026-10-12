# Quickstart: Article Author Byline and Read Time

Use this guide to validate the feature end to end locally. It does not contain implementation code; see `contracts/article-byline-contract.md` and `data-model.md` for details.

## Prerequisites

- Node.js 24 (`apps/web` engines: `>=24 <25`)
- Docker running (for local Supabase)
- Dependencies installed: `cd apps/web && npm install`

## 1. Start local Supabase and apply migrations

```powershell
npx supabase start
npx supabase db reset
```

`db reset` applies `supabase/migrations/0009_article-bylines.sql` along with the existing migrations and runs `supabase/seed.sql`.

## 2. Run database tests

```powershell
npx supabase test db
```

Expected: `article-bylines.test.sql` passes. It confirms:

- `anon` can select from `public_article_bylines`.
- The view exposes only `article_id`, `display_name`, and `username`.
- Draft and removed articles have no rows in the view.

## 3. Run unit tests

```powershell
cd apps/web
npm run test:unit
```

Expected: `read-time.test.ts` and `article-content.test.tsx` pass, covering:

- Empty, image-only, and markup-only bodies return 1 minute.
- Longer text returns a larger or equal value.
- Legacy plain-text and rich bodies are counted consistently.
- Byline uses display name, then username, then the staff fallback.

## 4. Run typecheck and lint

```powershell
npm run typecheck
npm run lint
```

## 5. Manual check

1. Start the app: `npm run dev`.
2. Open a published article, for example `/articles/a-new-chapter-for-independent-games`.
3. Confirm the header shows `By {author}` and `{N} min read` below the title and date.
4. Resize to a phone width (about 375px). Confirm no horizontal scrolling.
5. Toggle the theme and confirm the text is legible in both appearances.
6. Open a draft preview (`/admin/articles/{id}/preview`) and confirm the public byline is not shown there.

## 6. End-to-end and accessibility

```powershell
npm run test:e2e
npm run test:a11y
```

Expected: `public-articles.spec.ts` asserts the byline and read time text; the accessibility spec reports zero contrast or labeling violations on the article page in both themes.

## 7. Performance check (before merge)

```powershell
npm run performance
```

Compare the public article page results to `docs/operations/performance-baseline.md`. Record the result in the PR description (Principle V).
