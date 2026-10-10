# Data Model: People & Roles List Enhancements

This feature introduces **no schema change**. It composes existing data into a read model for the admin list and adds a URL-borne UI state entity (the "list view"). No tables, columns, indexes, policies, or storage are added or modified.

## Existing data (read-only, reused)

### Entity: Person (account)

The unit depicted by one list row; identified by a stable id.

| Attribute | Source (existing) | Notes |
|---|---|---|
| `id` | `accounts.id` | Stable identity; never rendered as editable data. |
| `username` | `accounts.username` | Normalized, unique login handle; shown on every row. |
| `email` | `account_auth_lookup.email` | Server-only; may be absent for some accounts; shown on every row or replaced by the "no email on file" indicator. |
| `status` | `accounts.status` | One of `active` \| `disabled`. |
| `created_at` | `accounts.created_at` | Account creation timestamp; a sort attribute. |
| `roles` | `account_roles.role` (per account) | Grants of `contributor` \| `moderator` \| `admin`; zero grants means the implicit `reader` role. |

### Entity: Role grant

The assignment of a role to a person. `reader` is implicit (no grant row); `contributor`, `moderator`, and `admin` are explicit grants. A person can hold multiple grants; composite people appear under each role filter they match.

## New data: List view (view state)

The combination of criteria that selects and orders which people are shown on the People & roles page. It is owned by the page address (search parameters), not by the data store.

| Attribute | Allowed values | Default | Notes |
|---|---|---|---|
| `q` (search) | trimmed free text, capped length | empty | Case-insensitive, partial match on username or email. |
| `role` | `any` \| `reader` \| `contributor` \| `moderator` \| `admin` | `any` | `reader` = zero grants; explicit roles = those grants. |
| `status` | `any` \| `active` \| `disabled` | `any` | |
| `sort` | `username` \| `email` \| `status` \| `role` \| `created` | `username` | |
| `dir` | `asc` \| `desc` | `asc` | |
| `page` | positive integer | `1` | Page size is fixed at 20. |

### Rules

- **Validation**: Every incoming value is parsed and validated against the allowed values before it reaches the data query. Invalid, missing, or unparseable values resolve to the defaults; an out-of-range `page` clamps to a valid page (first page when the requested page exceeds the last page). This is enforced by a pure, unit-tested module (`features/admin/people-view.ts`).
- **Intersection**: Search, role, and status criteria combine by intersection.
- **Reader semantics**: An account matches `role=reader` when it has zero role grants, and matches `role=<grant>` when it holds that grant. Multi-grant accounts match every role they hold.
- **Ordering**: Sorting applies on the chosen attribute; role ordering uses a fixed hierarchy (`admin` > `moderator` > `contributor` > `reader`) with the username as a stable tie-breaker so multi-role people never shuffle between pages or refreshes; on email sorts, accounts with no email sort last regardless of direction.
- **Reset on change**: Any change to `q`, `role`, `status`, `sort`, or `dir` resets `page` to `1`, so the admin always starts at the top of the fresh results.
- **Persistence**: The view state is preserved in the page address, so refresh, bookmark, and sharing restore the same view; after a role update, the page re-renders with the same view state.
- **Bounding**: Exactly one page (20 rows) is fetched per request; a matching total-count query supplies accurate totals for pagination without fetching all rows.

### State transitions

```text
(no params)                    --> q="", role=any, status=any, sort=username, dir=asc, page=1
apply search/filter/sort       --> page reset to 1 (criterion changed)
next/previous/page number      --> page = requested value (clamped to valid range)
invalid/missing param          --> that param's default; page clamped to a valid page
no matches                     --> empty-state view (criteria retained so the admin can adjust or clear)
role update on the page        --> same view state re-rendered (row contents refreshed)
```

## Integrity and authorization rules

- **Authorization**: The page remains admin-only; the data access path is unchanged (`requireAnyRole` gate + service-role read) and the list-view values are treated as untrusted input validated against allowlists.
- **Personal data**: Email and username are server-resolved only; the query string never carries or returns them as criteria. Email is displayed only to admins on the admin-only page, matching the existing privacy posture.
- **Consistency**: Totals shown must equal the actual count of matching people; pagination must neither skip nor repeat people across pages.