# Research: Game Ako Chronicles Blog Site

**Date**: 2026-09-27  
**Scope**: Resolve planning decisions for the lean launch described in [spec.md](spec.md).

## Decision: Use the confirmed Next.js, Supabase, and Vercel stack

- **Decision**: Build one Next.js App Router application, use Supabase Auth, Postgres, and Storage, and deploy the web application to Vercel. Keep publishing, user/role management, and moderation inside the application rather than adopting a separate CMS.
- **Rationale**: This matches the confirmed assessment and supports public article reading alongside a small authenticated editorial area. It avoids operating multiple application services for a single publication.
- **Alternatives considered**: A headless/off-the-shelf CMS was rejected in the assessment in favor of custom in-app CRUD and RBAC. A separately deployed API is unnecessary for the specified launch.
- **Sources**: `.specify/assessments/blog-site-plan/intake.md`; `.specify/assessments/blog-site-plan/decision.md`; [Next.js App Router](https://nextjs.org/docs/app).

## Decision: Use Supabase Auth with verified server-side sessions

- **Decision**: Support Google OAuth and password-based reader accounts through Supabase Auth with cookie-based server-side session integration. Signup collects a unique username, email address, and password; sign-in accepts the username and password as required by the feature while resolving the username to its account identity on the server. Google accounts use their provider identity and a unique username is assigned during onboarding if needed.
- **Rationale**: The feature calls for username/password credentials, while Supabase’s built-in password authentication is email/password-based. Collecting an email as the underlying account identifier preserves the requested username-facing experience and supports account identity without treating the username as an authentication secret. Username lookup and failed sign-in responses must not reveal whether an account exists. Session identity must be verified server-side before privileged actions.
- **Alternatives considered**: Exposing email as the only login identifier would diverge from the feature spec. Building a custom password/session system would add unnecessary security responsibilities. Google OAuth remains an independent sign-in option.
- **Sources**: [Supabase server-side auth](https://supabase.com/docs/guides/auth/server-side); [Google social login](https://supabase.com/docs/guides/auth/social-login/auth-google); [password authentication](https://supabase.com/docs/guides/auth/passwords).

## Decision: Store role grants separately and allow multiple roles

- **Decision**: Represent roles as a trusted account-to-role relation that supports multiple grants per account. Enforce action authorization on the server and with Postgres row-level security (RLS). Role grants are manageable only by admins; user-editable profile metadata is not an authorization source.
- **Rationale**: A separate relation directly supports contributor-plus-moderator accounts and gives the database a testable permission boundary. Application checks provide clear user feedback while RLS protects data if an application path is missed.
- **Alternatives considered**: One role column cannot satisfy multi-role assignment. Client-only checks or self-editable role metadata do not protect privileged data/actions.
- **Sources**: [Supabase custom claims and RBAC](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac); [Postgres row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Decision: Preserve the specified publishing and moderation rules as server-enforced workflows

- **Decision**: Contributors/admins use the application to create, edit, preview, and publish valid articles. Check comments against a server-managed static blocked-word list before saving them as public. Reports flag comments but never hide them automatically. Moderators can act only at or above the configured report threshold; admins may bypass the threshold. Enforce the site-wide comments toggle when accepting submissions, not only in the interface.
- **Rationale**: These rules map directly to the acceptance scenarios and must remain effective for requests that bypass the browser. Unique reporting per user/comment makes the threshold meaningful and repeatable.
- **Alternatives considered**: Automatic hiding on report, client-only profanity filtering, or moderation through a database console would contradict the specification or fail to provide reliable enforcement.
- **Sources**: `spec.md` FR-004–FR-017 and acceptance scenarios; [Postgres row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Decision: Use serverless-compatible Supabase data access and separate public/private cache behavior

- **Decision**: Prefer Supabase’s HTTP-based client for routine server-side application reads and writes. If a Postgres driver is needed for serverless requests, use Supavisor’s transaction-mode pooler with a minimal client pool; use direct database connections for migration/admin tooling. Cache only public published article content, with revalidation after publish/edit. Do not share-cache account-specific, draft, report, or moderation data.
- **Rationale**: Short-lived serverless instances can multiply direct database connections. Public publication content is cacheable, while personalized or moderation data must remain current and isolated. The transaction pooler is designed for serverless workloads; session-dependent database behavior and prepared statements must be checked against the selected client.
- **Alternatives considered**: Direct database connections as the default runtime path risk connection exhaustion at scale. Disabling all public caching increases repeated reads; caching private data risks stale or cross-user disclosure.
- **Sources**: [Supabase connection pooling](https://supabase.com/docs/guides/database/connecting-to-postgres); [pooling and connection limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits); [Next.js caching and revalidation](https://nextjs.org/docs/app/guides/caching-without-cache-components).

## Decision: Test domain logic, database authorization, browser workflows, and accessibility at their respective boundaries

- **Decision**: Use Vitest and React Testing Library for synchronous domain/UI unit tests; Supabase CLI with pgTAP for database constraints and RLS; and Playwright for integrated browser workflows. Include automated accessibility scans for representative public and protected screens and manual keyboard/accessibility review.
- **Rationale**: Permission rules need verification at both application and database boundaries; complete publishing and moderation flows require a browser and local backend. Automated accessibility checks help but do not replace keyboard and usability review. Async Server Component behavior should be exercised with browser-level tests where the unit-test runner does not support it.
- **Alternatives considered**: Unit tests alone cannot verify auth redirects, RLS, cache behavior, or complete workflows. Manual-only verification does not satisfy the constitution’s automation requirement. Cypress is a viable browser-testing alternative but is not needed in addition to Playwright.
- **Sources**: [Next.js Vitest guidance](https://nextjs.org/docs/app/guides/testing/vitest); [Next.js Playwright guidance](https://nextjs.org/docs/app/guides/testing/playwright); [Supabase database testing](https://supabase.com/docs/guides/database/testing); [axe-core](https://github.com/dequelabs/axe-core).

## Decision: Treat free-tier and commercial eligibility as launch constraints

- **Decision**: Plan for a low-traffic pilot on Vercel Hobby and Supabase Free only after confirming that the site's use complies with the current Vercel Hobby terms. If the publication is commercial or otherwise outside those terms, select an eligible hosting plan before public launch. Monitor Supabase database size, egress, and storage; document backup/recovery before relying on the site for important content. Keep the application portable enough to change hosting tiers without changing its domain model.
- **Rationale**: Vercel Hobby is restricted to personal, non-commercial use. Supabase Free has finite storage/egress allowances, can pause inactive projects, and does not include automatic backups. A branded publication may require a different Vercel plan regardless of whether monetization is initially enabled; the eligibility decision cannot be inferred only from the feature’s current no-monetization scope.
- **Alternatives considered**: Assuming free plans are a production guarantee would leave a terms and continuity risk. Moving to paid tiers immediately is not necessary if the soft launch is eligible and remains within the documented limits.
- **Sources**: [Vercel Hobby plan](https://vercel.com/docs/plans/hobby); [Vercel limits](https://vercel.com/docs/limits); [Supabase pricing and plan limits](https://supabase.com/pricing); `.specify/assessments/blog-site-plan/research.md`.

## Decision: Set a measurable performance baseline despite deferred growth optimization

- **Decision**: Treat launch-scale performance targets as Core Web Vitals “good” thresholds on representative public pages: LCP ≤ 2.5 seconds, INP ≤ 200 milliseconds, and CLS ≤ 0.1 at the 75th percentile. Record a reproducible pre-launch baseline and re-test performance-sensitive changes; this is not a commitment to build a separate analytics program.
- **Rationale**: The constitution requires benchmarks and re-testing. These user-visible thresholds create a verifiable baseline while preserving the assessment’s decision to defer broader analytics and growth targets.
- **Alternatives considered**: Deferring all performance measurement would conflict with the project constitution. Infrastructure-level throughput targets would not describe the reader experience.
- **Sources**: [Web Vitals](https://web.dev/articles/vitals); `.specify/memory/constitution.md` Principle V.

## Resolved planning unknowns

- **Application type and deployment**: Single web application using the confirmed Next.js/Supabase/Vercel stack.
- **Data storage**: Supabase Postgres and Storage; no additional persistence service is needed for launch.
- **Test strategy**: Unit, database/RLS, integration, and end-to-end coverage using the selected tools above.
- **Scale**: Small invited team, one publication, and no audience-volume launch gate; quota monitoring remains required.
- **Remaining launch check**: Confirm Vercel Hobby eligibility and backup/recovery expectations before selecting the production plan. This is an operational go-live check, not an unresolved architecture choice.
