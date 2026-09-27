# Quickstart: Blog Site Validation

This guide describes the local setup and end-to-end checks required to validate the launch workflows. Commands assume the proposed `apps/web` Next.js application, npm scripts, and Supabase local project are in place during implementation.

## Prerequisites

- Current supported Node.js LTS release and npm
- Docker running for the local Supabase services
- Supabase CLI
- A local environment file based on the application's example, containing local Supabase URL/keys and no production secrets
- Google OAuth credentials and registered callback configuration only when testing the real provider flow; routine automated tests should use a controlled test session/provider setup

## Start the local environment

From the repository root:

```sh
npm --prefix apps/web install
npx supabase start
npx supabase db reset
npm --prefix apps/web run dev
```

Open the local web address printed by the development server. Use seeded test accounts for reader, contributor, moderator, admin, and a contributor-plus-moderator account. Local seed data must not contain real user credentials.

## Automated validation

Run from the repository root:

```sh
npm --prefix apps/web run test:unit
npx supabase test db
npm --prefix apps/web run test:e2e
```

Expected results:

- Unit tests cover article validation, username normalization, role combinations, blocked-word matching, unique report counting, threshold evaluation, and comment-toggle enforcement.
- Database tests prove allowed and denied operations for anonymous users and each role, including multi-role grants, report uniqueness, moderator threshold restrictions, and admin bypass.
- Browser tests exercise the public article path and the protected journeys below. Google OAuth does not need a live Google account in routine CI.

## End-to-end scenarios

1. **Anonymous reading**: Visit the home/article list, open a published seeded article, and verify its complete title/body/image display on desktop and mobile viewport sizes. Confirm a draft cannot be opened publicly.
2. **Independent publishing**: Sign in as a contributor, create a draft, verify an empty title/body is rejected while the draft remains, then publish valid content and confirm it appears publicly. Verify a moderator-only account cannot publish.
3. **Reader account and comment**: Register/sign in with username/password (including a non-enumerating failed login) or use the controlled Google test path. Submit an allowed comment and verify it appears; submit a blocked-word test case and verify it is not public and receives a clear explanation.
4. **Report and threshold**: Report the same comment twice as the same account and verify it counts once. Confirm it remains visible. Add distinct reports until the configured threshold is reached, then verify a moderator can delete it.
5. **Admin bypass and global toggle**: Flag a separate comment once and verify an admin can delete it below threshold. Disable comments as admin, verify the article displays a notice and a new submission is refused without losing composed text, then re-enable comments.
6. **Content moderation**: Remove an article as a moderator and verify it is no longer available publicly; verify the moderator still cannot create or publish a replacement article.
7. **Multi-role account**: Sign in as an account with contributor and moderator roles and verify it can publish and moderate according to both grants. Confirm an account without those grants receives clear denials.
8. **Accessibility and performance**: Run automated accessibility checks on representative public and protected pages; manually verify keyboard navigation. Record public article Core Web Vitals against the plan targets and retain the result as the launch baseline.

## Shutdown

Stop the local app process, then stop local Supabase services:

```sh
npx supabase stop
```

See [data-model.md](data-model.md) for entities/invariants and [the interaction contract](contracts/web-interaction-contract.md) for expected observable behavior.
