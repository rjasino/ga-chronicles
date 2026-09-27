# Dependency and application security review

**Reviewed:** 2026-09-27

## Dependency review

- `npm audit --audit-level=moderate` completed with **0 vulnerabilities** after moving Next.js to 16.3.6 and Vitest to 5.0.2.
- Re-run the audit in CI and before production releases; keep lockfile changes reviewed.

## Application boundary review

- Supabase service-role access is isolated to server actions, the OAuth callback route, and the one-time bootstrap script. The browser Supabase client reads only `NEXT_PUBLIC_*` values.
- Authorization derives from a server-verified Supabase user and database role assignments, not browser metadata.
- RLS policies limit published content, drafts, account data, reports, and write operations. Moderation uses locked security-definer database actions and unique reporter/comment constraints.
- Public comment reads expose only the author's optional display name; username and authentication-email lookup data stay behind their respective access boundaries.
- Public article body is rendered as React text, not injected HTML. Cover images use local/static paths; no user-authored HTML is evaluated.
- Production Google OAuth credentials and service-role keys must be supplied through the hosting provider's server-only secret store and are not checked into this repository.

## Findings and follow-up

- No known dependency advisories or committed provider/service secrets were found during this review.
- Before launch, perform an authenticated-role RLS review against a deployed preview and confirm the OAuth callback allow-list and production secret configuration.
