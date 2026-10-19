# Feature Specification: Editorial Desk UI Fixes

**Feature Branch**: `008-editorial-desk-fixes`

**Created**: 2026-10-19

**Status**: In Progress

**Input**: User description: "Fix UI bugs and improve the editorial function: article card previews show raw HTML tags, the 'Editorial desk' label is not a heading, the rich text toolbar is not sticky, link insertion gives no visible feedback until save, lists only indent instead of showing bullets or numbers, inline image uploads have no blocking loading state, and oversized image uploads have no clear error message."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Readable story previews on listing cards (Priority: P1)

A reader browsing the latest stories sees each card's summary as plain readable text, styled like the rest of the card, instead of raw markup such as `<p>` or `<strong>` tags.

**Why this priority**: Raw tags appear on every public listing and make the site look broken to readers.

**Independent Test**: Open the latest stories list for an article whose body contains formatting; confirm the card summary shows only text, with no visible tags, and keeps the card's existing typography and color.

**Acceptance Scenarios**:

1. **Given** an article body stored with paragraph and bold markup, **When** the latest stories list is shown, **Then** the card summary displays the words only, without any angle-bracket tags.
2. **Given** a long article body, **When** the card summary is shown, **Then** it is truncated with an ellipsis at the same length rule as today and does not cut through a word awkwardly.
3. **Given** an article body that is empty, **When** the card is shown, **Then** no broken or empty markup is visible.

---

### User Story 2 - Clear "Editorial desk" heading (Priority: P1)

An editor opening the article writing page sees "Editorial desk" presented as the page heading, with the "Write a story" description beneath it.

**Why this priority**: It is the primary page title for the editor and currently reads as plain text, weakening page structure and accessibility.

**Independent Test**: Open the new-article page as an editor and confirm "Editorial desk" is announced as a top-level heading and visually reads as the page title.

**Acceptance Scenarios**:

1. **Given** an editor opens the article writing page, **When** the page loads, **Then** "Editorial desk" is shown as the page heading.
2. **Given** the same page, **When** a screen reader lists headings, **Then** "Editorial desk" appears as a heading.

---

### User Story 3 - Toolbar stays reachable while writing long articles (Priority: P1)

While writing a long article, the rich text toolbar remains visible at the top of the viewport as the editor scrolls, so formatting controls are always within reach.

**Why this priority**: Long articles push the toolbar off screen, forcing editors to scroll back up for every format change.

**Independent Test**: Write or paste a body long enough to exceed the viewport, scroll down, and confirm the toolbar stays visible and usable.

**Acceptance Scenarios**:

1. **Given** the article body is taller than the screen, **When** the editor scrolls down the page, **Then** the toolbar stays pinned at the top of the visible area.
2. **Given** the toolbar is pinned, **When** the editor clicks a formatting button, **Then** the action applies to the current text selection.
3. **Given** the page is narrow (mobile width), **When** the toolbar is pinned, **Then** it does not cover the text being edited in a way that prevents editing.

---

### User Story 4 - Link insertion gives immediate feedback (Priority: P1)

When an editor adds a link to selected text, the linked text appears styled as a link in the editor immediately, not only after saving.

**Why this priority**: Editors currently think the action failed and may add duplicate links or re-select text unnecessarily.

**Independent Test**: Select a word, click Link, enter a URL, and confirm the word is visibly styled as a link in the editor before saving.

**Acceptance Scenarios**:

1. **Given** text is selected, **When** the editor confirms a link URL, **Then** the selected text is immediately shown as a link in the editor.
2. **Given** the editor cursor is inside an existing link, **When** the editor opens Link, **Then** the current URL is pre-filled and can be changed or removed.
3. **Given** the editor enters a URL without a scheme, **When** confirmed, **Then** the link is saved with a secure web address prefix.

---

### User Story 5 - Bulleted and numbered lists work as expected (Priority: P1)

Clicking the bullet list or numbered list button converts the current paragraph(s) into a real bulleted or numbered list, showing bullet markers or sequential numbers.

**Why this priority**: The list buttons currently only indent text, so editors cannot write lists, which affects article quality on every story.

**Independent Test**: Type three lines, select them, click the bullet list button, and confirm bullet markers appear; repeat with numbered list and confirm 1, 2, 3 numbering.

**Acceptance Scenarios**:

1. **Given** several paragraphs are selected, **When** the editor clicks the bulleted list button, **Then** each becomes a bullet item with a visible bullet marker.
2. **Given** several paragraphs are selected, **When** the editor clicks the numbered list button, **Then** each becomes an item with sequential numbers starting at 1.
3. **Given** a list is shown, **When** the editor clicks the same list button again, **Then** the list is converted back to normal paragraphs.
4. **Given** a saved article with lists, **When** the article is shown to readers, **Then** the lists display with bullets or numbers as in the editor.

---

### User Story 6 - Blocking loading state during inline image upload (Priority: P2)

When an editor uploads an image inline in the article body, a loading overlay appears that blocks interaction with the page until the upload finishes.

