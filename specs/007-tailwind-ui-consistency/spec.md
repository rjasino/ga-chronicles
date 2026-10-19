# Feature Specification: Site-Wide UI Consistency

**Feature Branch**: `007-tailwind-ui-consistency` (no git branch created; no `before_specify` hook is registered)

**Created**: 2026-10-11

**Completed**: 2026-10-12

**Status**: Done

**Input**: User description: "I want to enhance the website to make elements consistent. Use TailwindCSS4 to migrate the entire site, make consistent element such as buttons, checkbox, text field, etc. Keep the dark and light theme mode and the color scheme use in this site, red, blue, white and yellow in matte finish."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Every button looks and behaves like one system (Priority: P1)

Readers, contributors, moderators, and admins see buttons that share one visual language across the whole site. Each button belongs to a named purpose: primary (main commitment such as "Publish", "Sign in", "Post comment"), secondary (supporting action such as "Continue with Google", "Apply filters"), error (destructive action such as "Remove comment", "Remove article"), success (confirmed outcome), and text (low-emphasis action such as "Sign out").

**Why this priority**: Buttons are the most frequently used controls and the most visible inconsistency. Users cannot tell which action matters most when the same kind of button looks different from page to page.

**Independent Test**: Visit the sign-in, sign-up, password, article editor, moderation, and people pages. Confirm every button belongs to one purpose and the same purpose looks identical on every page.

**Acceptance Scenarios**:

1. **Given** a contributor is editing an article, **When** the editor loads, **Then** "Publish" is the primary button and "Save draft" is the secondary button.
2. **Given** a moderator sees "Remove comment", **When** the review queue loads, **Then** the button uses the error style, distinct from primary.
3. **Given** a reader is on the sign-in page, **When** they see "Continue with Google", **Then** it uses the same secondary style as "Apply filters" on the people page.

---

### User Story 2 - Form fields look and behave the same everywhere (Priority: P1)

Every text field, text area, dropdown (select), and checkbox across the site shares one appearance and one set of states: default, hover, keyboard focus, filled, invalid, and disabled. Labels sit in the same place and use the same type size, and error and success messages use the same placement and color across all forms.

**Why this priority**: Forms are where users commit information (sign-in, article publishing, comments, people filters). Inconsistent fields cause hesitation and mistakes, and this is the second element type named in the request.

**Independent Test**: Open sign-in, sign-up, password change, article editor, comment form, and people filters. Confirm each text field, dropdown, and checkbox looks the same and shows the same focus and error treatment.

**Acceptance Scenarios**:

1. **Given** a reader fills in the sign-in form, **When** a field receives keyboard focus, **Then** it shows the same focus indicator as the article search, comment form, and people filters.
2. **Given** a password is too short, **When** the form is submitted, **Then** the error message uses the same placement and style as other form errors on the site.
3. **Given** a person filters the people list by role, **When** they use the dropdown, **Then** the dropdown matches the look of the other dropdowns on the site.
4. **Given** a checkbox is shown on any form, **When** it is checked or unchecked, **Then** its checked state is visible in both appearances.

---

### User Story 3 - The whole site shares one layout and component language (Priority: P2)

Every page uses the same header, navigation, footer, page widths, section headings, cards, lists, tables, empty states, pagination, status messages, and theme toggle. Article cards on the home page, article rows in admin lists, and people rows in the admin table look like members of the same family.

**Why this priority**: Consistency across the whole site is the stated goal. This story depends on the button and form patterns in the first two stories but covers the rest of the site.

**Independent Test**: Visit the home page, an article, sign-in, the editor, moderation, and the people list. Confirm headings, cards, lists, status messages, and pagination follow the same rules on each page.

**Acceptance Scenarios**:

1. **Given** a visitor moves from the home page to an article, **When** the page changes, **Then** the header, footer, and page width stay the same.
2. **Given** a list of articles or people is shown, **When** it has no results, **Then** the empty state uses the same style everywhere.
3. **Given** an action succeeds or fails, **When** the message appears, **Then** it uses the same success or error style as other messages on the site.

---

### User Story 4 - Every element stays legible and usable in light and dark appearances (Priority: P2)

All elements keep their meaning, legibility, and feedback in the light and dark appearances. The palette is the site's existing blue, white, red, and yellow, applied in a matte finish (flat fills and low-sheen surfaces, with no gloss, gradients, glow effects, or heavy shadows).

**Why this priority**: The theme toggle and the matte look are existing requirements that must survive the migration. Accessibility is required for every element.

**Independent Test**: Toggle between light and dark appearances on each main page type. Confirm every element remains legible and that focus and state indicators remain visible.

**Acceptance Scenarios**:

1. **Given** a reader has dark appearance enabled, **When** they view any page, **Then** text, controls, and focus indicators meet the project contrast target.
2. **Given** a user navigates with the keyboard, **When** an element receives focus, **Then** a clear focus indicator is visible in both appearances.
3. **Given** the site uses matte styling, **When** any element is viewed, **Then** it has no gloss, gradient, or glow effect.

