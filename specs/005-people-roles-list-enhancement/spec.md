# Feature Specification: People & Roles List Enhancements

**Feature Branch**: `005-people-roles-list-enhancement`

**Created**: 2026-10-03

**Status**: Draft

**Input**: User description: "I want to enhance the feature to add filter and sort for people and roles. additional details on each row such as email to identify the user better. implement pagination as the list will grow overtime."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Admin filters the People & roles list to find people quickly (Priority: P1)

An admin managing who can access the site can narrow the People & roles list to a meaningful subset — by role (reader, contributor, moderator, admin), by status (active/disabled), or by a text search on username or email — so they can find a person without reading the whole list.

**Why this priority**: As the list of people grows, finding a specific person or group is the most frequent task, and filtering directly addresses the stated pain ("the list will grow over time"). Without filtering, every other improvement still requires scanning the full list.

**Independent Test**: Can be fully tested by applying a role or status filter and a text search on a populated list and confirming the visible rows are exactly the matching subset, with the total count updating. Delivers immediate findability on its own.

**Acceptance Scenarios**:

1. **Given** an admin on the People & roles page with more than one role represented, **When** they select the "Moderator" role filter, **Then** only people holding the moderator role appear and the reported total reflects that subset.
2. **Given** an admin on the People & roles page, **When** they type a partial name or email fragment into the search box, **Then** only people whose username or email contains that text (ignoring letter case) appear.
3. **Given** an admin has applied a role filter and a search, **When** they also select the "Disabled" status filter, **Then** only disabled people matching all active filters appear (filters combine).
4. **Given** filters produce no matches, **When** the list renders, **Then** the page shows a clear "no people match" message and a way to clear the filters.

---

### User Story 2 - Admin identifies each person from the details on their row (Priority: P1)

Every row in the People & roles list shows enough identifying information — username, email, status, and current roles — so an admin can tell exactly who each entry is before acting on it, instead of relying on a username alone.

**Why this priority**: This is the cheapest, highest-frequency improvement: it removes ambiguity on every row of every visit and makes the other features (filter, sort) meaningful, because results are only useful if each entry is identifiable.

**Independent Test**: Can be fully tested by opening the page and confirming each row presents the person's username, email, status, and roles together, and that a person without a stored email receives a clear indicator rather than a blank value.

**Acceptance Scenarios**:

1. **Given** an admin on the People & roles page, **When** the list renders, **Then** every row shows the person's username, email, status, and current roles in a consistent layout.
2. **Given** a person has no email address on file, **When** their row renders, **Then** a clear "no email on file" indicator is shown instead of an empty or inconsistent cell.
3. **Given** a person has no stored role grants, **When** their row renders, **Then** they are shown with the implicit reader role, alongside people with explicit roles.

---

### User Story 3 - Admin pages through the list as it grows (Priority: P1)

When more than a page's worth of people match the current view, the admin moves through the list with clear controls, sees how many people match in total and where they currently are, and never loses their place or their filters while doing so.

**Why this priority**: Pagination is the direct response to the stated goal ("the list will grow over time"). It keeps the page fast and scannable as the dataset expands, and without it the page would eventually become unusable.

**Independent Test**: Can be fully tested with more than one page of matching people: confirm page size, total count, page-number and next/previous navigation, and that refreshing or sharing the view keeps the admin on the same filtered page.

**Acceptance Scenarios**:

1. **Given** more than 20 people match the current view, **When** the list renders, **Then** people are split into pages of 20 with next/previous and page-number controls, plus an accurate total count.
2. **Given** an admin on a later page, **When** they move between pages, **Then** each page shows the correct people with no person skipped or repeated across pages.
3. **Given** the admin has filters and sorting applied and is on a later page, **When** they change any filter, search, or sort, **Then** the view returns to page 1 so they always start at the top of the fresh results.
4. **Given** 20 or fewer people match the current view, **When** the list renders, **Then** the full set appears and pagination controls are hidden or disabled rather than showing a single empty page.

