# Feature Specification: Article Author Byline and Read Time

**Feature Branch**: `006-article-byline-read-time`

**Created**: 2026-10-10

**Completed**: 2026-10-10

**Status**: Done

**Input**: User description: "when viewing the articles can you add a section who wrote it and how much time an article can be read."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Reader sees who wrote the article (Priority: P1)

A reader opening an article can see who wrote it, shown alongside the article's title and publish date, so they know whose perspective they are reading and can judge the piece accordingly.

**Why this priority**: Attribution is the core of the request and the most important trust signal on a publishing site. It is useful on its own, even without the read time estimate.

**Independent Test**: Can be fully tested by opening any published article and confirming a clearly labeled author section names the article's author, without any other change to the page.

**Acceptance Scenarios**:

1. **Given** a reader opens a published article whose author has a display name, **When** the article loads, **Then** an author section appears on the article page showing that display name.
2. **Given** a reader opens a published article whose author has no display name, **When** the article loads, **Then** the author section shows the author's username instead, so the author is never left unnamed.
3. **Given** a reader opens a published article, **When** the author section renders, **Then** it is clearly distinguishable from the article title, the publish date, and the body text.

---

### User Story 2 - Reader sees how long the article takes to read (Priority: P1)

A reader can see an estimate of how long the article takes to read, shown on the article page, so they can decide whether they have time to read it now or save it for later.

**Why this priority**: Read time is the second explicit request and is what helps readers choose what to read. It is independently valuable and independently testable.

**Independent Test**: Can be fully tested by opening articles of different lengths and confirming each shows a read time estimate that grows with the amount of text, with no other content changed.

**Acceptance Scenarios**:

1. **Given** a reader opens a published article, **When** the article loads, **Then** a read time estimate is shown in whole minutes, labeled so it is clearly understood as an estimate of reading time.
2. **Given** two published articles where one is substantially longer than the other, **When** a reader opens each, **Then** the longer article shows a longer read time estimate.
3. **Given** a very short article, **When** a reader opens it, **Then** the read time shows at least one minute rather than zero.
4. **Given** an article containing rich formatting such as headings, lists, quotes, and images, **When** the read time is calculated, **Then** the estimate reflects the readable text only, not markup or the number of images.

---

### User Story 3 - Byline and read time read well on every screen (Priority: P2)

The author section and read time appear together in a compact, consistent place in the article header on desktop and mobile screens, and do not push the article body out of view awkwardly or cause horizontal scrolling.

**Why this priority**: The information is only useful if it is presented cleanly; this story is about presentation quality and consistency with the rest of the site, so it follows the two core stories.

**Independent Test**: Can be tested by viewing an article at common phone and desktop widths and confirming the author and read time are visible, legible, and do not overflow the screen.

**Acceptance Scenarios**:

1. **Given** a reader on a narrow phone screen, **When** they open an article, **Then** the author and read time remain fully visible and readable without horizontal scrolling.
2. **Given** a reader with the dark appearance enabled, **When** they open an article, **Then** the author and read time are legible with sufficient contrast in that appearance too.
3. **Given** a reader using a keyboard or assistive technology, **When** they reach the article header, **Then** the author and read time are announced as part of the article's details in a meaningful order.

---

### Edge Cases

- **Author has no display name**: The username is shown instead; the author is never blank or shown as an internal identifier.
- **Author account is disabled or no longer active**: The article keeps its original byline so the reader still knows who wrote it; the article itself is unaffected.
- **Article has no body text (or only images)**: The read time shows the minimum of one minute rather than zero or an empty value.
- **Very long article**: The read time keeps growing sensibly and is rounded up to whole minutes; it never displays fractional minutes.
- **Article body contains markup or embedded images only**: Markup is excluded from the count and images do not add to the estimate.
- **Article is still a draft or preview**: The author and read time are only shown on the public article page as published; drafts and previews are unaffected by this feature.
- **Legacy plain-text articles**: They receive a read time and byline the same way as rich articles.
- **Article with no assigned author**: The byline shows a neutral label such as "Game Ako Chronicles staff" so the section is never empty.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The article page MUST show an author section identifying who wrote the article.
- **FR-002**: The author section MUST show the author's display name when one exists, and otherwise the author's username.
- **FR-003**: The article page MUST show an estimated read time in whole minutes.
- **FR-004**: The read time estimate MUST be at least one minute for any published article.
- **FR-005**: The read time estimate MUST be based on the readable text of the article body and MUST exclude markup and images.
- **FR-006**: The read time estimate MUST increase as the amount of readable text increases.
- **FR-007**: The read time MUST be clearly labeled so a reader understands it is an estimate of reading time.
- **FR-008**: The author section and read time MUST be presented together in the article header, consistently for all published articles.
- **FR-009**: The author section and read time MUST be visible and legible on desktop and mobile widths without horizontal scrolling.
- **FR-010**: The author section and read time MUST meet the project's accessibility contrast target in both the light and dark appearances.
- **FR-011**: The author section and read time MUST be exposed to assistive technology as readable text, not as images.
- **FR-012**: When an article has no assigned author, the article page MUST show a neutral fallback byline rather than an empty section.
- **FR-013**: Existing article content, the publish date, comments, and navigation MUST remain unchanged.

### Key Entities _(include if feature involves data)_

- **Article**: A published piece of writing with a title, publish date, body, and an assigned author. Read time is derived from its body and is not separately entered by authors.
- **Author**: The account that wrote an article. Attributes shown to readers are the display name (optional) and the username; no contact details are shown.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of published articles show an author section identifying the author (display name, username, or the neutral fallback) when opened.
- **SC-002**: 100% of published articles show a read time of at least one whole minute.
- **SC-003**: For articles of clearly different lengths, the longer article's read time is always greater than or equal to the shorter article's read time.
- **SC-004**: A reader can determine both who wrote an article and roughly how long it takes to read within 5 seconds of the page loading.
- **SC-005**: The author section and read time introduce no horizontal scrolling at common phone and desktop widths.
- **SC-006**: Accessibility checks report zero contrast or labeling violations for the author section and read time in both appearances.

## Assumptions

- **Reading speed**: The read time uses an average adult reading speed of about 200 words per minute, rounded up to whole minutes. This is a common industry default and is shown as an estimate.
- **Scope of display**: The byline and read time appear on the article page. Article listing cards on the home page are not changed in this feature and can be added later if wanted.
- **Author data**: The author is the existing account already linked to each article. No new author-entry step is added for writers; the display name is used when set, otherwise the username.
- **Public display only**: Only the display name or username is shown to readers. Email addresses and roles are never shown in the byline.
- **Images do not add time**: Images in articles are not counted toward read time, to keep the estimate based on reading rather than viewing.
- **No stored read time**: Read time is calculated from the article content when the article is viewed, so existing articles gain the estimate without any data migration or re-publishing.
- **Presentation consistency**: The byline and read time follow the existing article header style and the site's light and dark appearances.
- **Governance**: Implementation MUST satisfy the project constitution — consistent, accessible, responsive UX; reviewed code; automated tests; and preserved performance baselines.
  </content>
