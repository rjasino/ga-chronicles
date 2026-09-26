# Idea Research: Game Ako Chronicles Blog Site

- **Slug**: blog-site-plan
- **Created**: 2026-09-27
- **Evidence confidence (overall)**: medium — technical/infrastructure claims are now well-substantiated (confirmed by stakeholder research + official Vercel docs), but the idea carries a confirmed **zero demand signal**, which caps overall confidence regardless of how solid the technical plan is.

## Users & Demand

- No first-party demand signal exists yet (no tickets, interviews, or usage data) — the idea originates from a single stakeholder's plan document rather than observed user behavior. The stakeholder has explicitly confirmed **there is no demand signal at all** — this is a ground-up idea proceeding on conviction, not validated user pull. — [source: user input, this session, superseding earlier ASSUMPTION] (confidence: high)
- The intake note confirms the target audience is "gamers of all ages, primarily Filipino, regardless of location," with English as the content language — [source: .specify/assessments/blog-site-plan/intake.md] (confidence: high)

## Prior Art

- No existing specs, decisions, or code related to a blog/CMS were found elsewhere in `.specify/` at the time of this research — the assessment directory for this idea (`blog-site-plan`) is the only relevant artifact. — [source: local repo scan] (confidence: medium)
- The repository is named "game-ako-chronicles," suggesting this blog site plan may be the primary (or one of the primary) purposes of the repo, rather than an addition to an existing product — ASSUMPTION (confidence: low)

## Market & Context

- Gaming news/blog sites are a mature, crowded category globally (e.g., IGN, Kotaku, Rock Paper Shotgun) and regionally in the Philippines (e.g., established Filipino gaming media outlets), meaning differentiation and audience acquisition will be a real challenge not addressed anywhere in the source plan. — ASSUMPTION (confidence: medium; general industry knowledge, no specific competitor was fetched or cited)
- The intake note records that monetization, SEO, and analytics strategy are explicitly deferred to post-launch — meaning there is currently no stated plan for how the site will be discovered or sustained financially. — [source: .specify/assessments/blog-site-plan/intake.md] (confidence: high)

## Data & Constraints

