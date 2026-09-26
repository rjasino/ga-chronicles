# Idea Intake: Game Ako Chronicles Blog Site

- **Slug**: blog-site-plan
- **Created**: 2026-09-27
- **Source**: docs/website-plan.md
- **Type**: new-capability

## Idea (as captured)

> ## Game Ako Chronicles Blog Site Plan
>
> ### Overview
>
> The Game Ako Chronicles Blog Site is a platform dedicated to providing news, updates, and insights about the gaming industry that particularly focuses on console and pc gaming. The site will feature a variety of content including articles, reviews, commentary and opinion pieces, as well as interviews with industry professionals and developers. The goal of the site is to create a community of gamers and enthusiasts who can share their experiences and knowledge about the gaming world.
>
> ### Target Audience
>
> The target audience for this site includes gamers of all ages primarily Filipino regardless of their location.
>
> ### Website Design
>
> Game Ako Chronicles uses a clean and modern design that is easy to navigate. The primary colors used are blue, red, yellow and white. Kindly create a matte finish for the website design. The site will be responsive and optimized for mobile devices, ensuring that users can access content from any device.
>
> The site will feature a simple content writing interface for contributors.
>
> ---
>
> ## Answers to Clarification
>
> - The project is raised by my Arohbi
> - The trigger for this is the need to create a blog site for Game Ako Chronicles to provide news, updates, and insights about the gaming industry.
> - content writing interface mean CMS.
> - contributors are internal team only, admin which is me will add access to the contributors and provide default password that they can change later.
> - User account/membership is needed for commeting. Use Google OAuth and Credential for login and registration. No need for profiles or community features.
> - No localization requirement, English only.
> - Matte finish means flat/no-gloss color palette.
> - We already have a logo and typography, I will add it to this repo later.
> - Defer monetization model discussion until after the site is launched.
> - No specific SEO, analytics, or performance targets expected for launch. We will discuss this after the site is launched.

## Restated

Build a gaming-focused blog site ("Game Ako Chronicles") covering console and PC gaming news, reviews, commentary, and interviews, aimed at building a community of (primarily Filipino, English-speaking) gamers. The site uses a clean/modern responsive design with a blue/red/yellow/white/pink/gold flat/no-gloss ("matte") palette matching the existing neon-style logo (found at `docs/neon-GA-01.png`, `docs/neon-GA trans-01.png`, `docs/neon_ga_logo_2.png`). It will be built with Next.js and Supabase (backend/database), deployed on Vercel's Hobby plan initially (with intent to scale up later). Rather than an off-the-shelf CMS product, the app itself will include built-in CRUD functionality for content authoring, plus a simple RBAC (role-based access control) and user-management module with four roles — **regular user** (comment, report comments), **contributor** (create content, comment; cannot moderate), **moderator** (moderate/delete comments and content; cannot create content), and **admin** (full access, including bypassing report thresholds) — and a single account can hold multiple roles simultaneously (e.g., a contributor who is also a moderator). Readers can register/log in via Google OAuth or credentials to comment. Comments are filtered against a static profanity wordlist; users can report comments, which flags them for admin/moderator attention without auto-hiding them; moderation action (e.g., deletion) is normally taken once a **configurable report-count threshold** is reached, but admins can bypass that threshold and act on any single report regardless of count. Admins can also disable the comment section entirely if necessary. No public profiles or broader community/social features are planned. Monetization, SEO, analytics, performance targets, and competitive differentiation strategy are all explicitly deferred until after launch.

## Origin & Context

- **Raised by**: Arohbi
- **Trigger**: The need to create a blog site for Game Ako Chronicles to provide news, updates, and insights about the gaming industry.

## First-Glance Unknowns

*Re-checked against the full text of docs/website-plan.md, which now includes an "Answers to Clarification" section, plus follow-up clarifications given directly in conversation during `/speckit.assess.research`. All prior first-glance unknowns are now resolved (see below); no open unknowns remain from this round. Deeper design/implementation questions may still surface in `/speckit.assess.define` or `/speckit.assess.shape`.*

**Resolved from doc's "Answers to Clarification":**
- Contributors = internal team only; admin-provisioned accounts with default password (changeable later).
- User accounts needed for commenting only (Google OAuth + credentials login/registration); no profiles or broader community features.
- No localization requirement — English only.
- Matte finish = flat/no-gloss color palette (confirmed, matches earlier inference).
- Monetization model discussion deferred until post-launch.
- SEO/analytics/performance targets deferred until post-launch.
- Raised by: Arohbi. Trigger: need to launch a blog site for Game Ako Chronicles.

**Resolved from follow-up conversation (during `/speckit.assess.research`), superseding earlier wording:**
- **Correction**: "Content writing interface" does **not** mean an off-the-shelf CMS product (e.g., WordPress). It means the Next.js app itself will include built-in **CRUD functionality** for content, plus a **simple RBAC and user-management module** — all custom-built within the app.
- Tech stack: **Next.js** (frontend/framework) + **Supabase** (backend and database).
- Deployment: **Vercel Hobby plan** initially, with intent to scale up later.
- Logo/typography: found in repo at `docs/neon-GA-01.png`, `docs/neon-GA trans-01.png`, `docs/neon_ga_logo_2.png` — a neon comic-burst style logo ("GAME" in yellow/blue, "AKO" in red/white outline) with blue starburst accent lines, yellow stars, and a gamepad icon in pink/gold. Site design should be built around these assets; palette extends to include pink and gold as accents alongside blue/red/yellow/white.
- Comment moderation: profanity filter applied automatically; user reporting system lets admins review/delete inappropriate comments; admin can disable the comment section entirely if necessary.

**Resolved in this round (RBAC, moderation workflow, profanity filter, differentiation):**
- Profanity filter approach: **static wordlist** (not a third-party API or AI-based moderation).
- Report-to-deletion workflow: reporting a comment only **flags** it for admin/moderator attention — it does **not** auto-hide the comment. Actual moderation action (e.g., deletion) is normally gated by a **configurable report-count threshold**. **Admins have a bypass**: they can act on a flagged comment regardless of how many reports it has received.
- RBAC roles (simple, four roles, **multi-role assignment supported** — a single account can hold more than one role, e.g., contributor + moderator):
  - **Admin**: full access; holds all bypasses (including the report-threshold bypass).
  - **Moderator**: can moderate and delete comments or content; cannot create content.
  - **Contributor**: can create content and comment; cannot moderate the site.
  - **Regular user**: can comment and report comments.
- Differentiation strategy (vs. competitor gaming media): explicitly **deferred** — not being addressed at this stage.
