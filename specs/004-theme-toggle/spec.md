# Feature Specification: Light/Dark Theme Toggle

**Feature Branch**: `004-theme-toggle`

**Created**: 2026-10-03

**Status**: Draft

**Input**: User description: "create a toggle for theme, dark and light. The default theme is light and that's why is currently implemented. Create a dark theme base on the docs/neon-GA-01.png and use this image on the right side of the hero banner."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor switches the site between light and dark themes (Priority: P1)

A visitor lands on the site in its current light appearance and can deliberately switch the whole site to a dark appearance, then switch back, using a single clearly labeled control in the site chrome. The switch takes effect immediately, without a page reload or losing their place.

**Why this priority**: The theme toggle is the core of the request — without it there is no light/dark choice at all. It delivers value on its own even before the dark visual direction is fully refined.

**Independent Test**: Can be fully tested by loading any page, activating the theme control, and confirming the entire page changes to the dark appearance and back to light, with no reload and no loss of position. Delivers the primary user control.

**Acceptance Scenarios**:

1. **Given** a visitor on any page in the light theme, **When** they activate the theme control, **Then** the entire page switches to the dark theme immediately.
2. **Given** a visitor on any page in the dark theme, **When** they activate the theme control again, **Then** the page switches back to the light theme immediately.
3. **Given** a visitor has switched themes while reading a long page, **When** the switch happens, **Then** the page does not reload and their scroll position is preserved.
4. **Given** a visitor using only a keyboard or assistive technology, **When** they reach and activate the theme control, **Then** they can identify its purpose and its current state, and the change is announced.

---

### User Story 2 - Visitor sees the neon "Game Ako" sign as the home hero visual (Priority: P1)

The right-hand side of the home hero presents the neon "Game Ako" sign artwork (the illuminated GAME AKO wordmark with controller and stars) instead of the current hero mark, on both the light and dark themes.

**Why this priority**: The owner explicitly asked for this artwork on the hero, and it is the visual anchor of the new dark direction. It is independently verifiable and delivers immediate brand impact.

**Independent Test**: Can be fully tested by opening the home page in both themes and confirming the right-hand hero visual is the neon "Game Ako" sign artwork and remains legible without breaking the layout.

**Acceptance Scenarios**:

1. **Given** a visitor opens the home page, **When** the hero renders, **Then** the right-hand visual is the neon "Game Ako" sign artwork rather than the previous mark.
2. **Given** the home hero in either the light or the dark theme, **When** it renders, **Then** the artwork is displayed consistently and the hero text remains readable.
3. **Given** a narrow screen, **When** the hero renders, **Then** the artwork scales and stacks without causing horizontal scrolling.

---

### User Story 3 - Returning visitor's theme choice is remembered (Priority: P2)

A visitor who chooses a theme finds the site opens in that same theme on their next visit, without seeing a flash of the other theme while the page loads.

**Why this priority**: Persistence turns a one-off novelty into a real preference, but the site is fully usable without it, so it trails the toggle and hero work.

**Independent Test**: Can be fully tested by selecting a theme, reloading or reopening the site, and confirming the chosen theme is applied on load with no visible flash of the other theme.

**Acceptance Scenarios**:

1. **Given** a visitor has selected the dark theme, **When** they revisit the site, **Then** the dark theme is applied on load.
2. **Given** a visitor has a saved theme, **When** a page first appears, **Then** there is no visible flash of the opposite theme.
3. **Given** a first-time visitor on a device whose system setting is dark, **When** they arrive, **Then** the site still opens in the light theme, because light is the default regardless of system setting.

---

### Edge Cases

