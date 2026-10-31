# Bug Assessment: Article bodies cannot embed playable video, and body links open in the same tab

- **Slug**: article-video-embed-links
- **Created**: 2026-10-31
- **Source**: pasted text
- **Verdict**: valid (capability gap, not a regression)
- **Severity**: medium

## Report (verbatim)

> The current implementation of creating new article does not have support on embedded video link eg. YouTube, where the video can be played on the same page. Also add small changes on how anchor tag behave with the created article, always set `target=_blank` with each anchor tag inside an article, this will not affect anchor tag for the whole site just inside the article body.

## Symptom

Authors have no way to insert a video into an article body, and any `<iframe>` they paste is silently removed, so readers can never watch a video without leaving the article. Separately, links authored inside an article body render without `target="_blank"`, so following a citation replaces the story the reader is on. Expected: an author can add a supported video (e.g. a YouTube URL) that plays inline for readers, and every link inside the rendered article body opens in a new tab while the rest of the site's links keep their current behavior.

## Reproduction

1. Sign in as a contributor/admin and open **Admin → Articles → New article** (`/admin/articles/new`).
2. In the rich-text body, try to add a YouTube video. There is no video control in the toolbar (`H1`…`🖼 Image` only); pasting `<iframe src="https://www.youtube.com/embed/…">` into the body source and saving yields a body with the iframe stripped.
3. Add a normal hyperlink with the `🔗 Link` control, save/publish, and open the public article page.
4. Observe: no video is present anywhere, and the link has no `target`/`rel`, so it navigates in the same tab.

## Suspected Code Paths

- `apps/web/src/features/articles/richtext/extensions.ts:7-10` — the editor's capability set is exactly `StarterKit` + `Image`. No video/YouTube node exists, and `@tiptap/extension-youtube` is not in `apps/web/package.json` (confirmed absent from `apps/web/node_modules/@tiptap`).
- `apps/web/src/features/articles/richtext/editor.tsx:121-135` — toolbar exposes headings, marks, lists, quote, link, and image only; there is no video insert action or URL dialog.
- `apps/web/src/features/articles/richtext/rich-html.ts:10-41` — `RICH_HTML_CONFIG.allowedTags` has no `iframe` (or wrapper element), so the sanitizer deletes any pasted embed. `allowedAttributes.a` is only `["href", "title"]`, so even if `target`/`rel` were emitted by the editor they would be stripped here.
- `apps/web/src/features/articles/richtext/rich-html.ts:43-45` and `:113-119` — `sanitizeRichHtml` runs on save (`actions.ts:70`) and again in `renderRichBody` on render (`article-content.tsx:17`), so the same allowlist blocks video at both boundaries.
- `apps/web/src/features/articles/richtext/editor.tsx:106-112` — `applyLink` sets only `{ href }`; no `target`/`rel` is attached to the Link mark.
- `apps/web/src/components/articles/article-content.tsx:17` — the single reader-facing render point (`story__body`), which is where a `target="_blank"` rewrite would take effect for both public pages and the admin draft preview (`apps/web/src/app/admin/articles/[id]/preview/page.tsx:13`).
- `apps/web/src/app/globals.css:129-130` — body link and image styling exists, but there is no `.story__body iframe` rule, so an embed would have no responsive sizing.
- `apps/web/tests/unit/articles/rich-html.test.ts:34,45,58` — existing assertions actively pin the current behavior: exact anchor markup without `target`, `<iframe>` stripped, and `a` allowlist limited to `href`/`title`.

## Root Cause Hypothesis

High confidence. The rich-text pipeline is deliberately allowlist-only: the editor has a fixed TipTap extension set (`extensions.ts:7-10`), and the same sanitizer config governs both persisted and rendered HTML (`rich-html.ts:10-41`). Because `iframe` is not an allowed tag and `target`/`rel` are not allowed `a` attributes, video embeds are removed and link attributes cannot survive a save or render. This is a missing capability rather than a defect in existing behavior — but it is a real product gap, and the requested link behavior is a small, safe change to the same config. Note also that `specs/002-richtext-article-body/contracts/rich-body-contract.md:26` currently promises "no … embedded frames," so this request requires a contract amendment, not just a code change.

## Proposed Remediation

**Preferred**

Add a first-class, host-restricted video node instead of allowing arbitrary iframes:

1. Add `@tiptap/extension-youtube` (pin to the same `^3.31.4` line as the other TipTap packages) and register it in `extensions.ts` with `nocookie: true`, `width`/`height` defaults, and `HTMLAttributes` such as `loading="lazy"` and a `title`. In `editor.tsx`, add a toolbar button ("▶ Video") that opens the existing link-dialog pattern (`linkDraft`) for a YouTube URL, validates the URL, and inserts the node; extend the inline error surface (`imageError`) with a plain-language message for unsupported hosts.
2. Extend `RICH_HTML_CONFIG` narrowly: allow `iframe` (plus the wrapper element the extension emits, e.g. `div` with `data-youtube-video`), allow only `src`, `width`, `height`, `title`, `allow`, `allowfullscreen`, `frameborder`, `referrerpolicy` on `iframe`, and set `allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "youtube.com"]` with `allowedSchemesByTag.iframe: ["https"]`. This keeps the "no arbitrary frames" guarantee while permitting the approved provider.
3. Apply the new-tab rule in the sanitizer config rather than in component markup, so stored HTML and rendered HTML agree: add `target` and `rel` to `allowedAttributes.a`, and use `transformTags.a` to force `target="_blank"` and `rel="noopener noreferrer"` on every anchor. This scopes the behavior to article bodies only — no site-wide `<a>` handling changes. In the editor, also configure `Link.configure({ HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } })` so authors see the same canonical output while editing.
4. Add responsive styling in `globals.css`: `.story__body iframe { display: block; width: 100%; aspect-ratio: 16 / 9; height: auto; margin: 1.6rem auto; border: 0; }` and a matching `.rich-editor__content iframe` rule so the editor preview matches the published layout.

