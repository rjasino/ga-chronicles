# Implementation Plan: People & Roles List Enhancements

**Branch**: `005-people-roles-list-enhancement` | **Date**: 2026-10-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-people-roles-list-enhancement/spec.md`

## Summary

Enhance the admin-only "People & roles" page (`/admin/users`) so administrators can find and manage people as the account list grows: every row shows identifying detail (username, server-held email, status, current roles), the list can be narrowed by a text search on username/email plus role and status filters, reordered by username/email/status/role/creation date in either direction, and paged at 20 per page with accurate totals. The current view (search, filters, sort, page) lives in the page address so it survives refresh, can be bookmarked or shared, and returns to page 1 whenever criteria change. Implemented with the existing stack (Next.js 16 App Router server components driven by URL search parameters, the existing Supabase service-role data access in `features/admin/account-actions.ts`, Zod for validating incoming view-state values, existing CSS in `globals.css`) — no new npm packages, no schema change, no new routes, and no change to the existing role-assignment or account-creation flows.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 24 LTS, React 19, Next.js 16.3 (App Router — the page is a server component reading `searchParams`; client islands only where interactivity is required, matching the existing `RoleAssignmentForm` pattern)

**Primary Dependencies**: Existing application only — Next.js `searchParams` on the route page, `@supabase/supabase-js` service-role client already used by `listManagedAccounts` in `apps/web/src/features/admin/account-actions.ts`, and Zod (already a dependency) for validating/coercing incoming view-state query values. No new npm packages required.

**Storage**: Supabase (PostgreSQL) — existing tables `accounts` (username, display_name, status, created_at), `account_roles` (contributor/moderator/admin grants), and `account_auth_lookup` (server-only email). Read-only for this feature; no migrations, policies, or storage changes.

**Testing**: Vitest + Testing Library for a new pure module that parses, validates, and normalizes the view state and computes the role-aware filter/sort semantics (including the implicit reader role and deterministic multi-role ordering); Playwright e2e — extend `admin-accounts.spec.ts` for the changed row markup and add `people-list.spec.ts` covering search/filter/sort/pagination/email and URL persistence, with axe accessibility checks via the existing setup.

**Target Platform**: Responsive web admin area (desktop and mobile), admin-only page.

**Project Type**: Single full-stack Next.js web application — a server-rendered admin data table with URL-driven view state and one pre-existing client island (role assignment) per row.

**Performance Goals**: Response size and render cost stay flat as the dataset grows (exactly one page of 20 rows per request); a separate lightweight total-count query keeps the footer and page numbers accurate; preserve the existing public/admin page baselines (no heavy client bundles are added).

**Constraints**: The page MUST remain admin-only (`requireAnyRole(["admin"])`); email and username are resolved server-side only and never accepted from the client query; every incoming query value MUST be validated against an allowlist/parser before reaching the data query (no unvalidated input); search matches username and email case-insensitively on partial input; role sorting MUST be deterministic for multi-role people (order stable across pages and refreshes); changing any criterion returns to page 1; an out-of-range or invalid page resolves to a valid page; controls MUST be keyboard operable and labeled (WCAG 2.1 AA); no horizontal overflow at 390 px; existing role-assignment and account-creation flows unchanged.

**Scale/Scope**: Small, bounded change to a single admin page and its data access: one modified page, two new server components (list/filters and pagination, or equivalent), one new pure view-state module, an extended `listManagedAccounts` data accessor, styles in the existing stylesheet, and associated tests. No new routes, no new dependencies, no schema change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / gate | Plan response | Status |
|---|---|---|
| I. Code quality and review | View-state parsing and role/filter semantics are isolated in a small, documented pure module (`features/admin/people-view.ts`), components follow the existing `components/admin/*` and `features/admin/*` conventions, and all changes go through code review before merge. | PASS |
| II. Unit and integration testing | The pure view-state module is covered by Vitest unit tests (param validation, reader semantics, deterministic ordering, page clamping); data access keeps integration coverage via the existing e2e suite; e2e is extended for filter/search/sort/pagination/email/URL persistence and the updated row markup; the existing suite must keep passing. | PASS |
| III. Consistent, accessible UX | Reuses the established admin design language (`admin-page`, `section-heading`, `admin-list`, form/button styles); all filter, search, sort, and pagination controls are native, labeled, keyboard operable, and axe-verified; responsive behavior preserved at 390 px; empty and "no email on file" states are clear and on-brand. | PASS |
| IV. Security | Access remains admin-only; email and username are never fetched from the client — every query value is allowlist-validated before being used; search is applied as a parameterized predicate with no injection surface; no new network surface, secret, or data class is introduced. | PASS |
| V. Performance | One page of 20 rows per request keeps payloads and rendering flat as the list grows; a bounded total-count query keeps page numbers accurate; filter/sort are pushed down to the data layer so no unbounded in-memory filtering occurs; public-page baselines are untouched and admin-page performance is re-checked. | PASS |

**Pre-research gate**: PASS. No constitutional conflict or requested exception.

## Project Structure

### Documentation (this feature)

```text
specs/005-people-roles-list-enhancement/
├── plan.md                        # This file (/speckit.plan command output)
├── research.md                    # Phase 0 output
├── data-model.md                  # Phase 1 output
├── quickstart.md                  # Phase 1 output
├── contracts/
│   └── people-list-contract.md    # Phase 1 output
└── tasks.md                       # Created by /speckit.tasks (NOT created here)
```

### Source Code (repository root)

```text
apps/web/src/
├── app/
│   ├── admin/users/page.tsx           # Modified: reads searchParams, renders filters + table + pagination, keeps admin gate
│   └── globals.css                    # Modified: styles for the people table, filter bar, sort control, pagination, empty state
├── components/admin/
│   ├── people-list.tsx                # New (server): the filtered/sorted rows incl. email, status, roles + <RoleAssignmentForm />
│   ├── people-filters.tsx             # New (server): GET form — search input, role and status selects, sort select + direction toggle
│   └── pagination.tsx                 # New (server): <Link>-based page numbers + prev/next and result totals
└── features/admin/
    ├── account-actions.ts             # Modified: listManagedAccounts accepts the validated view state, returns page rows + total + email
    └── people-view.ts                 # New: parse/validate/normalize query values, reader-role semantics, deterministic role ordering, clamp page (unit-tested)

apps/web/tests/
├── unit/admin/people-view.test.ts     # New: parsing, validation, reader semantics, ordering stability, page clamping
├── e2e/people-list.spec.ts            # New: search/filter/sort/pagination, email display, URL persistence, empty state
└── e2e/admin-accounts.spec.ts         # Modified: keep role-assignment and creation flows passing against the new row markup
```

**Structure Decision**: Extend the single Next.js application in place. View state travels in the page URL as search parameters, so the existing server-component architecture renders the entire list without adding a client data layer or new dependency. Pure logic (parsing, validation, role semantics, ordering, clamping) lives in a small `features/admin/people-view.ts` module, mirroring the existing `features/*` logic / `components/*` UI split, and is unit-tested in isolation. The only client island remains the existing per-row role-assignment form. No new routes, no schema change, no new packages.

## Complexity Tracking

> No constitutional violations or unnecessary layers are proposed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | — | — |

## Phase 0 Research Summary

Research decisions and sources are recorded in [research.md](research.md). Key outcomes:

- **Server-rendered, URL-driven list**: the page stays a server component and reads its view state (search, role filter, status filter, sort, direction, page) from the page address via `searchParams`; filter controls are a native `GET` form and pagination uses `<Link>`s, so no client state library or new dependency is needed and the view survives refresh/bookmark/share by construction.
- **Reader role semantics**: "reader" is the implicit role of any account with zero `account_roles` grants; the role filter distinguishes no-grants (reader) from each explicit grant, and multi-role people correctly match every role filter they hold.
- **Email display**: `listManagedAccounts` extends its read to include `account_auth_lookup(email)` through the existing service-role client; a missing email renders a clear "no email on file" indicator.
- **Deterministic ordering**: SQL ordering on the chosen attribute; role ordering uses a fixed hierarchy (admin > moderator > contributor > reader) with username as a stable tie-breaker; missing emails sort last on email sorts.
- **Bounded pagination**: exactly 20 rows per request plus a lightweight total-count query; page 1 default, out-of-range or invalid pages clamp to a valid page, and changing any criterion resets to page 1.
- **Validation first**: every incoming query value is parsed and allowlist-validated with Zod before reaching the data query; username/email are only ever resolved server-side.
- **Testing**: unit tests for the pure view-state module; Playwright coverage in a new `people-list.spec.ts` plus updates to `admin-accounts.spec.ts`; axe checks included.

## Phase 1 Design Summary

- [data-model.md](data-model.md) documents the read model (person row incl. server-only email, role grants, implicit reader) and the "list view" view-state entity (q/role/status/sort/dir/page) with validation and transition rules; no schema change.
- [contracts/people-list-contract.md](contracts/people-list-contract.md) documents the observable contract: admin-only access, row contents, search/filter/sort semantics (incl. deterministic multi-role ordering), pagination rules, URL persistence, empty and missing-email states, and accessibility guardrails.
- [quickstart.md](quickstart.md) provides local setup, automated commands, and end-to-end validation scenarios for the enhanced People & roles page.

**Post-design Constitution Check**: PASS. The design keeps the admin area on-brand, accessible, responsive, and secure (admin-only, server-resolved email, allowlist-validated query values), adds a bounded page size so performance stays flat as the list grows, and introduces no schema change, no new dependency, and no new route; no violations require a waiver.