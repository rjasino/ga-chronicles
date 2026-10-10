# Research: People & Roles List Enhancements

**Date**: 2026-10-03
**Scope**: Resolve planning decisions for the enhanced "People & roles" admin page (search, filters, sort, email on rows, pagination), per [spec.md](spec.md).

## Decision: Render the list server-side, driven entirely by URL search parameters

- **Decision**: Keep `apps/web/src/app/admin/users/page.tsx` a server component and load the whole view state (search text, role filter, status filter, sort attribute, sort direction, page) from the page address (`searchParams`). The filter/search bar is a native `GET` form whose inputs carry the contract names; sort and pagination are links or small forms that update the same parameters.
- **Rationale**: The page already fetches data server-side through the service-role client in `listManagedAccounts`, so applying filters to that query is the smallest change. Because the state lives in the URL, the FR-012 requirement (view survives refresh, can be bookmarked or shared, restores on revisit) and FR-011 (changing criteria returns to page 1) fall out naturally with no client state library, no API route, and no new dependency — consistent with the app's server-component-first architecture. `revalidatePath("/admin/users")` after a role update re-renders the same route and the browser keeps the query string, so an admin stays in their filtered view.
- **Alternatives considered**: A client-side filter board with React state (adds a `"use client"` data layer, redraws from client state, and would need extra work to keep the URL in sync — higher complexity for the same visible result); a dedicated read API route (unnecessary: the same server code that renders the page can query directly, and an API route would duplicate the existing service-role access pattern); querying the whole table and filtering in memory (fails the bounded-performance constraint as the list grows).
- **Sources**: [spec.md](spec.md) FR-010/FR-011/FR-012; SC-005; `apps/web/src/app/admin/users/page.tsx`; `apps/web/src/features/admin/account-actions.ts` (`listManagedAccounts`).

## Decision: Role filter distinguishes the implicit reader from explicit grants; multi-role people match each role they hold

- **Decision**: Model the role filter as a value from {any, reader, contributor, moderator, admin}. "reader" selects accounts with **zero** `account_roles` grants; each of contributor/moderator/admin selects accounts holding that grant; "any" selects everyone. An account with several grants appears under every role filter it matches.
- **Rationale**: `account_roles` only stores contributor/moderator/admin; reader is every other account (confirmed by `permissions.ts`, where `Role = "reader" | ...` and the existing admin list shows all accounts). This reproduces the spec's FR-005/FR-014/FR-015 semantics exactly and is expressible as one extra presence check (no grants) server-side.
- **Alternatives considered**: Filtering only on stored roles and omitting reader (would make reader-only accounts unfindable — contradicts FR-014 and the assumption that "people covers every account"); treating "no filter" as reader (would make the default view wrong).
- **Sources**: [spec.md](spec.md) FR-005/FR-014/FR-015; `apps/web/src/lib/authz/permissions.ts`; `apps/web/src/features/admin/account-actions.ts`.

## Decision: Show email from the server-only lookup; render a clear indicator when missing

- **Decision**: Extend `listManagedAccounts` to include the person's email via the existing `account_auth_lookup` table using the same service-role client the function already uses. Each row renders username, email, status, and roles; when a person has no lookup row, render a clear "no email on file" indicator (FR-002/FR-003).
- **Rationale**: `account_auth_lookup` is exactly the account→email mapping (RLS-restricted to the service role per migration `0001`), and admin actions already read it server-side when creating accounts, so there is no new data class or access path. Missing emails are expected for some legacy/signup readers, so the empty state must be designed, not an accident.
- **Alternatives considered**: Returning the email via a user-facing/authenticated query (impossible — `account_auth_lookup` grants select only to `service_role`, and email should stay server-only); displaying only usernames (fails the core request to "identify the user better").
- **Sources**: [spec.md](spec.md) FR-002/FR-003; Assumption "Email visibility"; `supabase/migrations/0001_core_schema.sql` (`account_auth_lookup`); `apps/web/src/features/admin/account-actions.ts`.

## Decision: Sort is pushed to the data layer with an explicit deterministic rule for role ordering

- **Decision**: Allow sort by username, email, status, role, or account creation date, in ascending or descending order, defaulting to username ascending (current behavior). Ordering is applied in the query. Role ordering uses a fixed hierarchy (admin > moderator > contributor > reader) with the username as a stable tie-breaker; on email sorts, accounts with no email sort last regardless of direction.
- **Rationale**: Sorting in the query keeps the page bounded (only 20 rows are fetched) and matches the server-rendered decision above. The spec (FR-015, SC-004) requires that multi-role accounts not shuffle between pages or refreshes, so the hierarchy plus tie-breaker makes ordering total and deterministic even when a person holds several roles.
- **Alternatives considered**: Sorting in the browser after fetching all rows (unbounded work as the list grows — fails the performance constraint); sorting by role using the first grant alphabetically (arbitrary and not stable across grant-text choices, e.g. `admin` vs `moderator`); no role sort (omits an explicitly requested attribute).
- **Sources**: [spec.md](spec.md) FR-008/FR-009/FR-015; SC-004; `supabase/migrations/0001_core_schema.sql` (`accounts.created_at`, `account_roles`).