---

### User Story 4 - Admin sorts the list to organize people the way they need (Priority: P2)

The admin reorders the list by a chosen attribute — username, email, status, role, or account creation date — in ascending or descending order, to review the list the way it is most useful for the task at hand (for example, grouping everyone by role to review coverage).

**Why this priority**: Sorting complements filtering and adds structure, but the list is fully usable with filtering and pagination alone. It is a valuable convenience delivered after the core findability work.

**Independent Test**: Can be fully tested by choosing a sort attribute and direction and confirming the visible order changes accordingly, and that ordering stays stable when moving between pages.

**Acceptance Scenarios**:

1. **Given** an admin opens the People & roles page with no custom sort, **When** the list renders, **Then** people are ordered by username ascending, matching the current behavior.
2. **Given** an admin selects a sort by role and a direction, **When** the list refreshes, **Then** people are ordered by role accordingly, with a deterministic order for people holding multiple roles so the sequence does not shuffle between pages or refreshes.
3. **Given** an admin selects a sort by account creation date, **When** the list refreshes, **Then** the newest or oldest accounts appear first according to the chosen direction.

---

### Edge Cases

- **No matches**: A filter or search that matches nobody shows a clear "no people match" message with a path back to the unfiltered list, never a blank page with no explanation.
- **Missing email**: A person without a stored email receives a clear "no email on file" indicator so rows remain consistent and parseable.
- **Implicit reader role**: People with no role grants are treated as readers for filtering and sorting, so they are never invisible to an admin.
- **Multi-role people**: A person holding several roles appears under each role filter that matches them; sorting by role uses a fixed, deterministic rule so results do not shift between pages or refreshes.
- **Boundary pagination**: With exactly 20, 21, or one matching person, pagination behaves correctly (no empty extra pages, no lost rows).
- **Page out of range**: If a requested page no longer exists (for example, after filters narrow the results), the view settles on a valid page rather than showing an empty page.
- **Changed filters on a later page**: Changing any filter, search, or sort resets to page 1, so the admin always starts at the top of the new results.
- **Disabled accounts**: Disabled accounts remain visible and filterable; existing role assignment behavior for them is unchanged.
- **Growing dataset**: When the number of matching people grows beyond one page, totals and page numbers update correctly and rows stay consistent across pages (no duplicates or omissions).
- **Narrow screens**: The row layout and filter/sort/pagination controls remain usable and do not cause horizontal scrolling, consistent with the site's responsive standards.
- **Keyboard/assistive technology**: Every filter, search, sort, and pagination control is reachable and operable by keyboard and labeled so its purpose is announced.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The People & roles page MUST remain accessible to admins only, with the existing access control unchanged.
- **FR-002**: Every row in the list MUST present the person's username, email, status, and current roles together.
- **FR-003**: When a person has no email on file, the row MUST show a clear "no email on file" indicator.
- **FR-004**: The list MUST provide a text search that matches a person's username or email on partial, case-insensitive input.
- **FR-005**: The list MUST provide a role filter covering reader, contributor, moderator, and admin, plus an "all roles" option.
- **FR-006**: The list MUST provide a status filter covering active and disabled, plus an "all statuses" option.
- **FR-007**: Search, role filter, and status filter MUST be combinable, with results being the intersection of all active criteria.
- **FR-008**: The list MUST provide sorting by username, email, status, role, and account creation date, in ascending or descending direction.
- **FR-009**: The default view MUST order people by username ascending, matching current behavior.
- **FR-010**: The list MUST paginate at 20 people per page, with page-number and next/previous controls, an accurate total count, and a clear indicator of the current position.
- **FR-011**: Changing any filter, search, or sort MUST return the list to page 1.
- **FR-012**: An admin MUST be able to refresh, bookmark, or share their current view; the active search, filters, sort, and page MUST be preserved in the page address and restored when the page is revisited.
- **FR-013**: When no people match the current criteria, the page MUST show a clear empty state and a way to clear the criteria.
- **FR-014**: People with no role grants MUST be treated as readers for filtering and sorting purposes.
- **FR-015**: People holding multiple roles MUST appear in results for each role filter that matches them, and sorting by role MUST be deterministic so the order is stable across pages and refreshes.
- **FR-016**: All filter, search, sort, and pagination controls MUST be operable by keyboard and labeled for assistive technology.
- **FR-017**: Pagination MUST NOT hide, repeat, or skip people, and the reported total MUST match the actual count of matching people.
- **FR-018**: The list MUST remain consistent under a growing number of people, with pagination, totals, filters, and sorting all remaining correct as the dataset expands.

