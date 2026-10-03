# Feature Specification: Richtext Article Body

**Feature Branch**: `002-richtext-article-body`

**Created**: 2026-10-03

**Status**: Draft

**Input**: User description: "Make the article body a richtext field so we can add text and images inside. suggest which best tool to use for richtext for the current app. when image is inserted in the article body, it will be automatically save to supabase storage and the blog will render it according to the size and dimension of the container."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Contributor composes an article with rich text and inline images (Priority: P1)

A signed-in contributor opens the article editor, writes the article body with formatted text (headings, bold/italic, bulleted and numbered lists, block quotes, and links), and inserts images directly into the body by choosing image files. Each chosen image is stored automatically and appears exactly where the contributor placed it. The contributor can save a draft, preview it, and publish it without any developer help.

**Why this priority**: The hard launch decision in `001-blog-site-launch` makes self-service publishing the gating workflow, and rich content with embedded images (screenshots for reviews, stills for news and interviews) is what makes published articles publication-ready rather than plain notes. This is the slice that creates author-side value on its own.

**Independent Test**: Can be fully tested by signing in as a contributor, creating an article, applying at least two text formats, inserting at least one image from a local file, saving a draft, and confirming the preview renders the formats and the image in place. Delivers self-service rich publishing.

**Acceptance Scenarios**:

1. **Given** a signed-in contributor in the article editor, **When** they insert an image file into the body, **Then** the image is stored automatically and appears inline at the chosen position without the contributor typing or pasting a URL.
2. **Given** the contributor has applied headings, bold/italic text, lists, and a link, **When** they save the draft, **Then** the formatting is preserved in the saved draft.
3. **Given** an article with a formatted body and images, **When** the contributor opens the preview, **Then** the preview renders the same formatting and images as authored.
4. **Given** a contributor attempts to insert an image that is not a supported format or exceeds the size limit, **When** the insert is submitted, **Then** it is rejected with a plain-language message and the rest of the body is left unaffected.

---

### User Story 2 - Reader reads rich published articles with responsive images (Priority: P1)

An anonymous visitor opens a published article and reads formatted text together with embedded images. Every image scales to fit the width of the reading column, keeps its original proportions, and never causes horizontal scrolling or broken layout on any device size.

**Why this priority**: The public reading experience is the site's core value defined in `001-blog-site-launch`; rich bodies only add value if they read well publicly. This slice proves the reader-side benefit of everything authored in Story 1 and is independently testable with one published article.

**Independent Test**: Can be fully tested by publishing one article containing formatted text and at least one image, then opening it anonymously on desktop-sized and mobile-sized viewports and verifying images fit the column without overflow and text stays legible. Delivers the reader benefit of rich content.

**Acceptance Scenarios**:

1. **Given** a published article with embedded images, **When** a reader opens it on a desktop viewport, **Then** each image renders within the reading column at a width that fits the column while preserving its proportions.
2. **Given** the same article, **When** a reader opens it on a mobile-sized viewport, **Then** the images shrink to fit the narrower column with no horizontal scrolling.
3. **Given** an article with several images, **When** the reader scrolls through it, **Then** images below the initial viewport do not block the rest of the article from loading.
4. **Given** an article created before this feature whose body is plain text, **When** it is opened, **Then** it renders legibly exactly as before, with no content re-entry required.

---

### User Story 3 - Contributor edits and maintains rich content with inline images (Priority: P2)

A contributor returns to an existing draft or published article and adds, removes, or replaces body images, then republishes. The saved body reflects the change, and stored image files that are no longer referenced by any draft are cleaned up so abandoned uploads do not accumulate in storage.

**Why this priority**: Authors treat articles as living documents — correcting a broken screenshot or replacing an outdated image without starting over is the difference between a professional editorial loop and a one-shot editor. It builds on both earlier stories, so it trails them.

**Independent Test**: Can be fully tested by editing a published article that has an image, removing that image, republishing, and verifying both that the public page no longer shows it and that the superseded stored file is no longer retained. Delivers a maintenance loop for rich articles.

**Acceptance Scenarios**:

1. **Given** a published article with an inline image, **When** the author removes it and republishes, **Then** readers no longer see it and the stored file for that image is cleaned up.
2. **Given** an author replaces an inline image at the same place, **When** the article is republished, **Then** the new image shows and the replaced stored file is cleaned up.
3. **Given** a contributor has authored a body with images, **When** a save fails (for example, a temporary network problem), **Then** their text and formatting are preserved for retry and no partial upload is left behind in place of their content.
4. **Given** an article whose body has been emptied during editing, **When** the author attempts to publish, **Then** publishing is rejected with a clear message and previously saved content is not lost.

---

### Edge Cases

