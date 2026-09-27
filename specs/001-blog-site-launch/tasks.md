# Tasks: Game Ako Chronicles Blog Site

**Input**: Design documents from `specs/001-blog-site-launch/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`  
**Tests**: Included because the project constitution requires comprehensive unit and integration testing with automation.

**Organization**: Tasks are grouped by the six user stories in `spec.md`. Every story phase includes its goal and an independent verification criterion.

## Format

`- [ ] T### [P?] [US#?] Description with file path`

- `[P]` appears only where the task can be done independently in separate files.
- `[US#]` is required for user-story tasks and omitted for setup, foundation, and polish tasks.
- Tasks are ordered by execution dependency; tests are defined before the implementation they verify.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the Next.js application workspace and local Supabase/test tooling.

- [X] T001 Initialize the TypeScript Next.js App Router application and scripts in `apps/web/package.json`, `apps/web/tsconfig.json`, and `apps/web/src/app/layout.tsx` using the current supported Node.js LTS release.
- [X] T002 [P] Configure the local Supabase project, database ports, Auth service, and Storage service in `supabase/config.toml`.
- [X] T003 Configure ESLint and Prettier settings and commands in `apps/web/eslint.config.mjs`, `apps/web/.prettierrc.json`, and `apps/web/package.json`.
- [X] T004 Add Vitest, React Testing Library, Playwright, and accessibility-test dependencies and configuration in `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts`, and `apps/web/package.json`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish verified Supabase access, common account/role/article/settings schema, and authorization foundations before story implementation.

- [X] T005 Define required server/browser environment variables and startup validation in `apps/web/.env.example` and `apps/web/src/lib/env.ts`; keep provider and service-role secrets server-only.
- [X] T006 Create cookie-aware server and browser Supabase clients and verified session accessors in `apps/web/src/lib/supabase/server.ts`, `apps/web/src/lib/supabase/client.ts`, and `apps/web/src/lib/supabase/session.ts`.
- [X] T007 [P] Write unit tests for additive reader/contributor/moderator/admin permissions and denial cases in `apps/web/tests/unit/authz/permissions.test.ts`.
- [X] T008 [P] Write pgTAP tests for account/role integrity and private draft access in `supabase/tests/database/core-schema.test.sql`.
- [X] T009 Create the core account, role, article, and site-setting schema in `supabase/migrations/0001_core_schema.sql` and preserve these field constraints verbatim: account `id` is “Stable identifier matching the authentication identity; required and unique,” `username` is “Required, normalized, unique login handle; never treated as a password or authorization claim,” `display_name` is “Optional name shown beside authored comments,” `status` is “Active or disabled; disabled accounts cannot sign in to protected features or create comments/reports,” and `created_at` is an “Account creation timestamp”; article `id` is a “Stable unique identifier,” `title` and `body` are “Required and non-empty after trimming,” body is “rendered safely as readable article content,” `slug` is a “Required, normalized, unique public route identifier,” `type` is one of news, review, commentary/opinion, or interview, `status` is “Draft, published, or removed; only published articles appear publicly,” `author_id` is a “Required reference to the account that authored the article,” `cover_image` is an “Optional reference to an associated stored image,” `published_at` is “Absent for drafts; set when published and refreshed on republish according to editorial behavior,” and `created_at`/`updated_at` are “Required timestamps”; site `comments_enabled` is “Required boolean; when false, new comment submissions are rejected and the public article page explains that comments are off,” `moderation_report_threshold` is a “Required positive integer,” `updated_by` is the “Admin account that last changed the settings,” and `updated_at` is a “Timestamp of the latest change.”
- [X] T010 Implement trusted server-side role checks and corresponding baseline RLS policies in `apps/web/src/lib/authz/permissions.ts` and `supabase/migrations/0001_core_schema.sql`, including additive role grants and admin-only role/settings management.
- [X] T011 Add local-only reader/contributor/moderator/admin/multi-role fixtures, one minimal published test article, and a safe first-admin bootstrap command in `supabase/seed.sql` and `apps/web/scripts/bootstrap-admin.ts`; do not put production credentials in source control.