---

### Edge Cases

- A long label or message wraps on a 390 px phone width without horizontal scrolling.
- A button or field shows its pending or disabled state while a form is submitting, and it cannot be triggered again.
- The rich-text editor toolbar keeps its compact layout but uses the same colors, states, and focus indicators as other controls.
- The theme toggle keeps its current behavior and placement; only its colors and states follow the system.
- Users with reduced motion preference see no animated transitions on controls.
- Existing button and field labels stay the same so the current behavior and automated checks remain valid.
- Error messages for a field appear next to that field and are also announced to assistive technology.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The entire site (every public, reader, contributor, moderator, and admin page) MUST be styled with Tailwind CSS 4, and the previous page-specific styling MUST be retired once migrated.
- **FR-002**: Buttons MUST use one of five defined purposes: primary, secondary, error, success, and text. Every button on the site MUST belong to exactly one purpose.
- **FR-003**: Text fields, text areas, dropdowns, and checkboxes MUST share one appearance and one set of states: default, hover, keyboard focus, filled, invalid, and disabled.
- **FR-004**: Form labels MUST share one placement, type size, and weight across all forms.
- **FR-005**: Form error and success messages MUST share one placement and style across all forms, and each message MUST be associated with the field it describes.
- **FR-006**: Layout elements (header, navigation, footer, page width, section headings) MUST be the same on every page.
- **FR-007**: Cards, lists, tables, empty states, pagination, and status messages MUST follow one shared style across the site.
- **FR-008**: The primary color MUST be the site's blue. Secondary treatments MUST use blue as outline and text on a light surface. Error and destructive treatments MUST use the site's red. Yellow MUST be reserved for focus indication and accents, not as a fill for buttons or fields.
- **FR-009**: The site's palette MUST include a muted, matte green as the official success color. The success treatment MUST be defined consistently across buttons, fields, and messages, and MUST remain clearly distinct from the site's red error treatment in both appearances.
- **FR-010**: All elements MUST use a matte finish: flat color fills and low-sheen surfaces, with no gloss, gradients, glow effects, or heavy shadows.
- **FR-011**: Every element MUST be legible in both the light and dark appearances, meeting the project's accessibility contrast target in each.
- **FR-012**: Every interactive element MUST show a visible keyboard focus indicator distinct from its surface in both appearances.
- **FR-013**: Interactive elements on touch-sized screens MUST be at least 44 px tall.
- **FR-014**: Each form MUST have at most one primary button.
- **FR-015**: The visual migration MUST NOT change labels, the actions performed, form submission behavior, or the theme toggle's behavior.
- **FR-016**: Existing automated checks that rely on visible labels MUST continue to pass after the migration.

### Key Entities _(include if feature involves data)_

- **Design Element**: A reusable visual component (button, text field, dropdown, checkbox, message, card, list row, table, pagination control, or navigation item) with defined states and a defined appearance in each theme.
- **Appearance**: The light or dark theme in which every design element must be defined and verified.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of pages in scope (listed in Assumptions) are rendered with the shared styling system, with no page-specific style rules remaining for the migrated elements.
- **SC-002**: 100% of buttons belong to one of the five defined purposes, confirmed by reviewing every page in scope.
- **SC-003**: 100% of text fields, dropdowns, and checkboxes on the site look and behave the same in each state, confirmed in both appearances.
- **SC-004**: In a usability check with at least 5 people, 90% correctly identify the primary action on a form at first glance.
- **SC-005**: Accessibility checks report zero contrast or focus-visibility violations for every element type in both appearances.
- **SC-006**: Users complete the same tasks as before the change, with no increase in failed or abandoned submissions during testing.
- **SC-007**: No element on any page in scope overflows horizontally at a 390 px phone width.

## Assumptions

- **Stack constraint (user-mandated)**: The site is migrated to Tailwind CSS 4 as requested. The current site has no Tailwind dependency, so the migration is part of this work.
- **Pages in scope**: Home, article detail, article list, sign-in, sign-up, account password, article editor, article preview, moderation, people list, people creation, comment area, the theme toggle, and the site header and footer. Every route in the app is in scope.
- **Palette**: The existing blue, white, red, and yellow are the brand colors. A muted matte green is added as the success color (FR-009). Dark appearance keeps the existing dark tokens, mapped to the same roles, with a matching dark-appearance green.
- **Matte finish**: Defined as flat color fills and low-sheen surfaces, with no gloss, gradients, or glow effects.
- **Rich-text editor**: Toolbar controls keep their compact layout; colors, states, and focus follow the shared system.
- **Language**: Labels remain in English as they are today.
- **Supersedes earlier draft**: This feature replaces the earlier button-only direction. The full migration request is the chosen scope.
- **Existing behavior**: No functional changes beyond the visual and structural consistency described here.
