# Problem Definition: Game Ako Chronicles Blog Site

- **Slug**: blog-site-plan
- **Created**: 2026-09-27
- **Inputs used**: intake.md, research.md

## Problem Statement

Filipino gamers (and gaming enthusiasts more broadly, regardless of location) currently have no dedicated Game Ako Chronicles outlet for console/PC gaming news, reviews, commentary, and interviews — there is today no owned channel through which Arohbi and any invited contributors can publish gaming content, moderate community discussion around it, and begin building an audience under this brand. This matters now because the stakeholder wants to launch this outlet from a ground-up position (no existing audience, traffic, or content), and every week without a publishing platform is a week the brand has no presence and no accumulating content or community to show for it.

## Affected Users & Stakeholders

- **Users**:
  - **Readers/community members** (primarily Filipino gamers of all ages, English-speaking, regardless of location) — currently have no Game Ako Chronicles site to read gaming news/reviews/commentary or to comment on it. [source: intake.md]
  - **Internal contributors** (admin-provisioned accounts) — need a way to write and publish articles, reviews, commentary, and interviews without an off-the-shelf CMS; currently have no authoring tool at all for this brand. [source: intake.md]
  - **Moderators** (a role that can overlap with contributor or be separate) — need a way to review reported comments and remove inappropriate content or disable comments when necessary; currently have no moderation tooling. [source: intake.md]
- **Stakeholders**:
  - **Arohbi** (the project's raiser, also acting as initial admin) — decides scope, funds/builds the site, provisions contributor access, and holds full administrative bypass authority (including comment-moderation threshold bypass). [source: intake.md]

## Goals

- Give Game Ako Chronicles a live, publicly reachable site where contributors can publish console/PC gaming articles, reviews, commentary, and interviews. [source: intake.md]
- Enable a comment-based community interaction model (not full social/profile features) so readers can engage with content directly. [source: intake.md]
- Keep moderation practical and low-overhead from day one: automatic profanity filtering, a user-driven reporting system, a configurable report-count threshold before action, and an admin bypass for urgent cases — so the site doesn't require constant manual comment-by-comment review. [source: intake.md, research.md]
- Launch on infrastructure that costs nothing (or near-nothing) at the outset (Vercel Hobby + Supabase free tier), while remaining able to scale later if the site grows. [source: intake.md, research.md]
- Reflect the existing Game Ako Chronicles brand identity (neon comic-burst logo, blue/red/yellow/white/pink/gold palette, matte/flat finish) so the site is recognizably "on-brand" from launch. [source: intake.md]

## Non-Goals

- Public user profiles or broader social/community features beyond commenting (no follows, feeds, DMs, etc.) — explicitly excluded per intake. [source: intake.md]
- Localization beyond English — no Filipino/Tagalog (or other language) content versions at launch. [source: intake.md]
- Monetization (ads, sponsorships, affiliate links, etc.) — explicitly deferred until after launch. [source: intake.md]
- SEO, analytics instrumentation, and performance-target work — explicitly deferred until after launch. [source: intake.md]
- A competitive differentiation strategy versus existing Filipino/international gaming media — explicitly deferred by stakeholder decision. [source: intake.md, research.md]
- Using an off-the-shelf CMS product (e.g., WordPress) or a headless CMS service — explicitly ruled out in favor of custom in-app CRUD + RBAC. [source: intake.md]
- Open/public contribution (anyone signing up as a contributor) — contributor access is admin-provisioned only, not self-serve. [source: intake.md]

## Success Metrics

- **Site is live and publicly reachable**, with at least one published article, for an initial soft launch shared with a small circle (baseline: 0 — no site exists today). [source: intake.md — qualitative/binary launch signal]
- **Contributors can independently publish content** without developer intervention, using the in-app CRUD tooling (baseline: 0 contributors have any publishing tool today). [source: intake.md — qualitative]
- **Comment moderation functions as designed**: reports flag comments, the configurable threshold triggers visibility for review, and admin bypass works, verified functionally before/at launch (baseline: no moderation system exists today). [source: intake.md, research.md — qualitative/functional signal]
- **Publishing cadence sustained**: approximately 2–3 articles per week, matching the stakeholder's stated intent (baseline: 0 articles/week today, pre-launch). [source: research.md]
- **Infrastructure stays within free-tier limits at initial launch**: Supabase (500 MB DB, 5 GB/month egress, 1 GB file storage, 50k MAUs) and Vercel Hobby, with no forced upgrade required in the first period post-launch (baseline: not yet measured — no live traffic exists to compare against). [source: research.md]
- **Audience/engagement growth remains aspirational at this stage**: visits, registered users, and comment volume are intentionally not treated as launch-gating targets for the soft launch, and can be defined later once real post-launch usage data exists. [source: stakeholder clarification, research.md]

## Cost of Inaction

If this is never built, Game Ako Chronicles has no publishing platform at all: no way to share gaming news/reviews/commentary under its own brand, no place for the community it wants to build to gather, and no accumulating body of content or audience. Since research confirmed there is currently no demand signal and no existing audience (a ground-up effort), the near-term cost of inaction is low in terms of "disappointing existing users" — but every period without a live site is a period without any brand presence, content archive, or opportunity to test whether the underlying community/audience hypothesis is true. The idea cannot be validated at all until a minimally functional version exists to publish through.

## Open Questions

- None for this problem definition at the current stage. Differentiation strategy remains explicitly deferred until after the initial site is live, since the present goal is simply to get the website launched and usable.