**Checkpoint**: Local app and Supabase services start; core schema, verified sessions, role tests, and local fixtures are available. Story work can proceed.

---

## Phase 3: User Story 1 — Read published gaming content (Priority: P1) — MVP

**Goal**: Anonymous readers can list and open complete published articles while drafts remain private.

**Independent Test**: Seed one published article with a cover image and one draft; verify an anonymous visitor sees the published article in the list and can read its complete content and image on desktop and mobile, while the draft is not listed or accessible.

### Tests for User Story 1

- [X] T012 [P] [US1] Add browser tests for anonymous article listing, detail reading, responsive readability, and draft denial in `apps/web/tests/e2e/public-articles.spec.ts`.
- [X] T013 [P] [US1] Add unit tests proving public article queries return only published records and handle missing slugs in `apps/web/tests/unit/articles/public-queries.test.ts`.
- [X] T014 [P] [US1] Add database policy tests proving anonymous users can read published articles but cannot read drafts in `supabase/tests/database/public-articles.test.sql`.

### Implementation for User Story 1

- [X] T015 [US1] Add anonymous published-article SELECT policies and deny draft access in `supabase/migrations/0002_public_article_read_policies.sql`.
- [X] T016 [US1] Implement published article list/detail queries with explicit published-status filtering in `apps/web/src/features/articles/queries.ts`.
- [X] T017 [US1] Build the public article list and article cards with title links and image fallbacks in `apps/web/src/app/page.tsx` and `apps/web/src/components/articles/article-card.tsx`.
- [X] T018 [US1] Build the public slug route and readable full article body/image display in `apps/web/src/app/articles/[slug]/page.tsx` and `apps/web/src/components/articles/article-content.tsx`.
- [X] T019 [US1] Seed published and draft article examples with a local cover-image fixture in `supabase/seed.sql` and `apps/web/tests/fixtures/launch-article-cover.svg`.

**Checkpoint**: User Story 1 is independently testable with seeded content and no signed-in account.

---

## Phase 4: User Story 2 — Contributor publishes content independently (Priority: P1)

**Goal**: An authorized contributor can create, edit, preview, and publish valid articles through the application without developer intervention.

**Independent Test**: Sign in as a seeded contributor, create and preview a draft, confirm missing title/body is rejected while the draft remains, publish a valid article, and verify anonymous readers can open it. Confirm a moderator-only account cannot create or publish content.

### Tests for User Story 2

- [X] T020 [P] [US2] Add unit tests for article title/body validation, allowed content types, and draft preservation in `apps/web/tests/unit/articles/article-validation.test.ts`.
- [X] T021 [P] [US2] Add browser tests for contributor draft creation, preview, edit, publish, republish, invalid input, and moderator denial in `apps/web/tests/e2e/contributor-publishing.spec.ts`.
- [X] T022 [P] [US2] Add pgTAP tests for contributor/admin write access and moderator/reader write denial in `supabase/tests/database/article-authoring.test.sql`.

### Implementation for User Story 2

- [X] T023 [US2] Add contributor/admin article insert and update policies, restrict contributor edits to their own `author_id`, and keep moderator-only accounts read/delete-only in `supabase/migrations/0003_article-authoring-policies.sql`.
- [X] T024 [US2] Implement shared article input validation in `apps/web/src/features/articles/schema.ts`, enforcing “Required and non-empty after trimming” for `title` and `body` and the four allowed `type` values.
- [X] T025 [US2] Implement server-verified create, update, preview-data, publish, and republish actions; reject unauthorized writers and preserve invalid drafts in `apps/web/src/features/articles/actions.ts`.
- [X] T026 [US2] Build the contributor article dashboard and create/edit forms in `apps/web/src/app/admin/articles/page.tsx`, `apps/web/src/app/admin/articles/new/page.tsx`, and `apps/web/src/app/admin/articles/[id]/edit/page.tsx`.
- [X] T027 [US2] Build private draft preview and revalidate public article paths after publish/edit in `apps/web/src/app/admin/articles/[id]/preview/page.tsx` and `apps/web/src/features/articles/actions.ts`.
- [X] T028 [US2] Run the article unit, database, and browser suites and resolve failures in `apps/web/tests/unit/articles/article-validation.test.ts`, `supabase/tests/database/article-authoring.test.sql`, and `apps/web/tests/e2e/contributor-publishing.spec.ts`.