### Key Entities _(include if feature involves data)_

- **Person (account)**: An individual identity in the system, identified by a stable id. Key attributes: username, email, status (active/disabled), and account creation date. Email is private, server-held data only visible to admins on this page.
- **Role grant**: The assignment of a role to a person. Roles are reader (implicit, when no grants exist), contributor, moderator, and admin. A person can hold multiple role grants.
- **List view (view state)**: The combination of active search text, role filter, status filter, sort attribute and direction, and page number that determines which people are shown. It belongs to the page address so it can be refreshed, bookmarked, or shared.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An admin can find any listed person, or confirm they are absent, within 3 interactions (for example: select a filter, adjust the search, read the result) without paging beyond the first page.
- **SC-002**: 100% of rows show the person's email or a clear "no email on file" indicator, so a person is identifiable from their row alone.
- **SC-003**: List actions (applying a filter, searching, changing the sort, moving between pages) present updated results within 1 second as perceived by the admin.
- **SC-004**: Pagination is exact: the list shows 20 people per page, the reported total matches the real number of matching people, and no person is skipped or repeated when moving across all pages.
- **SC-005**: An admin's filtered, sorted, and page position survives a page refresh and can be restored from a bookmark or shared link.
- **SC-006**: Automated accessibility checks report zero violations for the filter, search, sort, and pagination controls when operated via keyboard.
- **SC-007**: Existing role assignment and account creation flows on the page continue to work unchanged, verified by the existing behavioral checks.
- **SC-008**: The list remains accurate as the number of people grows beyond a single page, verified with a dataset that spans several pages.

## Assumptions

- **Email visibility**: Email is shown in full to admins on this admin-only page. It is private, server-held data that admins already manage when creating accounts, so no new privacy surface or access class is introduced.
- **Scope of "people"**: The enhanced list covers every account shown on the current People & roles page, including people with only the implicit reader role — not only internal/contributor accounts.
- **Reader filter**: "Reader" is the implicit role of any person with no stored role grants, and is offered as a role filter value.
- **Page size**: The default page size is 20 people; this is a sensible default for an admin table and can be revisited in planning if the team prefers a different value (no other value was specified).
- **Where matching happens**: The user cares about the outcome (a correct, fast subset of results); whether matching is performed on the server or client is left to planning.
- **View persistence**: Filters, search, sort, and page are kept in the page address so an admin can refresh, bookmark, or share a view and return to their place — this also keeps the admin in their filtered view after a role update on the same page.
- **Deterministic role ordering**: When sorting by role, people with multiple roles are ordered by a fixed rule (for example, a defined role hierarchy with a stable tie-breaker) so results do not shuffle between pages.
- **No behavior regressions**: Existing role assignment, status handling, and account creation behavior are unchanged; this feature only changes how the list is presented, ordered, filtered, and paged.
- **Responsive behavior**: Filter, sort, search, and pagination controls adapt to narrow screens without horizontal scrolling, consistent with the project's responsiveness standards.
- **Governance**: Implementation MUST satisfy the project constitution — consistent, accessible, reviewed UX; comprehensive automated tests where feasible; and preserved performance baselines.