**Why this priority**: Without a block, editors can edit or submit while the image is still uploading, leading to missing images or inconsistent content.

**Independent Test**: Upload an image from the body toolbar and confirm an overlay with a loading indicator covers the page and prevents clicks and typing until the image is inserted.

**Acceptance Scenarios**:

1. **Given** an editor selects an image to insert, **When** the upload starts, **Then** a loading modal covers the page and a loading indicator is shown.
2. **Given** the loading modal is shown, **When** the editor tries to click, type, or submit anything behind it, **Then** no action is performed.
3. **Given** the upload completes, **When** the image is inserted, **Then** the loading modal closes and the editor regains control.
4. **Given** the upload fails, **When** the failure is returned, **Then** the loading modal closes and the error is shown.

---

### User Story 7 - Clear error for oversized images (Priority: P2)

When an editor selects an image larger than the allowed size, the editor sees a clear message stating the limit and the file's size, and the image is not uploaded.

**Why this priority**: Editors currently get unclear or no feedback, so they cannot tell why the image failed.

**Independent Test**: Select an image above the allowed size and confirm a specific error message appears, and no image is added to the body.

**Acceptance Scenarios**:

1. **Given** an image larger than the allowed limit, **When** the editor selects it, **Then** the upload is rejected before transfer and an error message states the maximum allowed size.
2. **Given** an oversized image error is shown, **When** the editor selects a valid image, **Then** the previous error is cleared.
3. **Given** the loading modal is shown for a valid image, **When** the upload is rejected by the server for size, **Then** the same clear size message is shown.

---

### Edge Cases

- What happens when a card summary body contains only tags or whitespace? It should show no summary text rather than markup.
- What happens when the user clicks Link with an empty URL? The link action is cancelled and existing text is unchanged.
- What happens when the user toggles a list over a mix of headings and paragraphs? The selection converts to list items without losing text.
- What happens when the image upload is slow? The loading modal remains until completion or failure; the editor can not dismiss it manually mid-upload.
- What happens if the network drops during an image upload? The modal closes and a readable error is shown.
- What happens with an image exactly at the size limit? It is accepted.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The article card summary MUST display only plain text from the article body, with no visible markup tags or entities.
- **FR-002**: The article card summary MUST keep the existing card typography, color, and truncation rule.
- **FR-003**: The "Editorial desk" label on the article writing page MUST be presented as a page heading.
- **FR-004**: The rich text toolbar MUST remain visible at the top of the visible area while the editor scrolls through a long article body.
- **FR-005**: Applying a link to selected text MUST show the link styling in the editor immediately, without requiring save.
- **FR-006**: Removing or editing a link MUST be reflected in the editor immediately.
- **FR-007**: The bulleted list action MUST produce a list with visible bullet markers.
- **FR-008**: The numbered list action MUST produce a list with visible sequential numbers.
- **FR-009**: Toggling a list action on an existing list MUST revert those items to normal paragraphs.
- **FR-010**: Lists created in the editor MUST display with bullets or numbers on the public article page.
- **FR-011**: While an inline image upload is in progress, the page MUST show a loading modal that blocks all interaction with the underlying page.
- **FR-012**: The loading modal MUST close when the upload succeeds or fails.
- **FR-013**: Images larger than the allowed size MUST be rejected with an error message that states the maximum allowed size (currently the server limit for body images) and the selected file's size.
- **FR-014**: The oversized image error MUST be shown to the editor without a page reload and MUST clear once a valid image is selected.
- **FR-015**: The system MUST NOT insert an image into the article body when the upload was rejected.

### Key Entities _(include if feature involves data)_

- **Article**: Has a title, type, body content, and optional cover image. Body content may include paragraphs, headings, lists, links, quotes, and inline images.
- **Article Body Image**: An image uploaded from the editor and inserted inline in the body. Subject to a maximum allowed file size.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of article cards on the latest stories list display summaries without any visible markup tags.
- **SC-002**: Editors can reach the formatting toolbar from any scroll position in a long article without scrolling back to the top.
- **SC-003**: Editors see a link styled in the editor within 1 second of confirming the URL, before saving.
- **SC-004**: Bulleted and numbered lists created in the editor display as true lists both in the editor and on the public article page for 100% of tested cases.
- **SC-005**: During an inline image upload, 0 interactions with the underlying page are possible until the upload completes or fails.
- **SC-006**: 100% of oversized image attempts show an error that names the maximum allowed size.
- **SC-007**: Editors can complete a full article with a heading, list, link, and inline image without needing to reload the page.

## Assumptions

- The "Editorial desk" heading is the page-level title on the article writing page and should be the page's main heading.
- Card summary truncation keeps the current length rule; only the content source changes from raw markup to plain text.
- The allowed image size is the existing server-side limit for body images; this feature surfaces it clearly rather than changing the limit.
- The loading modal is shown only for inline body image uploads, not for cover image selection.
- Existing article content saved before this change is still valid; no data migration is needed for lists or links that were previously stored as indentation.
- The toolbar pinning applies on the article writing page only.
- Mobile support follows the existing responsive layout; no new breakpoints are introduced.