**Checkpoint**: User Story 2 works using a seeded contributor and can be verified without completing reader signup or account provisioning.

---

## Phase 5: User Story 3 — Reader registers, signs in, and comments (Priority: P2)

**Goal**: Readers can register/sign in through Google or username/password, submit permitted comments, and report visible comments; blocked-word comments do not become public.

**Independent Test**: Register/sign in using both controlled credential and OAuth test paths, submit an allowed comment and see it publicly, reject a blocked-word comment with a clear message, report a visible comment once, and verify reporting leaves it visible.

### Tests for User Story 3

- [X] T029 [P] [US3] Add unit tests for normalized blocked-word matching, non-empty comment validation, and permitted comment text in `apps/web/tests/unit/comments/blocked-words.test.ts`.
- [X] T030 [P] [US3] Add browser tests for username/password signup/sign-in, Google OAuth callback handling, retryable failures, and non-enumerating credential errors in `apps/web/tests/e2e/reader-auth.spec.ts`.
- [X] T031 [P] [US3] Add browser tests for accepted/rejected comments, public visibility, report submission, and duplicate reports counting once without hiding the comment in `apps/web/tests/e2e/comments.spec.ts`.
- [X] T032 [P] [US3] Add pgTAP tests for comment/report access and unique reporter/comment pairs in `supabase/tests/database/comments-reports.test.sql`.

### Implementation for User Story 3

- [X] T033 [US3] Create comment, report, and blocked-word tables in `supabase/migrations/0004_comments-and-reports.sql` and preserve these constraints verbatim: comment `id` is a “Stable unique identifier,” `article_id` a “Required reference to a published article,” `author_id` a “Required reference to an active signed-in account,” `body` is “Required, non-empty after trimming, and rejected/withheld if it contains a blocked term,” `status` is “Visible or deleted; a report alone does not change visibility,” and timestamps are “Required timestamps”; report `id` is a “Stable unique identifier,” `comment_id` a “Required reference to a non-deleted comment,” `reporter_id` a “Required reference to an active signed-in account,” `reason` is “Optional short category/text if collected by the interface,” `created_at` is a “Required timestamp,” and (`comment_id`, `reporter_id`) is unique; blocked-word `id` is a “Stable unique identifier,” `term` is a “Required normalized matching term; unique under the matching normalization rules,” and `enabled` “Allows a term to be disabled without deleting history/configuration.”
- [X] T034 [US3] Implement username/email/password signup and username/password sign-in with server-side identity lookup and generic failure responses in `apps/web/src/features/auth/actions.ts`.
- [X] T035 [US3] Build signup/sign-in forms and the Supabase Google OAuth start/callback flow in `apps/web/src/app/sign-up/page.tsx`, `apps/web/src/app/sign-in/page.tsx`, and `apps/web/src/app/auth/callback/route.ts`.
- [X] T036 [US3] Implement deterministic server-side blocked-word normalization and matching for the static list in `apps/web/src/features/comments/blocked-words.ts`.
- [X] T037 [US3] Implement authenticated comment/report actions, enforcing the global comments-enabled setting, one report per user/comment, and non-public rejection of blocked text in `apps/web/src/features/comments/actions.ts`.
- [X] T038 [US3] Add RLS policies for signed-in comment creation, visible-comment reading, and report insertion without automatic comment hiding in `supabase/migrations/0004_comments-and-reports.sql`.
- [X] T039 [US3] Build the article comment list/form and report controls with plain-language errors and preserved text after failed submission in `apps/web/src/components/comments/comment-section.tsx` and `apps/web/src/components/comments/comment-form.tsx`.

**Checkpoint**: User Story 3 is independently testable with a published seeded article and test accounts; reports are visible as flags but do not hide comments.

---

## Phase 6: User Story 4 — Moderator and admin review reported comments (Priority: P2)

**Goal**: Moderators can act on comments at the report threshold, admins can bypass it, and admins can disable comments globally.

