# Concept: Launch-First Gaming Blog

- **Slug**: blog-site-plan
- **Created**: 2026-09-27
- **Recommended option**: Lean custom launch

## Options

### Option A — Lean custom launch
- **Sketch**: Ship the smallest custom Game Ako Chronicles site that feels like a real branded publication from day one: a public article-reading experience, a basic contributor publishing flow for invited internal accounts, and simple but usable community commenting with moderation controls. Readers can visit the site, read posts, register or sign in to comment, and see a coherent brand presence; Arohbi can soft-launch it to a small circle and begin publishing immediately.
- **Appetite**: medium
- **Trade-offs**: Wins by aligning tightly to the stated launch goal, keeping within free-tier constraints, and validating the core publishing-and-comment loop without waiting on growth features or market strategy. Sacrifices polish in editorial workflow, richer media handling, and broader audience-growth capabilities. Main risk is that even a lean custom build still carries product effort despite zero demand validation.
- **Rabbit holes**: Custom auth and role handling, content-authoring UX expectations drifting toward a full CMS, moderation edge cases, and image/media needs expanding beyond a simple launch footprint.

### Option B — Editorial launchpad
- **Sketch**: Build a more rounded first version that still launches as a blog site but includes a stronger contributor and moderator experience from the start: more comfortable writing and review flows, clearer back-office management, and more operational controls around comments and content. The user experience is more complete for the internal team, reducing friction if publishing cadence ramps quickly after launch.
- **Appetite**: large
- **Trade-offs**: Wins by giving contributors and moderators a sturdier foundation and reducing the chance that the first post-launch weeks immediately expose workflow pain. Sacrifices speed, simplicity, and launch urgency; it increases the chance that the project turns into building an internal publishing platform before proving the audience or content loop. Main risk is overshooting the stakeholder's current priority to "just put this website now."
- **Rabbit holes**: Review and approval workflow creep, richer role and permission nuance, better media management, nicer editor expectations, and admin tooling expanding into a full internal operations suite.

### Option C — No-build stopgap publishing
- **Sketch**: Do not build the custom site yet. Instead, publish through temporary third-party channels or static one-way pages while building content samples and testing whether anyone engages at all. This would delay or avoid the custom contributor system and custom commenting/moderation model until there is stronger evidence that the audience hypothesis is worth funding further.
- **Appetite**: small
- **Trade-offs**: Wins by minimizing effort and reducing the risk of investing in a custom product before any demand exists. Sacrifices the stated desire for an owned branded destination, custom contributor roles, and the specific comment-moderation model already defined as part of the idea. Main risk is that it solves a different problem than the one Arohbi wants solved now.
- **Rabbit holes**: Choosing and operating interim platforms, fragmented brand presentation, migration later into a custom site, and false-negative demand signals caused by testing on the wrong channel.

## Recommendation

Recommend **Option A — Lean custom launch**.

It best matches the current problem definition and stakeholder direction: get Game Ako Chronicles live, publicly reachable, branded, and usable for a small-circle soft launch without waiting for a broader editorial platform or market strategy. It directly supports the launch success metrics that matter now: at least one published article, contributor self-service for publishing, working comment moderation, and staying within free-tier infrastructure limits. It also fits the risk profile revealed by research: because there is no demand signal yet, the safest path is not the most elaborate product, but the smallest credible custom site that can test the publishing-and-community loop under the actual brand.

Option B is directionally valid but too easy to overbuild before the idea is validated. Option C reduces investment risk, but it no longer satisfies the stated goal of launching an owned Game Ako Chronicles website with custom in-app publishing and moderation.

## Out of Scope (for the recommended option)

- Public profiles, follows, feeds, DMs, or broader social/community features beyond comments
- Localization beyond English
- Monetization features such as ads, sponsorships, or affiliate links
- SEO, analytics instrumentation, or formal performance-target work for launch
- Competitive differentiation strategy work before launch
- Open public contributor signup or self-serve contributor onboarding
- Advanced editorial workflow features such as approval chains, editorial calendars, or revision-heavy newsroom processes
- Rich media management beyond what is needed to publish initial launch content
- Aiming for audience-growth targets as launch gates; those remain aspirational until post-launch data exists

## Assumptions to Validate

- Arohbi can provide or coordinate enough initial content to make the soft-launch site feel real, including at least one publishable article
- A small-circle soft launch is the correct first release shape, and immediate broad public promotion is not required
- A basic custom authoring experience is sufficient for invited contributors at launch, even if it is not yet as comfortable as a mature CMS
- The planned comment-and-report model is enough for early community interaction without needing broader social features
- Free-tier Vercel Hobby and Supabase limits are adequate for initial launch traffic and content volume
- Brand assets already in the repo are sufficient to deliver a recognizably on-brand first version without additional brand-system work
