# Implementation Plan: Game Ako Chronicles Blog Site

**Branch**: `main` | **Feature context**: `001-blog-site-launch` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-blog-site-launch/spec.md`

## Summary

Deliver a branded, English-language gaming publication with public article reading, app-built contributor publishing, account-based comments, and threshold-based moderation. Use a single Next.js application on Vercel with Supabase Auth, Postgres, and Storage. Keep authorization server-verified and enforced at the data boundary; cache only public published content. The implementation is greenfield: the repository currently contains planning artifacts and brand images but no application source code.

## Technical Context

**Language/Version**: TypeScript on the current supported Node.js LTS release at implementation start

**Primary Dependencies**: Next.js App Router, React, Supabase JavaScript client, `@supabase/ssr`; Google OAuth through Supabase Auth; Vitest, React Testing Library, Playwright, and Supabase CLI/pgTAP for verification

**Storage**: Supabase Postgres for accounts/roles, articles, comments, reports, and site settings; Supabase Storage for launch article imagery

**Testing**: Unit tests for domain rules and components; database/RLS tests with pgTAP; application integration and browser end-to-end tests with Playwright; accessibility checks in representative browser flows

**Target Platform**: Responsive public website and protected editorial/moderation area, deployed to Vercel; Supabase-hosted backend

**Project Type**: Single full-stack web application

**Performance Goals**: Establish and record a repeatable pre-launch baseline; target Core Web Vitals “good” thresholds for representative public article pages (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile) and re-test performance-sensitive changes, consistent with the constitution

**Constraints**: Initial cost-conscious soft launch; Supabase Free currently has limited database, egress, and file-storage quotas and can pause inactive projects; Vercel Hobby terms restrict commercial use, so eligibility must be verified before launch and a suitable plan selected if the publication is commercial. Use serverless-compatible database access, avoid caching personalized/moderation data, protect provider secrets, and keep English-only launch scope.

**Scale/Scope**: One publication, a small invited contributor/moderator team, public readership with no launch traffic commitment, and an intended cadence of 2–3 articles per week. No social profiles, feeds, monetization, localization, or advanced editorial workflow.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / gate | Plan response | Status |
|---|---|---|
| I. Code quality and review | Use the proposed feature-oriented application structure, established conventions, and code review before merge. | PASS |
| II. Unit and integration testing | Cover domain rules, UI behavior, database/RLS permissions, and primary end-to-end flows with automated tests. | PASS |
| III. Consistent, accessible UX | Preserve the supplied brand assets and flat palette; verify responsive behavior, keyboard use, and accessibility on representative flows. | PASS |
| IV. Security | Verify sessions server-side; enforce roles at server and database boundaries; keep privileged secrets server-only; test denied access and dependency/security updates. | PASS |
| V. Performance | Establish a repeatable public-page baseline, target the stated Core Web Vitals thresholds, monitor hosting/storage quotas, and re-test sensitive changes. | PASS |

**Pre-research gate**: PASS. No constitutional conflict or requested exception. The Hobby-plan eligibility and free-tier operational limits are launch checks, not design waivers.

## Project Structure

### Documentation (this feature)

```text
specs/001-blog-site-launch/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── web-interaction-contract.md
└── tasks.md                 # Created by /speckit.tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/                 # Public pages, sign-in, contributor and moderation areas
│   ├── components/          # Shared accessible presentation components
│   ├── features/
│   │   ├── articles/        # Article authoring, publishing, and reading rules
│   │   ├── auth/            # Session and account flows
│   │   ├── comments/        # Comment and report workflows
│   │   └── moderation/      # Review queue and moderation actions
│   └── lib/                 # Supabase clients, validation, authorization helpers
├── public/                  # Web-ready brand and article assets
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
supabase/
├── migrations/              # Schema, constraints, indexes, and RLS policies
├── seed.sql                 # Local-only test content and roles
└── tests/                   # pgTAP policy and database behavior tests
```

**Structure Decision**: Use one Next.js application because the launch is a single publication with public and protected experiences and no separately deployable API requirement. Keep schema and RLS migrations in Supabase’s standard project directory; keep domain tests close to the application and database policy tests with migrations.

## Phase 0 Research Summary

Research decisions and source links are recorded in [research.md](research.md). Key outcomes: use Supabase Auth with verified server-side sessions; model roles as a multi-valued assignment; enforce permissions in application actions and Postgres RLS; use Supabase’s HTTP client for routine request data and the transaction-mode pooler if a Postgres driver is required; and keep public-content caching separate from private state. Vercel Hobby’s non-commercial restriction is called out as an explicit pre-launch eligibility check.

## Phase 1 Design Summary

- [data-model.md](data-model.md) defines the account/role, article, comment/report, blocked-word, and site-setting entities and their integrity rules.
- [contracts/web-interaction-contract.md](contracts/web-interaction-contract.md) defines the externally observable public, account, publishing, and moderation behavior, including the Google sign-in boundary.
- [quickstart.md](quickstart.md) provides local setup and end-to-end validation scenarios.

**Post-design Constitution Check**: PASS. The proposed boundaries support testable permissions and workflows, accessible public/admin experiences, security review, and repeatable performance checks. No violations require a waiver.

## Complexity Tracking

No constitutional violations or unnecessary architectural layers are proposed. A separate backend service and an off-the-shelf CMS were rejected because this is one application and the specification requires custom in-app publishing and role management.