- **Serverless connection pooling — necessity for initial launch (this research pass)**: Per Supabase's official documentation, connection pooling is **not something to defer or build separately** — it is a **built-in, free-tier-included feature** (the shared pooler, "Supavisor," in transaction mode) specifically designed for serverless/edge functions, which is exactly this project's deployment model (Next.js on Vercel). — [source: https://supabase.com/docs/guides/database/connecting-to-postgres] (confidence: high)
  - Supabase's own connection-method guidance states plainly: "A serverless or edge function" should use the "Shared pooler, transaction mode" because "these environments open many short-lived connections" — this is a direct match for the confirmed Next.js + Vercel + Supabase stack.
  - The shared pooler (transaction mode, port `6543`) is available on the **Free plan** — no paid upgrade is required to use it.
  - Required setup is minimal, not a deferred/future task: use the pooler connection string instead of the direct connection string, and configure the app's Postgres client with `max: 1` connection pool size, prepared statements disabled (`prepare: false`), and `sslmode=require`. Supabase gives a ready-made code example for this (e.g., for `postgres.js`).
  - Skipping this at launch carries real risk, not just a performance nicety: without it, a serverless function's own client-side pool defaults (e.g., 10 connections per warm instance in `postgres.js`) can exhaust the database's connection limit after just "a few dozen" warm instances — a plausible outcome even at modest traffic, since serverless platforms scale instances unpredictably.
  - Conclusion: **this should be configured from day one**, not deferred — it is a same-day, low-effort setup (swap connection string + 3 client config lines) rather than a scaling-phase concern, and the failure mode it prevents (connection exhaustion / hanging queries) could otherwise surface unpredictably even during initial launch.
- **Tech stack (confirmed)**: Next.js (framework) + Supabase (backend and database). Content authoring is **not** an off-the-shelf CMS product — the Next.js app itself will include built-in **CRUD functionality** for content, plus a **simple RBAC (role-based access control) and user-management module**, all custom-built within the app. — [source: user input, this session] (confidence: high)
- **Brand assets (confirmed)**: Logo files exist at `docs/neon-GA-01.png`, `docs/neon-GA trans-01.png` (transparent variant), and `docs/neon_ga_logo_2.png` (flat/print variant). The logo is a comic-book-style "explosion/burst" graphic reading "GAME" (yellow "G" + blue lettering) and "AKO" (red lettering, white outline), with blue lightning-bolt/starburst accent lines, yellow stars, and a game-controller icon accented in pink and gold. This directly matches and extends the color palette already recorded in intake (blue, red, yellow, white) with pink and gold as additional accent colors not previously captured. — [source: docs/neon-GA-01.png, docs/neon_ga_logo_2.png] (confidence: high)
- **Commenting/moderation (confirmed)**: Commenting is open to any registered account (per earlier Google OAuth/credentials decision), with a **static-wordlist profanity filter** applied automatically. Reporting a comment only **flags** it for admin/moderator attention — it does **not** auto-hide the comment. Moderation action (e.g., deletion) is normally gated by a **configurable report-count threshold**; **admins have a bypass** and can act on a flagged comment regardless of report count. Admins can also **disable the comment section entirely** if necessary. — [source: user input, this session] (confidence: high)
- **RBAC (confirmed)**: Simple four-role model, with **multi-role assignment supported** (a single account can hold more than one role, e.g., contributor + moderator):
  - **Admin** — full access; holds all bypasses, including the report-threshold bypass.
  - **Moderator** — can moderate and delete comments or content; cannot create content.
  - **Contributor** — can create content and comment; cannot moderate the site.
  - **Regular user** — can comment and report comments.
  — [source: user input, this session] (confidence: high)
- **Deployment platform**: The user has confirmed intent to deploy on **Vercel's Hobby plan**, with a stated intent to scale up later if the site grows. — [source: user input, this session] (confidence: high)
- **Vercel Hobby plan database/storage support** (the specific question asked): Per Vercel's official documentation:
  - Vercel does not ship its own bundled "Hobby-tier database." Application data storage is provided through the **Vercel Marketplace**, which connects to third-party providers — notably **Neon** and **Supabase** for Postgres, **AWS Aurora Postgres** for Postgres, and **Upstash** for Redis (key-value). NoSQL and vector database providers are also listed as available through the Marketplace. — [source: https://vercel.com/docs/marketplace-storage] (confidence: high)
  - These Marketplace integrations are provisioned via `vercel install <provider>` (e.g., `vercel install neon`, `vercel install upstash`, `vercel install supabase`) or from the dashboard, and each provider sets its own pricing/plan (e.g., a `--plan free` flag is available at install time), separate from the Vercel Hobby/Pro plan itself. In other words, **Hobby-plan compatibility is determined by the third-party provider's own free tier**, not by Vercel directly bundling a database. — [source: https://vercel.com/docs/marketplace-storage] (confidence: high)
  - Vercel's own first-party storage products are **Vercel Blob** (object/file storage, available on Hobby and Pro) and **Global Config** (low-latency runtime config key-value store, available on Hobby, Pro, and Enterprise) — neither of these is a general-purpose application database suited to blog content/comments; they are for files and runtime config, respectively. — [source: https://vercel.com/docs/storage] (confidence: high)
  - Practical implication for this project: for storing blog posts, users, and comments, the team should provision a **Marketplace Postgres database (e.g., Neon or Supabase)** using each provider's free tier, rather than expecting Vercel itself to host the database. Vercel Blob could be used later for storing images/media (e.g., article thumbnails, screenshots) if needed. — inference based on above sources (confidence: medium)
  - **Confirmed**: The user has researched Supabase's free tier directly and confirms it is doable for initial launch. Specific limits reported:
    - **Active projects**: up to 2 active projects at a time.
    - **Database size**: 500 MB dedicated PostgreSQL storage.
    - **Tables & rows**: unlimited (no hard count) — constrained only by the overall 500 MB disk storage limit.
    - **Bandwidth (egress)**: 5 GB/month, combined across database and storage egress.
    - **File storage**: 1 GB included (for assets/images), 50 MB max per file.
    - **Auth & Edge Functions**: up to 50,000 Monthly Active Users (MAUs) and 500,000 Edge Function invocations/month.
    — [source: user input, this session — reported as researched directly against Supabase's published free-tier limits; not independently re-verified against Supabase's docs in this pass] (confidence: medium-high — user-researched and specific, but not independently cross-checked by this assessment)
  - **Expected content volume**: ~2–3 articles/week. At that cadence, text-content storage alone is very unlikely to approach the 500 MB database limit for a long time; the more relevant constraints to watch as the site grows are the **5 GB/month combined egress** (if image-heavy pages or high traffic) and the **1 GB file storage** cap (if many/large images are uploaded per article) — [inference based on above confirmed limits and stated posting cadence] (confidence: medium)
- Vercel supports transferring Blob and Global Config stores between Hobby and Pro accounts when upgrading, which is relevant to the user's stated "scale up later" intent — but Marketplace database resources (Neon/Supabase/etc.) are managed and billed directly by the third-party provider, so scaling that layer is a provider-side upgrade, not a Vercel-side one. — [source: https://vercel.com/docs/storage] (confidence: medium)

## Evidence Against the Idea

- The gaming blog/media space is saturated with established, well-resourced competitors (international and Filipino outlets); the intake note provides no differentiation strategy (unique angle, niche focus, or distribution advantage) beyond audience description, which is a meaningful risk to long-term traction. — ASSUMPTION (confidence: medium)
- No demand validation exists (no interviews, waitlist signals, or existing audience) — the stakeholder has **explicitly confirmed** this is a ground-up idea with **no demand signal at all**. This is the single largest risk to the idea: the entire premise rests on conviction that a community will form, with zero external validation that Filipino gamers are underserved or actively seeking this specific site. — [source: user input, this session] (confidence: high — the absence of demand signal is now a confirmed fact, not an assumption)
- Monetization is deferred, meaning there is currently no validated path to sustain the site financially if hosting/database costs grow past free tiers as traffic scales — a real risk for the "scale up later" plan. At a confirmed 500 MB Supabase database / 5 GB monthly egress / 1 GB file storage ceiling, and a 2–3 articles/week posting cadence, the free tier should comfortably cover early launch, but sustained traffic growth (especially image-heavy pages or higher visitor volume) could hit the egress or file-storage ceilings well before the database-size ceiling. — [source: user-confirmed Supabase limits, this session] (confidence: medium)
- Differentiation strategy has been explicitly **deferred** by the stakeholder (confirmed this session), meaning the risk noted above (crowded market, no stated differentiation) remains open by decision rather than oversight — worth flagging again at `/speckit.assess.decide` if it is still unaddressed. — [source: user input, this session] (confidence: high)

## Gaps & Open Questions

- **Resolved this pass — not deferred**: Serverless connection pooling is necessary and should be configured at initial launch (see Data & Constraints above), not deferred to a later scaling phase. It requires minimal setup (use Supabase's built-in free-tier shared pooler / transaction mode) rather than being an open technical unknown.
- **Resolved, not a gap, but flagged as a decision-stage risk**: no demand signal exists at all (ground-up idea) — this should be weighed explicitly at `/speckit.assess.decide` rather than treated as a research task, since the stakeholder has confirmed there is nothing further to research here.
- **Deferred by stakeholder decision (not an open unknown needing resolution now)**: differentiation strategy versus existing Filipino/international gaming media.

## Sources

- https://vercel.com/docs/storage (host: vercel.com, policy: confirmed-by-user)
- https://vercel.com/docs/marketplace-storage (host: vercel.com, policy: confirmed-by-user)
- https://supabase.com/docs/guides/database/connecting-to-postgres (host: supabase.com, policy: confirmed-by-user)
- .specify/assessments/blog-site-plan/intake.md (local repo artifact, read-only)
- docs/neon-GA-01.png, docs/neon_ga_logo_2.png (local repo artifacts, read-only — brand logo assets)