**Independent Test**: Generate reports below and at the threshold; confirm below-threshold reports are flagged but not actionable to moderators and comments remain visible; delete a comment at threshold and a reported article as moderator; delete a separately flagged one-report comment as admin; disable comments and confirm new submissions are refused with entered text preserved.

### Tests for User Story 4

- [X] T040 [P] [US4] Add unit tests for positive threshold validation, unique report counts, moderator eligibility, admin bypass, and repeat concurrent moderation in `apps/web/tests/unit/moderation/threshold.test.ts`.
- [X] T041 [P] [US4] Add browser tests for review queue states, moderator comment/article removal and threshold, admin bypass, global comment toggle, and a submission racing with the toggle in `apps/web/tests/e2e/moderation.spec.ts`.
- [X] T042 [P] [US4] Add pgTAP tests proving moderator threshold enforcement and admin bypass/toggle privileges in `supabase/tests/database/moderation.test.sql`.

### Implementation for User Story 4

- [X] T043 [US4] Add atomic moderation database actions that lock the comment, enforce the configured unique-report threshold for moderators, allow admin bypass, and make concurrent deletion idempotent in `supabase/migrations/0005_moderation-actions.sql`.
- [X] T044 [US4] Implement the review-queue query with total unique reports and separate “flagged” versus “actionable” state in `apps/web/src/features/moderation/queries.ts`.
- [X] T045 [US4] Implement moderator/admin comment and content removal actions with clear already-handled responses in `apps/web/src/features/moderation/actions.ts`.
- [X] T046 [US4] Build the flagged-comment queue and role-appropriate review actions in `apps/web/src/app/admin/moderation/page.tsx` and `apps/web/src/components/moderation/review-queue.tsx`.
- [X] T047 [US4] Build admin controls for the positive report threshold and global comments toggle in `apps/web/src/app/admin/settings/comments/page.tsx` and `apps/web/src/features/moderation/settings-actions.ts`.

**Checkpoint**: User Story 4 passes threshold, admin bypass, concurrency, visibility, and comments-disabled scenarios independently of the internal account-provisioning UI.

---

## Phase 7: User Story 5 — Admin provisions and manages accounts and roles (Priority: P3)

**Goal**: Admins provision internal accounts, grant/revoke multiple roles, and let account holders change their default password; permissions remain separated by role.

**Independent Test**: As admin, create a contributor account with a default password, sign in as the holder and change the password, grant contributor plus moderator roles and verify both capabilities, then verify moderator-only creation and contributor-only moderation are denied. Confirm public signup offers no contributor role.

### Tests for User Story 5

- [X] T048 [P] [US5] Add unit tests for additive multi-role grants, restricted role combinations, username uniqueness, and password-change validation in `apps/web/tests/unit/admin/account-management.test.ts`.
- [X] T049 [P] [US5] Add browser tests for internal account provisioning, default-password sign-in/change, role assignment/revocation, and role-specific denials in `apps/web/tests/e2e/admin-accounts.spec.ts`.
- [X] T050 [P] [US5] Add pgTAP tests proving only admins can create internal accounts or grant/revoke roles in `supabase/tests/database/account-roles.test.sql`.

### Implementation for User Story 5

- [X] T051 [US5] Add database policies and constraints ensuring only admins can grant/revoke role assignments and username remains normalized and unique in `supabase/migrations/0006_admin-account-policies.sql`.
- [X] T052 [US5] Implement server-only internal account provisioning through Supabase Auth, default-password assignment, unique username checks, and multi-role grants without logging credentials in `apps/web/src/features/admin/account-actions.ts`.
- [X] T053 [US5] Build the admin account list and create-account form with contributor/moderator role selection and no public contributor signup in `apps/web/src/app/admin/users/page.tsx` and `apps/web/src/app/admin/users/new/page.tsx`.
- [X] T054 [US5] Implement admin role grant/revoke controls with explicit permission checks and confirmation feedback in `apps/web/src/components/admin/role-assignment-form.tsx` and `apps/web/src/features/admin/account-actions.ts`.
- [X] T055 [US5] Implement signed-in password change for provisioned account holders in `apps/web/src/app/account/password/page.tsx` and `apps/web/src/features/auth/password-actions.ts`.
- [X] T056 [US5] Run account-management unit, database, and browser suites and resolve failures in `apps/web/tests/unit/admin/account-management.test.ts`, `supabase/tests/database/account-roles.test.sql`, and `apps/web/tests/e2e/admin-accounts.spec.ts`.

