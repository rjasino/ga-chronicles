# Bug Fix: Article video embeds and body links

- **Slug**: article-video-embed-links
- **Fixed**: 2026-10-31
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Added an authoring flow and safe rendering for YouTube video embeds in article bodies. Article-body links now always open in a new tab with `rel="noopener noreferrer"`, while links outside article bodies retain their existing behavior.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `apps/web/package.json` | modified | Added `@tiptap/extension-youtube` on the TipTap 3.31.4 line. |
| `apps/web/package-lock.json` | modified | Locked the YouTube extension to 3.31.4. |
| `apps/web/src/features/articles/richtext/extensions.ts` | modified | Registered YouTube embeds with privacy-enhanced host, dimensions, lazy loading, and descriptive title; configured editor links with safe new-tab attributes. |
| `apps/web/src/features/articles/richtext/editor.tsx` | modified | Added a video URL form, URL validation, and clear unsupported-host feedback. |
| `apps/web/src/features/articles/richtext/rich-html.ts` | modified | Added the YouTube iframe/wrapper allowlist, host and HTTPS restrictions, forced safe link attributes, lazy embed attributes, and rejection of frames whose source was stripped. |
| `apps/web/src/app/globals.css` | modified | Added responsive 16:9 iframe styling for the article body and editor. |
| `apps/web/tests/unit/articles/rich-html.test.ts` | modified | Covered allowed YouTube hosts, rejected unsafe/unapproved iframe sources, link rewrites, sanitizer idempotency, and video-only body validation. |
| `apps/web/tests/unit/articles/richtext-editor.test.tsx` | modified | Covered YouTube watch-URL insertion and invalid-host feedback without body changes. |
| `apps/web/tests/unit/articles/article-content.test.tsx` | modified | Covered rendered body links/embeds and confirmed a site navigation link remains unchanged. |
| `specs/002-richtext-article-body/contracts/rich-body-contract.md` | modified | Documented the YouTube-only iframe exception and safe new-tab link behavior. |

## Diff Highlights

- Standard YouTube URLs are normalized by TipTap to `youtube-nocookie.com` embed URLs.
- `sanitizeRichHtml` forces article links to `target="_blank" rel="noopener noreferrer"`; iframes are HTTPS-only and host-allowlisted.
- Responsive iframe styling uses a 16:9 aspect ratio in both reader and editor views.

## Tests Added or Updated

- `apps/web/tests/unit/articles/rich-html.test.ts` — verifies YouTube and YouTube-nocookie embeds survive, unsafe/unapproved/protocol-relative sources are dropped, body links are rewritten, re-sanitization is idempotent, and video-only bodies count as content.
- `apps/web/tests/unit/articles/richtext-editor.test.tsx` — verifies watch URLs insert an embed and unsupported hosts show an error without changing the body.
- `apps/web/tests/unit/articles/article-content.test.tsx` — verifies rendered article links and approved embeds while a non-body navigation link remains unchanged.

## Local Verification

- Commands run: `npm run test:unit -- tests/unit/articles/rich-html.test.ts tests/unit/articles/richtext-editor.test.tsx tests/unit/articles/article-content.test.tsx` → passed, 3 files / 38 tests.
- Commands run: `npm run typecheck` → passed (`tsc --noEmit`).
- Commands run: `npx eslint src/features/articles/richtext/editor.tsx src/features/articles/richtext/extensions.ts src/features/articles/richtext/rich-html.ts tests/unit/articles/rich-html.test.ts tests/unit/articles/richtext-editor.test.tsx tests/unit/articles/article-content.test.tsx` → passed.
- Commands run: `git diff --check -- <changed files>` → passed; only Git line-ending warnings were reported.
- Manual checks: reviewed the host-restricted iframe config and verified the sanitizer and reader tests cover legacy/render-time link behavior. No browser-based manual check was run.

## Deviations from Assessment

- Added an `exclusiveFilter` after testing showed `sanitize-html` strips an unapproved iframe's `src` but leaves an empty iframe element. This ensures rejected hosts leave no frame markup.
- Updated `richBodyHasContent` so an article containing only a valid video is accepted by the existing save validation; without this, video-only bodies would still be rejected.

## Follow-ups

- Run `/speckit.bug.test slug=article-video-embed-links` for the dedicated bug-test workflow.
- Consider browser-level verification of the responsive player in public and draft-preview pages.
