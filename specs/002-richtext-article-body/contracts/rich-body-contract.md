# Rich Body Interaction Contract

This feature extends the existing web application's authoring and reading journeys. It does not introduce a separately promised public API; this contract describes observable behavior for contributors and anonymous readers, plus the storage and trust boundaries the implementation must honor.

## Authoring (contributor / admin)

- A contributor or admin editing an article can compose the body with headings, bold, italic, bulleted and numbered lists, block quotes, and hyperlinks.
- A contributor or admin can insert an image into the body at the cursor by choosing an image file. The image is stored automatically; the author never types or pastes a storage URL.
- Inserting a file that is not a real JPEG, PNG, or WebP image, exceeds 10 MiB, or is a zero-byte/empty selection is rejected with a plain-language message, and the rest of the body is unaffected.
- Saving a draft persists the body with its formatting and inline images. Reopening the draft or editing the article continues from the saved rich content.
- Previewing a draft reflects the body exactly as authored, including images.
- An unsaved insert that fails mid-upload reports a clear error and does not leave a broken placeholder; the author's text and formatting remain.
- Saving or publishing an article with an empty body is rejected with a clear message and the previous content is not lost.

## Upload and persistence boundary

- Image upload happens through a dedicated, session-authenticated server action authorized for contributors and admins.
- Each stored object lives in the `article-images` bucket under `<user-id>/<uuid>.<ext>` and is publicly readable once stored.
- The stored body references images by their public URL. The DB stores the body HTML and per-article image reference rows, not the binary data.

## Reading (anonymous visitors)

- The public article page renders the body server-side: formatted text and inline images appear exactly as authored, with no reader-side editor JavaScript.
- Every inline image fits the width of the reading column on desktop and mobile viewports, preserves its aspect ratio, and causes no overflow or horizontal scrolling.
- Images below the initial viewport do not block the rest of the article from loading.
- Only approved HTML is ever rendered: no scripts, event handlers, embedded frames, or unsafe markup from authored content execute for readers.
- A legacy article whose body predates this feature renders as readable plain paragraphs, unchanged and with no content re-entry.

## Content safety

- Authored body HTML is treated as untrusted input. Sanitization is applied on save (canonical stored form) and again when a server component renders the body for readers.
- The renderer outputs only an allowlisted set of content: paragraphs, headings, bold/italic, ordered/unordered lists and items, block quotes, links (http/https only), and images carrying a source and alt text.
- Links and images originate only from allowed protocols; readers never receive embedded user-authored scripts.

## Lifecycle and cleanup

- Removing or replacing an image in the body and saving updates the body; readers immediately see the change after publish.
- A stored image whose last reference is removed during a save is deleted from storage (best-effort; failures are logged and never block the save).
- Images from a draft that is never saved are outside the automatic-cleanup guarantee; a periodic sweep may be added if storage usage shows a need.

## Rejection and failure messages

- All validation failures return plain-language feedback in the authoring area and leave the author's content intact.
- Unauthorized upload attempts (anonymous or non-contributor) are refused on the server and storage boundaries; no upload happens for an unauthorized session.