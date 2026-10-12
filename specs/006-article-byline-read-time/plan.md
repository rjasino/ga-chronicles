# Implementation Plan: Article Author Byline and Read Time

**Branch**: `006-article-byline-read-time` | **Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-article-byline-read-time/spec.md`

## Summary

Show the article author (display name, falling back to username, or a neutral staff label) and an estimated read time in whole minutes in the article header of the public article page (`/articles/[slug]`).

Technical approach:

- **Byline data**: anonymous readers cannot read `public.accounts` (only self/admin select policies exist). Add a migration creating a `public_article_bylines` view that exposes only `article_id`, `display_name`, and `username` for published articles, mirroring the existing `public_comments` view pattern. No emails or roles are exposed.
- **Read time**: computed at render time from the article body (no stored value, no migration for existing articles). A pure helper strips markup and images, counts words, and divides by 200 wpm, rounded up, minimum 1.
- **Presentation**: rendered as text in the existing `story__header` block of `ArticleContent`, alongside the type, title, and date. Styling follows the existing header and light/dark tokens.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 19, Next.js 16 (App Router, async `params`)

**Primary Dependencies**: `next`, `@supabase/ssr` / `@supabase/supabase-js`, `sanitize-html` (existing article body sanitization), `zod`; tests via `vitest`, `@testing-library/react`, `@playwright/test`, `@axe-core/playwright`

**Storage**: Supabase Postgres. One new migration (`supabase/migrations/0009_article-bylines.sql`) adds a read-only view. No table or column changes; no stored read time.

**Testing**: Vitest unit tests (`apps/web/tests/unit/articles/`), pgTAP database tests (`supabase/tests/database/`, run via `npx supabase test db`), Playwright e2e (`apps/web/tests/e2e/`) including the accessibility spec

**Target Platform**: Web (desktop and mobile browsers), light and dark appearances

**Project Type**: Web application (Next.js app in `apps/web` with Supabase backend)

**Performance Goals**: No measurable regression on the public article page. The byline query runs in parallel with the existing comments fetch; read time is a pure in-memory computation over the body already loaded. Measure with `npm run performance` against `docs/operations/performance-baseline.md` before merge (Principle V).

**Constraints**: Only display name or username is public (no email, no roles). Byline and read time must not cause horizontal scrolling at phone widths. Contrast must meet the project target in both appearances. No change to existing content, date, comments, or navigation (FR-013). Drafts, previews, and removed articles are unaffected.

**Scale/Scope**: Single article page and its header; one view; one helper module. Roughly the size of the existing comments display feature.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality | Follows existing conventions (`features/<area>/` modules, view pattern from `0004`, `ArticleContent` component). Code reviewed before merge. | PASS |
| II. Testing Standards | Unit tests for the read-time helper and byline fallback; pgTAP test for the view's anon access and column set; e2e assertions on the public page. | PASS (planned) |
| III. UX Consistency | Uses existing header typography and light/dark tokens; labeled "min read"; no new visual language. Usability feedback to be requested with the launch review. | PASS |
| IV. Security | View exposes only `display_name` and `username` for published articles; no `email`, `roles`, or private tables are reachable by anon. Input is never rendered as HTML (text only). | PASS |
| V. Performance | One small extra query issued in parallel; read time is O(body length) in memory. Benchmark against baseline before merge. | PASS (benchmark required before merge) |

**Result**: No violations. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/006-article-byline-read-time/
├── plan.md                          # This file
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── quickstart.md                    # Phase 1 output
├── contracts/
│   └── article-byline-contract.md   # Phase 1 output
└── tasks.md                         # Created by /speckit.tasks (not by this command)
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   └── 0009_article-bylines.sql     # NEW: public_article_bylines view + grants
└── tests/database/
    └── article-bylines.test.sql     # NEW: anon access and column-set checks

apps/web/
├── src/
│   ├── app/articles/[slug]/page.tsx     # MODIFIED: fetch byline in parallel, pass to ArticleContent
│   ├── components/articles/article-content.tsx  # MODIFIED: render byline + read time in story__header
│   ├── features/articles/
│   │   ├── queries.ts                   # MODIFIED: add getArticleByline(articleId)
│   │   └── read-time.ts                 # NEW: estimateReadMinutes(body), pure function
│   └── app/globals.css                  # MODIFIED: .story__meta styles (existing tokens only)
└── tests/
    ├── unit/articles/read-time.test.ts  # NEW
    ├── unit/articles/byline.test.ts     # NEW: fallback label and username fallback
    └── e2e/public-articles.spec.ts      # MODIFIED: byline and read time visible; a11y check
```

**Structure Decision**: Extends the existing Next.js web app and Supabase migration sequence. The byline view follows the `public_comments` precedent in migration `0004`. Read-time logic lives in `features/articles/` beside `rich-html.ts`, which already owns body format detection. The component change stays inside `ArticleContent`, which already owns the article header.

## Complexity Tracking

> Not applicable. No Constitution Check violations.
</content>