**Alternatives**

- **Custom minimal node (no new dependency)**: a small TipTap `Node` that stores only `{ provider: "youtube", videoId }` and renders the iframe itself. Lower supply-chain surface and full control over output, but more code to own and test, plus a migration concern for existing pasted HTML (none exists today, so this is low risk).
- **Store only the URL and render at read time**: keep `<a>`/custom block with a `data-video-url` attribute and let `renderRichBody` expand it to an iframe. Keeps storage portable and lets embeds be re-rendered if the provider changes, but adds a second rendering path and more regex/markup handling.
- **Allow arbitrary iframes**: simplest config change, but it breaks the existing security contract (`rich-body-contract.md:26`) and opens clickjacking/third-party-tracking risk. Not recommended.

**Files likely to change**

- `apps/web/package.json` (and lockfile) — add `@tiptap/extension-youtube`
- `apps/web/src/features/articles/richtext/extensions.ts` — register video node, configure Link attributes
- `apps/web/src/features/articles/richtext/editor.tsx` — video toolbar button, URL dialog, validation/error messaging
- `apps/web/src/features/articles/richtext/rich-html.ts` — allowlist for `iframe`/wrapper and `target`/`rel`; `transformTags` for anchors; iframe `loading="lazy"` alongside the existing `<img>` rewrite
- `apps/web/src/app/globals.css` — responsive iframe rules for reader and editor
- `apps/web/tests/unit/articles/rich-html.test.ts` — update pinned expectations
- `apps/web/tests/unit/articles/richtext-editor.test.tsx` — video insert flow
- `apps/web/tests/unit/articles/article-content.test.tsx` — rendered link/embed behavior
- `specs/002-richtext-article-body/contracts/rich-body-contract.md` — amend the "no embedded frames" clause to "no frames except allowlisted video providers"

**Tests to add or update**

- `sanitizeRichHtml` keeps an allowlisted YouTube embed (both `youtube.com/embed/…` and `youtube-nocookie.com/embed/…`) and still drops `iframe` from any other host, `javascript:`/`data:` sources, and protocol-relative URLs.
- `sanitizeRichHtml` and `renderRichBody` add `target="_blank"` and `rel="noopener noreferrer"` to every `<a>`, including anchors that already carried a different `target`, and preserve `href`/`title`.
- `renderRichBody` marks embeds `loading="lazy"` and does not double-apply attributes on re-sanitize (idempotency).
- Editor test: inserting a valid YouTube URL produces an embed in the hidden `body` field; an invalid/hostile URL surfaces a plain-language error and leaves the body unchanged.
- `ArticleContent` test: a body containing a link renders an anchor with `target="_blank"` and `rel` containing `noopener`; a body containing an approved embed renders an iframe with the expected `src`.
- Regression: non-body site links (header/footer/article cards) are unaffected — they continue to render without `target="_blank"`.

## Risks & Considerations

- **Security**: iframes are the highest-risk element this pipeline will ever allow. Restrict to `allowedIframeHostnames`, keep `https` only, add `rel="noopener noreferrer"` on all `_blank` links, and do not allow `sandbox` bypasses or `srcdoc`. Re-run the sanitizer tests that assert arbitrary `<iframe>` is dropped, adapting them to "dropped except allowlisted hosts."
- **Contract/spec drift**: `specs/002-richtext-article-body` explicitly forbids embedded frames; the assessment's fix must update the contract so future reviews do not treat the feature as a sanitizer bypass.
- **Existing content**: no stored article bodies contain iframes today (the sanitizer has always stripped them), so no data migration is needed. Links already stored will gain `target`/`rel` only when re-saved or rendered; the render-time transform covers legacy bodies immediately.
- **Test breakage is expected and intentional**: `rich-html.test.ts` asserts exact anchor markup and iframe removal; those assertions must be rewritten, not deleted, to keep the security coverage.
- **Dependency surface**: `@tiptap/extension-youtube` adds a runtime package; verify it ships no client-side network calls and stays within the TipTap v3 version line to avoid duplicate ProseMirror copies.
- **UX/a11y**: embedded players are third-party frames; include a descriptive `title` on each iframe for screen readers and ensure keyboard users can reach the player. Lazy-loading avoids blocking the article body.
- **Read time and image lifecycle**: `estimateReadMinutes` (`richBodyToPlainText`) and `bodyImagePaths` only inspect text/`<img>`, so embeds neither inflate read time nor get mistaken for storage objects. No change needed, but worth a regression assertion.
- **Performance**: one iframe per embed is acceptable; do not allow autoplay, and lazy-load to protect LCP.

## Open Questions

- [NEEDS CLARIFICATION: Should video support be limited to YouTube only, or should Vimeo and other providers be included in the allowlist from the start?]
- [NEEDS CLARIFICATION: Should authors paste a normal watch URL (`youtu.be/…`, `youtube.com/watch?v=…`) and have it normalized, or must they supply an `/embed/` URL?]
- [NEEDS CLARIFICATION: Should `target="_blank"` also apply to links inside the admin editor/preview, or only to the public reader-facing article page?]
- [NEEDS CLARIFICATION: Do existing articles need their stored HTML rewritten to include `target`/`rel`, or is render-time application sufficient?]