**Checkpoint**: User Story 5 independently provisions a new internal user and proves that multiple grants combine without granting unauthorized actions.

---

## Phase 8: User Story 6 — Branded, readable experience on any device (Priority: P3)

**Goal**: Apply the supplied Game Ako Chronicles identity and flat matte palette consistently, with legible, navigable public and protected pages on desktop and mobile.

**Independent Test**: Open public, article, sign-in, authoring, and moderation pages at desktop and mobile viewports; verify logos/colors are consistent, navigation works by keyboard, text is legible, and no horizontal overflow or blocked content occurs.

### Tests for User Story 6

- [X] T057 [P] [US6] Add Playwright viewport tests for public/article navigation and no horizontal overflow at mobile and desktop widths in `apps/web/tests/e2e/responsive-branding.spec.ts`.
- [X] T058 [P] [US6] Add automated axe accessibility checks for representative public, sign-in, authoring, and moderation screens in `apps/web/tests/e2e/accessibility.spec.ts`.

### Implementation for User Story 6

- [X] T059 [US6] Copy `docs/neon-GA trans-01.png`, `docs/neon_ga_logo_2.png`, and `docs/neon-GA-01.png` to `apps/web/public/brand/neon-GA-trans-01.png`, `apps/web/public/brand/neon_ga_logo_2.png`, and `apps/web/public/brand/neon-GA-01.png` respectively.
- [X] T060 [US6] Define reusable blue/red/yellow/white base and pink/gold accent tokens with flat matte surfaces and readable contrast in `apps/web/src/app/globals.css`.
- [X] T061 [US6] Build consistent responsive header, footer, logo treatment, and public/editorial navigation in `apps/web/src/components/site-header.tsx`, `apps/web/src/components/site-footer.tsx`, and `apps/web/src/app/layout.tsx`.
- [X] T062 [US6] Apply responsive article typography, image sizing, form layouts, focus indicators, and keyboard-accessible navigation to `apps/web/src/components/articles/article-content.tsx`, `apps/web/src/components/comments/comment-section.tsx`, and `apps/web/src/app/globals.css`.
- [X] T063 [US6] Run responsive and accessibility browser checks and resolve findings in `apps/web/tests/e2e/responsive-branding.spec.ts` and `apps/web/tests/e2e/accessibility.spec.ts`.

**Checkpoint**: User Story 6 is verified across the main page types without requiring analytics or broad user-research instrumentation.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Validate release readiness across stories, constitution gates, and the hosting constraints.

- [X] T064 [P] Add CI jobs for lint, type checking, unit, database, browser, and accessibility tests in `.github/workflows/ci.yml` and `apps/web/package.json`.
- [X] T065 Record a repeatable public-page Core Web Vitals procedure and measured pre-launch baseline against plan targets in `docs/operations/performance-baseline.md`.
- [X] T066 Complete a dependency/security review, document findings and remediation, and verify no provider/service secrets are client-exposed in `docs/operations/security-review.md` and `apps/web/package.json`.
- [X] T067 Document Vercel Hobby eligibility verification, Supabase quota monitoring, backup/recovery, and upgrade decision steps in `docs/operations/launch-checklist.md`.
- [X] T068 Execute every applicable setup, test, and end-to-end scenario in `specs/001-blog-site-launch/quickstart.md` and update that file with verified commands/results.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately; application and local Supabase configuration are independent at T001/T002.
- **Foundational (Phase 2)**: Begins after Setup and blocks all story implementation. Core account, role, article, and settings schema is intentionally shared to let stories use seeded fixtures and be built as separate increments.
- **User Stories (Phases 3–8)**: Begin after Foundation. US1, US2, US3, US5, and US6 can proceed in parallel after Foundation when separate contributors are available. US4 requires US3's comment/report model and flows. US5 can use the foundational bootstrap admin to build/prove account management independently of US4.
- **Polish (Final Phase)**: Begins after the selected user stories are integrated; deployment/eligibility and performance checks must be completed before public launch.

