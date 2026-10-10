# People & Roles Admin List — Interaction & Query Contract

This contract documents the observable behavior of the enhanced "People & roles" admin page (`/admin/users`). It covers what the page must show, how the list-view parameters behave, and the guardrails [spec.md](spec.md) requires. Implementation details belong in `tasks.md`; this file is the reference for testing and review.

## Access

- The page and all of its data are visible only to signed-in admins; any other visitor is redirected away (existing admin gate is unchanged).
- Email is shown in full to admins only and is resolved server-side; it is never part of the page address or any request a non-admin could make.

## Row contents

- Every row shows, together and in a consistent layout:
  - the person's **username**;
  - the person's **email**, or a clear **"no email on file"** indicator when there is no stored email;
  - the person's **status** (`active`/`disabled`);
  - the person's **current roles**, where people with no grants are shown with the implicit **reader** role;
  - the existing **role assignment** controls for admin-eligible roles (`contributor`, `moderator`), unchanged in behavior.

## List view parameters

All parameters travel in the page address (query string) and are validated against the allowed values below.

| Parameter | Allowed values | Default | Effect |
|---|---|---|---|
| `q` | trimmed text (capped length) | (empty) | Case-insensitive partial match on username **or** email. |
| `role` | `any` \| `reader` \| `contributor` \| `moderator` \| `admin` | `any` | `reader` = people with no role grants; explicit values = people holding that grant. |
| `status` | `any` \| `active` \| `disabled` | `any` | Filters by account status. |
| `sort` | `username` \| `email` \| `status` \| `role` \| `created` | `username` | Ordering attribute. |
| `dir` | `asc` \| `desc` | `asc` | Ordering direction. |
| `page` | positive integer | `1` | 1-based page number; page size is fixed at 20. |

- **Combination**: Search, role, and status criteria intersect.
- **Multi-role behavior**: A person holding several roles appears under every role filter they satisfy, never duplicates within one filtered list.
- **Invalid values**: An unknown role, status, sort, or direction falls back to the default; an invalid or out-of-range page clamps to a valid page (first page when the page number exceeds the last page).
- **Reset rule**: Changing `q`, `role`, `status`, `sort`, or `dir` returns the list to page 1.

## Sorting

- Sortable by username (default, ascending — current behavior), email, status, role, or account creation date, in ascending or descending order.
- Role ordering is **deterministic**: a fixed hierarchy (`admin` > `moderator` > `contributor` > `reader`) with the username as a stable tie-breaker, so people holding multiple roles do not shuffle between pages or refreshes.
- On email sorts, people with no email on file sort last regardless of direction.

## Pagination

- At most 20 people render per page; the controls expose the current page, the total number of pages, and an accurate "showing X–Y of Z" summary.
- Next/previous and page-number controls navigate within the current criteria; every move is reflected in the page address.
- With 20 or fewer matching people, pagination controls are hidden or disabled rather than showing a single empty page; there is never a blank page.

## Persistence and refresh

- The active `q`, `role`, `status`, `sort`, `dir`, and `page` survive a page refresh and can be restored from a bookmark or shared link.
- After a role update on the page, the same filtered, sorted, paged view is re-rendered with refreshed row data.

## Empty and absence states

- When no people match the current criteria, the page shows a clear "no people match" message and a control that clears the criteria back to the default view.
- A person without a stored email always shows the "no email on file" indicator — never a blank, malformed, or missing cell.

## Accessibility

- Every search, filter, sort, and pagination control is a native, labeled control, operable by keyboard, with a visible focus indicator and a sufficient activation target.
- Result totals and page state are announced to assistive technology (e.g., a live region or equivalent) so the outcome of applying a filter is understood without visual confirmation.
- Controls remain usable and cause no horizontal overflow at 390 px; row layout is responsive.

## Failure behavior

- If the data query fails or times out, the error is surfaced in the established admin error style and the page remains navigable to the list root.
- An invalid page address never yields a blank page; it resolves to a valid page with the criteria intact.