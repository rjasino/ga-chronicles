# Dependency and application security review

**Reviewed:** 2026-09-27; re-reviewed 2026-10-03

## Dependency review

- `npm audit --audit-level=moderate` completed with **0 vulnerabilities** on 2026-09-27 after moving Next.js to 16.3.6 and Vitest to 5.0.2.
- Re-reviewed 2026-10-03 after adding the Tiptap editor and `sanitize-html`: `npm audit` reports **5 high-severity findings**, all the `braces` stack-exhaustion advisory (GHSA-vfj7-8cjw-p6xm) through the `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` development toolchain. The only automated fix (`npm audit fix --force`) downgrades `eslint-config-next` to 14.2.35, a breaking change, so it was **not applied**. The advisory is dev-only (no runtime code path) and is tracked until a compatible patched chain is released by the Next.js toolchain; the audit should be re-run on each dependency update.
- Re-run the audit in CI and before production releases; keep lockfile changes reviewed.

## Application boundary review

- Supabase service-role access is isolated to server actions, the OAuth callback route, and the one-time bootstrap script. The browser Supabase client reads only `NEXT_PUBLIC_*` values.
- Authorization derives from a server-verified Supabase user and database role assignments, not browser metadata.
- RLS policies limit published content, drafts, account data, reports, and write operations. Moderation uses locked security-definer database actions and unique reporter/comment constraints.
- Inline article body images and their references are protected at the storage and database boundaries: the public `article-images` bucket is read-only for anonymous users, uploads/removals are limited to contributors/admins with object paths keyed to the actor's user folder, and `article_body_images` references are only manageable by the article author or admin.
- Public comment reads expose only the author's optional display name; username and authentication-email lookup data stay behind their respective access boundaries.
- **Rich article bodies are always sanitized**: authored HTML passes an allowlist (`sanitize-html`) on save and is sanitized again on render for readers (defense-in-depth). Scripts, event handlers, styles, unsafe URL schemes, and non-list tags are stripped; only `http`/`https` image sources render. The rich editor client bundle is only loaded on authoring pages, not on anonymous article routes.
- Legacy plain-text bodies are converted to paragraphs and never evaluated as HTML.
- Production Google OAuth credentials and service-role keys must be supplied through the hosting provider's server-only secret store and are not checked into this repository.

## Findings and follow-up

- 2026-09-27: No known dependency advisories or committed provider/service secrets were found.
- 2026-10-03: Added the `braces` dev-toolchain advisory above as a tracked, accepted dev-only finding; no runtime impact and no forced downgrade applied.
- Before launch, perform an authenticated-role RLS review against a deployed preview, confirm the OAuth callback allow-list and production secret configuration, and confirm the rich-body sanitizer allowlist on a preview deployment with untrusted authoring content.