## Decision: Page at exactly 20 rows per request with a lightweight total-count query

- **Decision**: Apply the filter/search/sort in the query with a limit of 20 and the appropriate offset; run a matching total-count query so the page numbers and "showing X–Y of Z" label are accurate. The default page is 1; an invalid or out-of-range page number is clamped to a valid page; changing any criterion resets to page 1.
- **Rationale**: A bounded page keeps payload and render cost flat "as the list grows" (the direct motivation in the request, FR-010/FR-018, SC-004). The count query gives correct totals without fetching more rows (SC-004). Clamping satisfies the page-out-of-range edge case and the reset rule satisfies FR-011.
- **Alternatives considered**: An unbounded full-list fetch with client paging (defeats the purpose of pagination for a growing list); keyset pagination on `created_at` (more robust at extreme scale but unnecessary for an admin table and incompatible with free-form sorts); fetching UI around a hard-coded maximum (hides data — fails SC-004).
- **Sources**: [spec.md](spec.md) FR-010/FR-017/FR-018; SC-004; edge cases "boundary pagination" and "page out of range".

## Decision: Validate every incoming view-state value against an allowlist before it reaches the query

- **Decision**: A small pure module (`features/admin/people-view.ts`) parses and Zod-validates the query values: `q` (trimmed, length-capped string), `role` (any/reader/contributor/moderator/admin), `status` (any/active/disabled), `sort` (username/email/status/role/created), `dir` (asc/desc), and `page` (positive integer). Unknown or invalid values fall back to documented defaults; the values that reach the data accessor are exclusively these validated atoms. Username and email are matched server-side only, never read from the query as criteria.
- **Rationale**: The page is admin-only, but robustness and the constitution's security principle argue for treating the query string as untrusted: allowlist validation eliminates any injection/filter-manipulation surface and guarantees the query always receives known-safe values. Centralizing this in one pure module makes it unit-testable (Principle II) and keeps the page component trivial.
- **Alternatives considered**: Passing raw query strings into the data accessor (unvalidated input reaches the query — rejected); validating inline in the page component (scatters the logic and makes it hard to test in isolation); a schema library beyond the existing Zod (unnecessary dependency).
- **Sources**: [spec.md](spec.md) FR-004–FR-011/FR-013/FR-016; constitution Principle IV; `apps/web/package.json` (zod already present).

## Decision: Test with unit tests for the view-state module and Playwright for the visible behavior

- **Decision**: Add Vitest unit tests for `people-view.ts` (parsing/validation of every parameter, reader semantics, role-hierarchy ordering with tie-breaker, page clamping, defaults). Extend Playwright coverage with a new `people-list.spec.ts` covering search, role/status filters, sort, pagination math (20/page, totals, page numbers), email display and missing-email indicator, empty state, and URL persistence/refresh; update `admin-accounts.spec.ts` so the existing role-assignment and creation flows keep passing against the new row markup. Include axe accessibility checks on the page.
- **Rationale**: The genuinely testable logic is small and pure, so the constitution (Principle II) is satisfied with focused unit tests; the visible, stateful behavior (URL round-trips, pagination, a11y) is exactly what Playwright is for. Because the file format of the row changes (list → table with email), the existing admin e2e must be updated in the same change.
- **Alternatives considered**: E2E only (leaves the pure logic and edge semantics untested — weaker against Principle II); unit tests only (cannot prove URL persistence, responsive behavior, or axe cleanliness).
- **Sources**: [spec.md](spec.md) SC-004/SC-006/SC-007/SC-008; constitution Principle II; `apps/web/tests/unit/admin/account-management.test.ts` (existing pattern); `apps/web/tests/e2e/admin-accounts.spec.ts`.

## Resolved planning unknowns

- **Where the work happens**: server components reading URL search parameters; no new packages, no API route, no client data layer.
- **Filter semantics**: role filter includes implicit reader (zero grants); multi-role people match each role filter they hold; status filter covers active/disabled; criteria intersect.
- **Email**: resolved server-side from `account_auth_lookup` via the existing service-role client; missing email renders "no email on file".
- **Sort**: allowlisted attributes, both directions, default username ascending; deterministic role ordering via a fixed hierarchy plus username tie-breaker; missing emails sort last.
- **Pagination**: 20 per request, total-count query, clamp invalid/out-of-range pages, reset to page 1 on criterion change.
- **Validation**: every query value allowlisted/parsed in one pure, unit-tested module.
- **Testing/data**: no schema or dependency changes; remaining unknowns for Phase 1 are none.