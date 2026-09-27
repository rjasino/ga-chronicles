# Quickstart: Blog Site Validation

This guide describes the local setup and end-to-end checks for the Next.js application and Supabase project.

## Prerequisites

- Node.js 24 LTS and npm
- Docker running for the local Supabase services
- Supabase CLI
- `apps/web/.env.local` based on `.env.example`, populated only with local Supabase values
- Google OAuth credentials and registered callback configuration only when testing the real provider flow; routine automated tests should use a controlled test session/provider setup

## Start the local environment

From the repository root:

```sh
npm --prefix apps/web install
npx supabase start
npx supabase db reset
npm --prefix apps/web run dev
```

Copy the `API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY` values printed by `npx supabase status -o env` into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Add `SITE_URL=http://localhost:3000`. Keep the service-role value server-only; all values here must be local development credentials.

The reset seeds disposable, local-only users (never use these credentials in production):

| Role | Username | Password |
|---|---|---|
| Reader | `localreader` | `local-reader-password` |
| Contributor | `localcontributor` | `local-contributor-password` |
| Moderator | `localmoderator` | `local-moderator-password` |
| Admin | `localadmin` | `local-admin-password` |
| Contributor + moderator | `localmulti` | `local-multi-password` |

Open the local web address printed by the development server. Public signup only creates a reader; contributor/moderator accounts are provisioned from the admin area.

## Automated validation

Run from the repository root:

```sh
npm --prefix apps/web run test:unit
npm --prefix apps/web run test:database
npm --prefix apps/web run test:e2e
npm --prefix apps/web run lint
npm --prefix apps/web run typecheck
npm --prefix apps/web audit --audit-level=moderate
```

Expected results:

- Unit tests cover article validation, username normalization, role combinations, blocked-word matching, unique report counting, threshold evaluation, and comment-toggle enforcement.
- Database tests prove allowed and denied operations for anonymous users and each role, including multi-role grants, report uniqueness, moderator threshold restrictions, and admin bypass.
- Browser tests exercise the public article path and the protected journeys below. Google OAuth does not need a live Google account in routine CI.

## Verified implementation results

Validated on 2026-09-27 with Node 24.20.0, npm 11.4.1, Supabase CLI 2.118.0, and Docker Desktop 29.2.1:

| Check | Result |
|---|---|
| `npm --prefix apps/web run lint` | PASS |
| `npm --prefix apps/web run typecheck` | PASS |
| `npm --prefix apps/web run test:unit` | PASS — 26 tests |
| `npm --prefix apps/web run test:database` | PASS — 33 pgTAP assertions across 6 files |
| `npm --prefix apps/web run test:e2e` | PASS — 13 Chromium scenarios, including axe, keyboard navigation, responsive, auth, publishing/republishing, comments, account/role management, and moderation |
| `npm --prefix apps/web run build` | PASS — optimized production build |
| `npm --prefix apps/web audit --audit-level=moderate` | PASS — 0 vulnerabilities |
| `npm --prefix apps/web run performance` | PASS — measured three local runs per route at 1280 px and 390 px; results in [performance baseline](../../docs/operations/performance-baseline.md) |

## End-to-end scenarios

1. **Anonymous reading**: Visit the home/article list, open a published seeded article, and verify its complete title/body/image display on desktop and mobile viewport sizes. Confirm a draft cannot be opened publicly.
2. **Independent publishing**: Sign in as a contributor, create a draft, verify an empty title/body is rejected while the draft remains, then publish valid content and confirm it appears publicly. Verify a moderator-only account cannot publish.
3. **Reader account and comment**: Register/sign in with username/password (including a non-enumerating failed login) or use the controlled Google test path. Submit an allowed comment and verify it appears; submit a blocked-word test case and verify it is not public and receives a clear explanation.
4. **Report and threshold**: Report the same comment twice as the same account and verify it counts once. Confirm it remains visible. Add distinct reports until the configured threshold is reached, then verify a moderator can delete it.
5. **Admin bypass and global toggle**: Flag a separate comment once and verify an admin can delete it below threshold. Disable comments as admin, verify the article displays a notice and a new submission is refused without losing composed text, then re-enable comments.
6. **Content moderation**: Remove an article as a moderator and verify it is no longer available publicly; verify the moderator still cannot create or publish a replacement article.
7. **Multi-role account**: Sign in as an account with contributor and moderator roles and verify it can publish and moderate according to both grants. Confirm an account without those grants receives clear denials.
8. **Accessibility and performance**: Run automated accessibility checks on representative public and protected pages; manually verify keyboard navigation. Run `npm --prefix apps/web run performance` against the production build and retain results in `docs/operations/performance-baseline.md`. Repeat Lighthouse with throttling on a deployed preview before launch; local results do not substitute for field INP.

## Shutdown

Stop the local app process, then stop local Supabase services:

```sh
npx supabase stop
```

See [data-model.md](data-model.md) for entities/invariants and [the interaction contract](contracts/web-interaction-contract.md) for expected observable behavior.