- **First visit on a dark-mode device**: The site still presents light, honoring the explicit "default is light" rule rather than inheriting the operating system appearance.
- **Preference storage unavailable or blocked**: The site falls back to the light theme with no error, and the toggle continues to work for the current session.
- **Saved preference is missing or unreadable**: The site fails safe to light with no broken state.
- **Toggle used mid-article**: The reading position and page state are preserved; only the appearance changes.
- **Hero artwork fails to load**: A branded placeholder keeps the hero layout intact and the headline/motto readable in both themes.
- **Reduced-motion preference**: The theme change does not depend on animation to convey state, and any transition respects a reduced-motion preference.
- **Contrast in the dark theme**: Text, controls, focus indicators, and essential imagery remain comfortably readable against the dark surfaces.
- **Two tabs with different selections**: The most recent selection is the one applied on the next page load; no crash or inconsistent state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST provide a single, visible, clearly labeled control that switches the appearance between light and dark.
- **FR-002**: The light theme MUST be the default appearance for a first-time visitor, regardless of the visitor's device or system color setting.
- **FR-003**: The dark theme's visual direction MUST be derived from the neon "Game Ako" sign artwork — a deep, dark backdrop with luminous cyan, red, yellow, and magenta accents — while preserving the existing brand type and identity.
- **FR-004**: Activating the control MUST change the appearance of the entire site immediately, without a page reload and without losing the visitor's place or unsaved input.
- **FR-005**: A visitor's explicit theme choice MUST persist across pages and across subsequent visits on the same device until they change it.
- **FR-006**: For a returning visitor with a saved choice, the saved theme MUST be applied as the page is presented, so no flash of the opposite theme is visible.
- **FR-007**: The control MUST expose its purpose and current state to assistive technology, be reachable and operable by keyboard, and show a visible focus indicator.
- **FR-008**: The home hero's right-hand visual MUST be the neon "Game Ako" sign artwork (from `docs/neon-GA-01.png`), displayed on both the light and the dark theme.
- **FR-009**: All text, controls, focus indicators, and essential imagery MUST meet the project's accessibility contrast target (WCAG 2.1 AA) in both themes.
- **FR-010**: Both themes MUST preserve the existing layout, responsive behavior (no horizontal overflow at 390 px), and all existing page content and behavior.
- **FR-011**: The theme MUST apply consistently across every page that shares the site chrome, including home, articles, sign-in, and the signed-in/admin areas.
- **FR-012**: If a saved theme preference cannot be read or is unavailable, the site MUST fall back to the light theme without showing an error.

### Key Entities *(include if feature involves data)*

- **Theme preference**: A visitor's selected appearance, either light or dark, associated with their device/browser rather than their account. It has no attributes beyond the chosen value and the fact that it overrides the light default until changed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can switch the entire site between light and dark with one clearly labeled action, and the new appearance is visible in under 1 second with no page reload.
- **SC-002**: 100% of first-time visits present the light theme, including visitors whose device system setting is dark.
- **SC-003**: A returning visitor with a saved preference sees that theme fully applied on load with zero visible frames of the opposite theme.
- **SC-004**: Automated accessibility checks report zero WCAG 2.1 AA violations on representative public pages (home and sign-in) in both themes.
- **SC-005**: The existing responsive and branding browser checks continue to pass at 390 px, 768 px, and 1440 px in both themes, with no horizontal overflow.
- **SC-006**: The home hero shows the neon "Game Ako" sign artwork in both themes, confirmed by visual review of the rendered page.
- **SC-007**: The dark theme's key surfaces (background, text, controls, and hero visual) are recognizably derived from the neon sign artwork, confirmed by design review.

## Assumptions

- **Default is always light**: Per the request, the default appearance is light and does not follow the operating system's light/dark setting; a first-time visitor always starts in light.
- **Binary toggle**: The control offers exactly two states — light and dark — with no separate "follow system" option.
- **Device-level persistence**: An explicit choice is remembered on the visitor's device and is not tied to an account or stored on the server; no new stored data or schema is introduced.
- **Control placement**: The toggle lives in the shared site chrome (header) so it is reachable from every page that shares that chrome.
- **Site-wide scope**: The chosen theme covers every page sharing the header/footer, including articles, authentication, and admin screens, not only the home page.
- **Hero artwork on both themes**: The neon "Game Ako" sign artwork (`docs/neon-GA-01.png`) is shown on the right of the home hero in both themes. Because the artwork has a dark, photographic background, it is presented within an intentional frame/panel so it reads as a deliberate design element on the light theme rather than an accidental dark block.
- **Dark palette source**: The dark theme's colors are inspired by the neon sign — a deep blue-black backdrop with cyan, red, yellow, and magenta glow accents — reusing the existing type families (Space Grotesk display, DM Sans body) and brand palette rather than introducing a new identity.
- **Asset availability**: The `neon-GA-01.png` asset is available to the application as brand artwork (sourced from `docs/neon-GA-01.png`).
- **No behavior changes elsewhere**: Aside from appearance, the theme toggle, and the hero visual, content, navigation, and existing functionality are unchanged.
- **Transitions**: Any theme transition is brief and decorative; the state change does not rely on animation, and reduced-motion preferences are respected.
- **Governance**: Implementation MUST satisfy the project constitution (consistent, accessible, responsive UX; reviewed code; preserved performance baselines).
