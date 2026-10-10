# Quickstart: People & Roles List Enhancements — Validation

This guide describes local setup and end-to-end checks for the enhanced "People & roles" admin page. It validates that the existing admin flows still work and that the new search, filter, sort, email-detail, and pagination behavior performs as specified.

## Prerequisites

- Node.js 24 LTS and npm
- Local Supabase running (or a `.env.local` pointing at a reachable project), since the admin list reads Supabase data
- `apps/web/.env.local` based on `.env.example`
- An admin account (e.g. `localadmin` / `local-admin-password` per the project's seed). No extra seeding is required for pagination/filter checks: `supabase/seed.sql` provisions 36 deterministic `testuser01…testuser36` accounts on top of the 5 base accounts (41 people total → 3 pages at 20 per page), spread across roles (readers, contributors, moderators, an admin), including one disabled account (`testuser36`) and one with no stored email (`testuser30`). The seed is idempotent — re-running it never duplicates rows.

No schema migration or seed step is required by this feature — it reads existing tables (`accounts`, `account_roles`, `account_auth_lookup`).

## Start the local environment

From the repository root:

```sh
npm --prefix apps/web install
npx supabase start && npx supabase db reset
npm --prefix apps/web run dev
```

Sign in as an admin and open `http://127.0.0.1:3000/admin/users`.

## Automated validation

Run from the repository root:

```sh
npm --prefix apps/web run lint
npm --prefix apps/web run typecheck
npm --prefix apps/web run test:unit
npm --prefix apps/web run test:e2e
npm --prefix apps/web run build
```

Expected results:

- **Unit** (`tests/unit/admin/people-view.test.ts`): the view-state module parses and validates every parameter; unknown/invalid values fall back to defaults; `reader` resolves to people with no grants; role ordering follows the fixed hierarchy with the username tie-breaker; out-of-range pages clamp; default view is username ascending, page 1.
- **E2E** (`tests/e2e/people-list.spec.ts`): search narrows by username and email; role and status filters combine; sort applies in both directions including deterministic role order; pagination shows 20 per page with correct totals and no skipped/repeated people across pages; email and the "no email on file" indicator render; empty state with a clear-filters path; the view state survives a reload and a re-visit from a shared link.
- **Updated existing spec** (`tests/e2e/admin-accounts.spec.ts`): provisioning and role-assignment flows still pass against the new row markup; changing a role keeps the admin in the same filtered view.
- **Build**: the production build succeeds.

## End-to-end scenarios

1. **Rows identify people**: On `/admin/users`, confirm every row shows username, email (or "no email on file"), status, and roles, with the role-assignment controls still present and working.
2. **Search**: Type a partial username and then a partial email fragment (mixed case) and confirm only matching people appear; clear the search and confirm the full list returns.
3. **Role filter includes reader**: Select the "Reader" role filter and confirm only people with no explicit grants appear; select "Moderator" and confirm moderators appear (including any moderator who also holds another role).
4. **Status filter combines**: Apply a role filter plus the "Disabled" status filter and confirm the intersection is shown with the total updated.
5. **Sort**: Sort by role (both directions) and confirm the fixed order (admin → moderator → contributor → reader) is stable across page turns; sort by email and confirm people with no email sort last; sort by account creation date and confirm oldest/newest-first.
6. **Pagination math**: With 25+ matching people, confirm page size is 20, page-number and next/previous navigation work, the "showing X–Y of Z" values are accurate, and no person is skipped or repeated across all pages.
7. **Reset to page 1**: Navigate to a later page, then change the search or a filter, and confirm the list returns to page 1.
8. **Invalid/out-of-range page**: Open a URL with `page=999` (or `page=abc`) and confirm the page resolves to a valid page rather than a blank list.
9. **Persistence**: Apply a search/filter/sort and go to page 2, reload, and confirm the same view is restored; copy the page address, sign out and back in, open it, and confirm the same view renders.
10. **Empty state**: Search for a string no person matches and confirm a clear "no people match" message with a way to clear the criteria back to the default list.
11. **Missing email**: Confirm the person without a stored email shows the "no email on file" indicator consistently across pages and sort orders.
12. **Accessibility**: Tab through the search, filters, sort, and pagination controls and confirm visible focus, labeled controls, and announced result totals; run the project's accessibility check on `/admin/users` and confirm zero WCAG 2.1 AA violations.
13. **No regression**: Confirm account creation (`/admin/users/new`) and per-row role assignment still work as before, and the page has no horizontal overflow at 390 px.

## Verified implementation results

Validated on 2026-10-03 with Node 24, Next.js 16.3, local Supabase (Docker), Chromium.

| Check | Result |
|---|---|
| `npm --prefix apps/web run lint` | PASS — 0 errors |
| `npm --prefix apps/web run typecheck` | PASS |
| `npm --prefix apps/web run test:unit` | PASS — 90 tests, including the new view-state module tests (`tests/unit/admin/people-view.test.ts`) |
| `npm --prefix apps/web run test:e2e` | PASS — 46 Chromium scenarios, including the new `people-list-*` specs, the updated `admin-accounts.spec.ts`, and axe checks on `/admin/users` |
| `npm --prefix apps/web run build` | PASS — optimized production build |
| Search | Partial username/email search (mixed case) narrows the list; unmatched input shows the empty state with a clear-filters path |
| Filters | Role filter covers the implicit `reader` (accounts with no grants) plus each explicit role; the status filter combines by intersection |
| Sort | Default username ascending; role sort follows the fixed hierarchy `admin > moderator > contributor > reader` stably across pages; email sort puts accounts with no email last in both directions; creation-date sort is oldest/newest-first |
| Pagination | 20 per page with accurate "showing X–Y of Z" totals; page-number and prev/next navigation; no skipped/repeated people across pages; out-of-range and invalid pages resolve to a valid page; changing a filter returns to page 1 |
| Rows | Every row shows username, email (or "no email on file"), status, and current roles; the per-row role-assignment controls still work and persist in the filtered view |
| Persistence | Filter/sort/page state survives a reload and a shared link; a role update keeps the admin in the same filtered view |
| Accessibility | Zero axe WCAG 2.1 AA violations on `/admin/users`; search/filter/sort controls are labeled native controls |

## References

- Observable behavior and query contract: [contracts/people-list-contract.md](contracts/people-list-contract.md)
- View-state model and read model: [data-model.md](data-model.md)
- Requirements and success criteria: [spec.md](spec.md)