# Feature Specification: Homepage Branding

**Feature Branch**: `003-homepage-branding`

**Created**: 2026-10-03

**Completed**: 2026-10-03

**Status**: Done

**Input**: User description: "adjust eh UI stuff here. _ on the hero text, kindly add `#fortheloveofgaming` to show channel brand and motto. _ the image on the right with `GA` make use of @docs/neon-GA trans-01.png instead. _ at the banner, complet the Game Ako Chronicles title and keep the logo on the left. _ add footer that show what Game Ako is. \* in the footer, add the social media we have Facebook, YouTube and Twitch just add placeholder and I will update the links manually."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Visitor recognizes the Game Ako brand on the home page (Priority: P1)

A first-time visitor to the home page immediately recognizes the Game Ako channel: the hero carries the channel motto `#fortheloveofgaming`, the right-hand visual shows the real transparent neon "GA" logo instead of an abstract circle, and the header reads the full "Game Ako Chronicles" wordmark with the logo on the left.

**Why this priority**: Brand recognition is the job of the page — visitors arrive from a video or a social post and need to confirm they are in the right place. This story is the core value and is verifiable on its own.

**Independent Test**: Can be fully tested by opening the home page at desktop and mobile sizes and verifying the motto line, the neon GA logo in the hero, and the complete wordmark in the header are all visible and legible. Delivers immediate brand confirmation.

**Acceptance Scenarios**:

1. **Given** a visitor opens the home page, **When** the hero renders, **Then** `#fortheloveofgaming` appears as a readable brand/motto line within the hero text.
2. **Given** the same page, **When** the hero's right-side visual renders, **Then** it shows the transparent neon "GA" logo rather than the current abstract circular mark.
3. **Given** any page in the site, **When** the header renders, **Then** it shows the full "Game Ako Chronicles" wordmark with the logo kept on the left.

---

### User Story 2 - Visitor learns what Game Ako is from the footer (Priority: P1)

Every page includes a footer that explains, in plain language, what Game Ako is — an independent gaming outlet — and reinforces the motto, so a visitor who lands deep in an article can still find out who publishes it.

**Why this priority**: The footer is the "who are you?" moment on every page; without it, brand context only exists on the home page. It builds directly on the brand work of Story 1.

**Independent Test**: Can be fully tested by opening any page (home, article, sign-in) and confirming the footer shows a short description of what Game Ako is plus the motto. Delivers site-wide brand context.

**Acceptance Scenarios**:

1. **Given** any page in the site, **When** the page is scrolled to the bottom, **Then** the footer displays a short plain-language description of what Game Ako is.
2. **Given** the same footer, **When** it renders, **Then** the `#fortheloveofgaming` motto appears alongside the description.

---

### User Story 3 - Visitor can reach Game Ako's channels from the footer (Priority: P2)

The footer lists the channel's social presences — Facebook, YouTube, and Twitch — as clearly labeled placeholder links so the publisher can fill in the real URLs manually afterward without another code release.

**Why this priority**: Discovery to the creator's channels matters for an independent outlet, but the links are placeholders pending the owner's URLs, so it trails the description work.

**Independent Test**: Can be fully tested by opening the footer and confirming three labeled social entries (Facebook, YouTube, Twitch) are present, each presenting as a link the owner can edit later. Delivers a place to add real channel links.

**Acceptance Scenarios**:

1. **Given** the footer, **When** it renders, **Then** it lists three labeled social entries: Facebook, YouTube, and Twitch.
2. **Given** these placeholder entries, **When** a visitor activates one, **Then** they do not land on a dead or incorrect destination — placeholders are clearly marked as forthcoming so the owner can swap in real URLs.
3. **Given** the publisher later replaces a placeholder with a real URL, **When** the page is saved, **Then** the link resolves to the intended channel with no code changes.

---

### Edge Cases

- What happens if the neon GA logo file is missing or fails to load? The hero falls back to a branded placeholder so the layout does not break and the motto/headline remain intact.
- How does the hero behave on narrow screens? The motto, headline, and logo stack and scale without horizontal scrolling, matching the existing responsive behavior at 390 px.
- Do the social placeholders dead-end? No — they are marked as forthcoming so they never look broken, and the labels (Facebook, YouTube, Twitch) make it obvious what the owner should replace.
- Do the changes affect existing pages or content? No — the article list, reading experience, and all other pages keep their current behavior; only header, hero, and footer presentation change.
- Is the motto readable by assistive technology? Yes — it is rendered as real text, not an image or icon.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The home page hero MUST display `#fortheloveofgaming` as a visible brand/motto line within the hero text.
- **FR-002**: The home page hero's right-side visual MUST use the transparent neon "GA" brand logo instead of the current abstract circular mark.
- **FR-003**: The site header MUST display the complete "Game Ako Chronicles" wordmark with the logo positioned at the left, on every page.
- **FR-004**: Every page MUST render a footer that contains a short, plain-language description of what Game Ako is.
- **FR-005**: The footer MUST also display the `#fortheloveofgaming` motto.
- **FR-006**: The footer MUST include three clearly labeled social entries — Facebook, YouTube, and Twitch — as placeholders the publisher can replace with real URLs later without code changes.
- **FR-007**: The enhanced branding MUST preserve the existing visual identity, responsive behavior, and accessibility (no horizontal overflow, keyboard focus visible, text not images).
- **FR-008**: The branding changes MUST NOT alter any existing page content or behavior outside the header, home hero, and footer.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The home page renders the motto, the neon GA hero logo, and the full wordmark correctly at both desktop and mobile widths, verified by automated responsive/browser checks.
- **SC-002**: The complete "Game Ako Chronicles" wordmark appears in the header on every page of the site.
- **SC-003**: The footer appears on every page and contains the description, the motto, and the three labeled social entries.
- **SC-004**: No regression — the existing public responsive and accessibility browser tests continue to pass after the change.
- **SC-005**: The publisher can replace each social placeholder link manually (a plain single-line edit) and the page immediately reflects the new destination.

## Assumptions

- **Motto treatment**: `#fortheloveofgaming` is displayed as readable text within the hero (and echoed in the footer); it is not a link, since the brief only calls for links in the footer social area.
- **Logo asset**: The transparent neon "GA" logo asset already included in the app's brand assets (sourced from `docs/neon-GA trans-01.png`) is used for the hero visual. The PNG could not be visually previewed in this environment, so the owner should confirm the rendered hero in a browser before release.
- **Brand guardrails**: The implementation stays within the established flat, matte identity (blue/red/yellow/white palette, Space Grotesk display and DM Sans body type); the wordmark, motto, and hero are refined, not redesigned, consistent with the site's launch branding scope.
- **Copy**: A short editorial description of what Game Ako is will be written in plain, player-first language during implementation and is static content (not content-managed) for this feature.
- **Social placeholders**: Entries are labeled Facebook, YouTube, and Twitch, use a harmless placeholder target, and are marked as forthcoming so they read as intentional.
- **No data scope**: This feature introduces no new stored data; it changes presentation only. Out of scope: palette/type redesign, article reading UI, content management for the new copy, and analytics.
- **Governance**: Implementation MUST satisfy the project constitution (consistent, accessible UX; reviewed code; performance and responsive baselines preserved).