### User Story Dependencies

- **US1 (P1)**: Depends only on Setup and Foundation; public reading works from seeded published content.
- **US2 (P1)**: Depends only on Setup and Foundation; article schema and contributor role are shared prerequisites, not a dependency on the US1 UI.
- **US3 (P2)**: Depends on Setup, Foundation, and US1's public article route plus a published seeded article; it does not depend on contributor authoring or internal account management.
- **US4 (P2)**: Depends on US3's comments and reports; it can use the foundational admin/moderator fixtures and does not require US5's provisioning screen.
- **US5 (P3)**: Depends only on Setup and Foundation; bootstrap admin and seeded test identities enable its independent test.
- **US6 (P3)**: Branding assets, design tokens, and responsive test authoring can begin after Setup and Foundation; integrated validation of each delivered route follows its user-story UI.

### Parallel Opportunities

- Setup: T001 and T002 use separate application/Supabase files and can run in parallel.
- Foundation: T007 and T008 are independent test files; they can be authored in parallel before T009/T010 implementation.
- After Foundation, US1, US2, US3, US5, and US6 are separable story tracks; US4 follows US3.
- Within each story, the separately pathed tests marked `[P]` can be authored in parallel before implementation begins.
- Final documentation tasks T065–T067 touch separate documents and can run in parallel; T064 and T068 are separately scoped CI/validation work.

### Parallel Execution Examples

```text
US1: T012 public browser test || T013 public query unit test || T014 anonymous RLS test
US2: T020 validation unit test || T021 publishing browser test || T022 authoring RLS test
US3: T029 blocked-word unit test || T030 auth browser test || T031 comments browser test || T032 comments/RLS test
US4: T040 threshold unit test || T041 moderation browser test || T042 moderator/admin RLS test
US5: T048 account unit test || T049 account-management browser test || T050 role-management RLS test
US6: T057 responsive browser test || T058 accessibility browser test
```

## Independent Test Criteria by Story

- **US1**: Anonymous reader lists and reads one published seeded article with its cover image on desktop/mobile; draft is absent and inaccessible.
- **US2**: Seeded contributor creates, previews, edits, and publishes a valid article; invalid title/body preserves the draft; moderator-only account is denied authoring.
- **US3**: Reader signs in through credential/OAuth test path, sees allowed comment, receives a clear blocked-word rejection, and can report a visible comment without hiding it; duplicate report counts once.
- **US4**: Below-threshold comment stays visible and is not moderator-actionable; threshold permits moderator comment removal and authorized article removal; admin bypass works at one report; toggle blocks new comments and preserves typed text.
- **US5**: Admin provisions a default-password account; holder changes it; contributor+moderator grants combine; single-role accounts are denied the opposite capability; no public contributor signup exists.
- **US6**: Public/protected routes retain brand identity and remain navigable/readable at mobile and desktop sizes with no horizontal overflow and passing automated accessibility checks.

## Implementation Strategy

### Suggested MVP

The smallest reader-facing MVP is **US1: public article reading**, backed by the foundational schema and a seeded launch article. For an operational publication MVP, complete **US1 + US2** so an invited contributor can publish without developer assistance. The complete soft launch additionally requires US3 and US4 for the specified comment/moderation loop, then US5 and US6 for admin self-service and finished branding.

### Incremental Delivery

1. Complete Setup and Foundation; verify local Supabase, auth boundaries, and RLS.
2. Deliver US1 with seeded content and validate anonymous reading.
3. Deliver US2 and validate contributor self-service publishing.
4. Deliver US3, then US4, validating the complete comment/report/moderation lifecycle.
5. Deliver US5 and US6; complete cross-cutting security, accessibility, performance, hosting eligibility, and quickstart validation.

### Notes

- The `[P]` marker is limited to work in different files with no incomplete dependency.
- All user-story tasks have a story label and are grouped under the matching priority phase.
- Unit, database/RLS, and browser tests are included to satisfy the project constitution and should be written before the feature implementation they verify.
- No task provisions production credentials or assumes Vercel Hobby eligibility; verify the hosting terms before launch.
