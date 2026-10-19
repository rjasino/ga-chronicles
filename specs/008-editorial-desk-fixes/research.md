# Research: Editorial Desk UI Fixes

Each item lists the decision, the reason, and the alternatives considered.

## R1. Why bullet and numbered lists show only indentation

- **Decision**: Restore list markers explicitly in `globals.css` for `.rich-editor__content ul` (`list-style: disc`) and `ol` (`list-style: decimal`), and apply the same rule to the public `.story__body` so readers see the same result.
- **Rationale**: Tailwind CSS v4 preflight sets `ol, ul { list-style: none }` in its base layer. The current rules only add `padding-left: 1.4rem`, so the indent remains and the markers do not. The editor produces correct `<ul>`/`<ol>` markup, so the fault is styling, not the Tiptap commands.
- **Alternatives considered**:
  - Use Tailwind utilities (`list-disc`, `list-decimal`) on each element. Rejected because the editor content is injected HTML and cannot carry per-element classes.
  - Disable preflight globally. Rejected because it changes styling across the whole site.

## R2. Why applied links look like nothing happened

- **Decision**: Add a visible link style inside the editor content (`.rich-editor__content a`) that matches the public article link style (blue, bold, underlined, underline offset 3px).
- **Rationale**: The command runs correctly and the link is saved, but the base layer sets `a { color: inherit }` and only `.story__body a` has styling. Inside the editor, a link looks like plain text until save. The link style is part of the editor feedback rule (FR-005).
- **Alternatives considered**:
  - Show a toast after applying a link. Rejected because it does not show the link in the text itself.
  - Open a preview on hover. Rejected as unnecessary for this fix.

## R3. Card summary: text-only derivation

- **Decision**: Add `richBodyToPlainText(body: string): string` to `rich-html.ts`. It returns the body unchanged for legacy plain-text bodies, and for rich bodies it strips all tags with the existing `sanitize-html` instance (no allowed tags) and decodes the HTML entities it leaves behind (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&nbsp;`). The card then applies the existing 155-character rule to this text.
- **Rationale**: Reuses the project's sanitizer rather than adding a parser. The existing `richBodyHasContent` already strips tags with a regex, but that does not decode entities, so a text-only helper is needed for correct display.
- **Alternatives considered**:
  - Keep the regex `replace(/<[^>]*>/g, "")` used in `richBodyHasContent`. Rejected because it leaves entities such as `&amp;` visible.
  - Add an HTML-to-text dependency. Rejected to avoid a new dependency.
  - Render the card summary with `renderRichBody` and clamp with CSS. Rejected because it renders HTML and would still inline images or links into the summary.

## R4. Sticky rich text toolbar

- **Decision**: Set `position: sticky; top: <site header height>; z-index` on `.rich-toolbar`, with a background matching the editor surface. Verify that no ancestor in the editor page sets `overflow: hidden` or `overflow: auto`, since either breaks sticky positioning.
- **Rationale**: Sticky positioning is pure CSS, which keeps the performance goal. The toolbar sits inside `.rich-editor`, which spans the full article body, so it stays pinned for the whole editing area.
- **Alternatives considered**:
  - Scroll listener that toggles a fixed class. Rejected because it is more code and less reliable.
  - Fixed positioning. Rejected because it breaks the editor column width.
- **Implemented**: the site header is not sticky (`site-header.tsx` has no sticky or fixed positioning), so the toolbar uses `top: 0`. No header height measurement is needed. If the header becomes sticky later, `top` must match its height.

## R5. Blocking loading modal for inline image upload

- **Decision**: Render a full-viewport overlay with `role="dialog"`, `aria-modal="true"`, and a spinner plus "Uploading image…" text while `uploading` is true. The overlay covers the viewport and captures pointer events. Keyboard interaction behind it is blocked by marking the app root `inert` while the modal is open. Focus moves to the modal on open and returns to the Image button on close.
- **Rationale**: An overlay alone blocks mouse input but not keyboard input, so `inert` is needed. The existing `uploading` state already controls the button, so this is a small change.
- **Alternatives considered**:
  - Overlay only. Rejected because keyboard users can still type and submit.
  - Disable only the form fields. Rejected because the spec requires blocking the whole page.

## R6. Oversized image error with file size

- **Decision**: Add a client-side pre-check in `insertImage` before the upload, using the exported `ARTICLE_IMAGES_MAX_SIZE`. If the file is too large, show the message "Inline images must be 10 MiB or smaller. This image is X MiB." Also wrap the upload call in try/catch, so a request rejected by the server body limit shows the same message instead of failing silently. Server-side validation stays the source of truth.
- **Rationale**: The Next server action body limit is set to 11 MB, so a file of 10 MiB or less can reach the action, and the server returns the existing message. A file above 11 MB is rejected by Next before the action runs. The client pre-check gives an immediate, accurate message and avoids uploading a large file just to be refused.
- **Alternatives considered**:
  - Raise the limit. Rejected because the spec keeps the existing limit.
  - Rely only on the server message. Rejected because files above the body limit produce no message today.

## R7. Next.js server action body limit

- **Decision**: Keep `serverActions.bodySizeLimit: "11mb"` in `next.config.ts`.
- **Rationale**: Confirmed in the bundled Next.js docs (`01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`): the default limit is 1 MB and it is configurable through `serverActions.bodySizeLimit`. The existing 11 MB setting already accommodates the 10 MiB image limit plus form overhead.
- **Alternatives considered**: None needed.

## R8. Editorial desk heading

- **Decision**: On both editor pages, "Editorial desk" becomes the `<h1>` styled with the large display title style that the edit page already used. The page-specific line ("Write a story" or "Edit story") becomes a plain description paragraph.
- **Rationale**: The spec asks for "Editorial desk" to be a header. A small `<h2>` under a label would look weaker than the label it replaces, so the display style moved to "Editorial desk". Making it the only `<h1>` keeps one top-level heading.
- **Alternatives considered**:
  - Keep the old title as `<h1>` and add "Editorial desk" as an `<h2>`. Rejected because the spec asks for "Editorial desk" to be the header.
  - Keep "Editorial desk" as a small label and only change the tag. Rejected because the label would still look like a label.
  - Change only the new-article page. Rejected because the edit page has the same label.

## Summary of unknowns

No NEEDS CLARIFICATION items remain. One implementation check is noted in R4 (site header height).
