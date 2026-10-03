# Research: Richtext Article Body

**Date**: 2026-10-03
**Scope**: Resolve planning decisions for making the article body a rich-text field with automatically stored inline images, per [spec.md](spec.md).

## Decision: Adopt Tiptap (open-source core) as the rich-text editor

- **Decision**: Use the Tiptap editor (`@tiptap/react` v3) with its `StarterKit` and `Image` extensions in the contributor authoring area. Build a headless editor whose toolbar matches the site's matte brand styling.
- **Rationale**: Tiptap is built on ProseMirror, is MIT-licensed and actively maintained, has first-class React 19 / Next.js 16 support, and is headless, so it does not fight the existing design system. `StarterKit` provides the exact formatting set required (headings, bold/italic, bulleted/numbered lists, block quotes, links) and `@tiptap/extension-image` provides inline images; the standard image-upload flow (pick file → upload → insert URL) matches the server-action upload pattern the project already uses for cover images.
- **Alternatives considered**: Lexical (Meta) performs well but ships no ready image node — building custom image nodes and drag/drop is more effort than a small contributor team needs. Quill 2 has no first-class React bindings. Slate is effectively unmaintained. MDX Editor/Milkdown is markdown-first rather than true WYSIWYG. The current plain `<textarea>` cannot represent formatting or inline images.
- **Sources**: [Tiptap](https://tiptap.dev); [Tiptap React installation](https://tiptap.dev/docs/editor/getting-started/install/react); [ProseMirror](https://prosemirror.net/); existing `apps/web` editor at `src/components/articles/article-editor.tsx`.

## Decision: Store sanitized rich HTML in the existing `articles.body` column

- **Decision**: The editor outputs HTML (`editor.getHTML()`), a sanitization allowlist is applied on save, and the sanitized HTML is stored in the existing `articles.body` `text` column. No column type change or migration of stored bodies is required. Legacy plain-text bodies are detected at render time and converted to paragraphs exactly as today.
- **Rationale**: `articles.body` is unbounded `text`, HTML round-trips cleanly through Tiptap, and downstream code paths (schema, actions, queries) keep working. Plain-text detection uses a safe heuristic — a body that does not start with an HTML block tag is legacy text — so older articles require no re-entry. Rendering server-side from stored HTML keeps rich content available to anonymous readers without shipping an editor bundle.
- **Alternatives considered**: Storing Tiptap's JSON (`JSONOutput`/`generateJSON`) preserves structure precisely but forces a parser/render contract on every consumer and complicates the existing simple text column. Storing Markdown loses formatting fidelity. A separate rich-content table or column adds schema churn for no required benefit.
- **Sources**: [Tiptap generating HTML](https://tiptap.dev/docs/editor/getting-started/commands#generate-html); existing `articles` table in `supabase/migrations/0001_core_schema.sql`; existing renderer `src/components/articles/article-content.tsx`.

## Decision: Upload inline images through a dedicated server action into a new public `article-images` bucket

- **Decision**: Add an `uploadArticleBodyImage` server action that authorizes the session (contributor/admin), validates the file (magic-byte content check, JPEG/PNG/WebP, ≤ 10 MiB), uploads it under `<user-id>/<random-uuid>.<ext>` into a new public bucket `article-images`, and returns the public URL. The Tiptap Image button calls this action and inserts the returned URL as the image `src`. Memory bytes and format checks reuse the helpers generalized from `article-cover.ts`.
- **Rationale**: The existing cover flow already proves this pattern end to end — magic-byte validation, storage RLS keyed on `auth.uid()` folder ownership, and cleanup on replace. A dedicated action keeps uploads off the article-save form (each body image can be 10 MiB; inserting several images into one save could exceed the 11 MiB server-action limit), and inserting a real URL gives immediate, reliable draft previews.
- **Alternatives considered**: Uploading through the article-save form (like the cover today) couples large multi-image saves to one server action and its size limit. Client-side uploads with parallel signed uploads add token management with no security benefit at this scale. Embedding images as base64 inside the body bloats the row and bypasses the storage service.
- **Sources**: `supabase/migrations/0007_article-cover-storage.sql`; `src/features/articles/article-cover.ts`; `src/features/articles/actions.ts` (server action upload path); [Supabase storage](https://supabase.com/docs/guides/storage).

## Decision: Track inline-image references in a new table and clean up on save

- **Decision**: Create `public.article_body_images` (`storage_path`, `article_id`, unique on the pair) and maintain it inside `saveArticle`: parse the new body for stored image paths, reconcile the article's rows (delete paths no longer referenced), and delete bucket objects for paths no longer referenced by any article, best-effort with logged warnings.
- **Rationale**: The spec (FR-010) requires orphan cleanup so storage does not accumulate. A reference table makes cleanup correct when the same image URL is legitimately reused across articles or survives multiple saves, and it is testable at the database boundary with pgTAP. Storage-object deletion reuses the existing bucket policy: contributors delete objects in their own user folder, admins delete any.
- **Alternatives considered**: Diffing only the previous/new body strings inside the action avoids a new table but wrongly deletes files that another article or an unchanged draft still references. No cleanup at all fails FR-010 and grows storage unboundedly.
- **Sources**: `spec.md` FR-010 and edge cases; [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security); storage policy patterns in `supabase/migrations/0007_article-cover-storage.sql`.

## Decision: Sanitize authored HTML on save and on render; render body images with responsive CSS

- **Decision**: Apply a single documented HTML allowlist at two boundaries — sanitize-html on save (canonical stored form) and again when a server component renders `articles.body` for readers (defense-in-depth against later out-of-band edits). Legacy plain-text bodies are converted to paragraphs; authored HTML is served only after passing the allowlist. Body images render as plain `<img>` elements scoped by `.story__body img { max-width: 100%; height: auto; }` with lazy loading below the fold, so images always fit the reading column without horizontal scroll.
- **Rationale**: Authored content is untrusted (FR-012); sanitizing at both the write and read boundaries keeps public pages safe even if stored content changes outside the application. Pure-CSS fitting is the most direct way to satisfy FR-007/FR-008 regardless of an image's intrinsic dimensions, works without reader-side JavaScript, and reuses the already-configured Supabase storage `remotePatterns` if `next/image` is adopted later. Below-fold images load lazily so they do not delay the rest of the article.
- **Alternatives considered**: Trusting stored HTML at render time fails the security gate. Sanitizing only client-side leaves readers without JavaScript unsafe. Converting every `<img>` to `next/image` requires knowing intrinsic dimensions for arbitrary authored images and adds layout risk without improving container fitting, which the contract requires regardless.
- **Sources**: [sanitize-html](https://github.com/apostrophecms/sanitize-html); existing `articles.body` render path in `src/components/articles/article-content.tsx`; `next.config.ts` existing `remotePatterns`.

## Resolved planning unknowns

- **Editor choice**: Tiptap (open-source core) — React 19/Next 16 compatible, headless, includes the required formatting set and an Image extension.
- **Body storage**: Sanitized HTML in the existing `articles.body` text column; legacy plain-text bodies remain renderable with no re-entry.
- **Image upload**: A dedicated server action → new public `article-images` bucket, mirroring the `article-covers` RLS and validation patterns.
- **Image lifecycle**: New `article_body_images` reference table reconciled on save; orphaned paths removed from storage best-effort.
- **Safe rendering**: Sanitization at save and render; plain responsive `<img>` CSS for container fitting and lazy below-fold loading.
- **Remaining items**: None. No unresolved architecture choices remain for Phase 1.