- What happens when an image insert fails mid-upload (for example, a time-out)? The contributor sees a plain-language error, their authored text and formatting remain intact, and no broken image placeholder is saved.
- How does the system handle an image file whose content does not match its declared type, or a zero-byte file? It is rejected with a clear message; only actual supported image content is embedded.
- How does the system handle an image larger than the allowed limit? It is rejected up front by the size check rather than failing partway through the upload.
- What happens to existing articles with plain-text bodies after this change? They keep rendering as before; no re-entering of content is required.
- What happens to an article's embedded image files if the article itself is deleted? They are cleaned up under the same rule as removed images once no article references them.
- Can an author paste an external website's image URL directly into the body? No — at this stage only images uploaded through the editor's insert flow are supported; the public page resolves stored image references only.
- How is reader safety guaranteed when content comes from authors? Authored body content is treated as untrusted; anything that could execute code on a reader's device is neutralized before display, so a reader is never put at risk by opening an article.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Contributors MUST be able to compose the article body as rich text with at least: headings, bold, italic, bulleted and numbered lists, block quotes, and hyperlinks.
- **FR-002**: Contributors MUST be able to insert one or more images inline within the article body at a chosen position without manually entering a URL.
- **FR-003**: When a contributor inserts an image, the system MUST store it automatically as an article body image and embed it in the body by reference.
- **FR-004**: The system MUST enforce an allowed-format set (JPEG, PNG, WebP) and a per-image size limit consistent with the site's existing image limit, rejecting non-conforming files with a plain-language message.
- **FR-005**: The article body, including its formatting and inline image references, MUST be persisted with the article on draft save and MUST survive subsequent edits.
- **FR-006**: Both the draft preview and the public article page MUST render the body with formatted text and inline images as authored.
- **FR-007**: The public article page MUST render body images responsively — within the reading column on every supported device width, preserving aspect ratio, with no overflow, distortion, or horizontal scrolling.
- **FR-008**: Body images below the initial viewport MUST load without delaying the rest of the article so reading is not blocked.
- **FR-009**: Contributors MUST be able to remove or replace inline images in the editor, with the change reflected in the saved body.
- **FR-010**: When a body image is removed or replaced and no saved draft references it, the system MUST clean up its stored file so orphaned uploads do not accumulate.
- **FR-011**: Articles authored before this feature MUST continue to render legibly with no content re-entry.
- **FR-012**: The system MUST treat authored body content as untrusted and render it for anonymous readers in a way that prevents execution of unsafe code.
- **FR-013**: Saving or publishing an article with an empty body MUST be rejected with a clear message, consistent with current behavior.

### Key Entities *(include if feature involves data)*

- **Article Body**: The article's content — formatted text and embedded image references — stored with the article and shared across its draft and published states.
- **Article Body Image**: A stored image file referenced from within an article body; has source, format, size, and storage location; typically referenced by the article that uploaded it, and eligible for cleanup once no saved draft references it.
- **Body Image Storage**: The shared, publicly readable repository where article body images are stored so readers and previews can load them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A contributor creates, formats, and publishes an article containing at least one inline image entirely through the authoring area without developer assistance.
- **SC-002**: 100% of published articles render their inline images within the reading column on both desktop and mobile viewports with no overflow or horizontal scrolling.
- **SC-003**: Inserting a supported image embeds it inline within 5 seconds on a standard connection, and any failure is reported to the author within 10 seconds.
- **SC-004**: After the upgrade, every existing published article renders with no regression and requires no content re-entry.
- **SC-005**: Automated checks confirm authored content is rendered safely — no unsafe code executes when a reader opens any article containing formatting or images.
- **SC-006**: Removing or replacing an inline image cleans up the superseded stored file, so storage does not grow with abandoned images.

## Assumptions

- **Image insertion**: Authors insert images by choosing a local image file (an upload flow); pasting or hot-linking external image URLs is out of scope and can be added later.
- **Image limits**: Body images use the same supported formats and 10 MiB per-file limit already applied to cover images; no per-article image-count cap is set at launch, and a cap can be introduced later if storage usage shows a need.
- **Storage of the body**: The article body continues to be stored as a single text content document (consistent with current article storage), and the public page renders it for anonymous readers.
- **Cleanup boundary**: Cleanup of unreferenced images happens when an article is saved; uploads from a draft that is never saved are outside the automatic-cleanup guarantee at launch, and a periodic sweep may follow if storage usage warrants it.
- **Backwards compatibility**: Plain-text bodies stored before this feature are treated as a pre-existing supported content format and must keep rendering.
- **Language**: Authoring and the editor interface remain English-only.
- **Scope boundaries**: In-editor image resizing, alignment and caption controls, image galleries, drag-and-drop uploads outside the insert control, mobile authoring, real-time collaboration, and tracked changes are out of scope for this feature.
- **Dependency on prior feature**: This feature builds on the authoring, publishing, roles, and storage infrastructure delivered by `001-blog-site-launch`; it does not change how contributors are provisioned or what roles can publish.
- **Governance**: Implementation MUST satisfy the project constitution (clean reviewed code, automated unit and integration tests, consistent accessible UX, security including safe rendering and dependency hygiene, and performance benchmarks for public pages).