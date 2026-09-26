# Feature Specification: Blog Site Launch (Lean Custom Launch)

**Feature Branch**: `001-blog-site-launch`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "read the assessment artifacts on what to build"

Assessment sources: `docs/website-plan.md`, `.specify/assessments/blog-site-plan/intake.md`, `research.md`, `problem.md`, `concept.md` (Option A — Lean custom launch), `decision.md` (verdict: go).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read published gaming content (Priority: P1)

A visitor (no account needed) opens the public site, browses available articles, and reads a full article including its title, body, and supporting imagery.

**Why this priority**: This is the core value — without public reading there is no brand presence, no launch, and no audience loop. It is the minimum viable publication.

**Independent Test**: Can be fully tested by publishing one article via seeded content and verifying an anonymous visitor can list and read it end-to-end. Delivers a live, readable publication.

**Acceptance Scenarios**:

1. **Given** at least one published article exists, **When** a visitor opens the site, **Then** they see a list of published articles with titles sufficient to choose one.
2. **Given** a visitor selects an article from the list, **When** the article opens, **Then** the full title, body content, and associated imagery are displayed readably on both desktop and mobile-sized screens.

---

### User Story 2 - Contributor publishes content independently (Priority: P1)

An invited internal contributor signs in to the built-in authoring area, creates a new article (news, review, commentary/opinion, or interview), previews it, and publishes it so it appears to public readers without developer help.

**Why this priority**: Independent publishing is the launch-gating workflow — the site cannot sustain 2–3 articles per week if every post needs a developer.

**Independent Test**: Can be fully tested by provisioning one contributor account, signing in, and publishing a test article that then appears in the public list. Delivers self-service publishing.

**Acceptance Scenarios**:

1. **Given** a signed-in contributor account, **When** the contributor creates and publishes a valid article, **Then** the article becomes publicly visible to anonymous readers.
2. **Given** a signed-in contributor with a draft, **When** the contributor edits and republishes it, **Then** readers see the updated content.

---

### User Story 3 - Reader registers, signs in, and comments (Priority: P2)

A reader creates an account (via third-party Google sign-in or username/password credentials), signs in, and posts a comment on an article. Other readers can read posted comments.

**Why this priority**: Commenting is the defined community interaction model for launch; it turns readers into participants without broader social features.

**Independent Test**: Can be fully tested by registering one account, signing in, posting a comment on a published article, and verifying it is visible to other readers. Delivers account-based discussion.

**Acceptance Scenarios**:

1. **Given** a published article with comments enabled, **When** a signed-in reader submits a comment containing permitted language, **Then** the comment appears under that article.
2. **Given** a reader submits a comment containing a word from the blocked-word list, **When** the comment is processed, **Then** the comment is rejected or held from public view and the reader is informed why in plain language.
3. **Given** a signed-in reader views a comment they find inappropriate, **When** they report it, **Then** the comment is flagged for moderator/admin review while remaining visible to readers (not auto-hidden).

---

### User Story 4 - Moderator and admin review reported comments (Priority: P2)

A moderator reviews comments flagged by reader reports. Once a flagged comment reaches the configured report-count threshold it is surfaced for action, and the moderator can remove it. An admin can act on any flagged comment immediately regardless of report count, and can disable the comment section entirely when necessary.

**Why this priority**: Practical low-overhead moderation is required from day one so the site does not need constant manual comment-by-comment review.

**Independent Test**: Can be fully tested by generating reports against a test comment, verifying threshold surfacing, deleting via moderator, verifying admin bypass on a single-report comment, and toggling comments off. Delivers the full report-to-action loop.

**Acceptance Scenarios**:

1. **Given** a comment flagged by fewer reports than the configured threshold, **When** a moderator views the review queue, **Then** the comment is marked as flagged but not yet surfaced as requiring action, and it remains visible to readers.
2. **Given** a flagged comment reaches the configured threshold, **When** a moderator reviews it, **Then** the moderator can delete it so it no longer appears to readers.
3. **Given** a flagged comment with only one report, **When** an admin reviews it, **Then** the admin can delete it immediately without waiting for the threshold.
4. **Given** comments are disabled by an admin, **When** a reader views an article, **Then** no new comments can be posted and a clear notice explains commenting is turned off.

---

### User Story 5 - Admin provisions and manages accounts and roles (Priority: P3)

The admin (initially Arohbi) creates internal accounts for contributors, assigns roles, and provides a default password the new account holder can change later. A single account can hold multiple roles at once (e.g., contributor + moderator). Regular reader signup is open for commenting; contributor access is admin-provisioned only, never self-serve.

**Why this priority**: Access control underpins publishing and moderation trust, but the day-one flow is a small internal team so it follows reading, publishing, and commenting.

**Independent Test**: Can be fully tested by having an admin create one contributor account with a default password, verifying the new holder can sign in and change the password, and verifying a multi-role (contributor + moderator) account can both publish and moderate. Delivers managed team access.

**Acceptance Scenarios**:

1. **Given** the admin is signed in, **When** the admin creates a new contributor account with a default password, **Then** the new holder can sign in with it and is prompted/able to change it.
2. **Given** an account holding both contributor and moderator roles, **When** the holder uses the site, **Then** they can both publish content and moderate comments.
3. **Given** a holder with only the moderator role, **When** they attempt to create content, **Then** they are denied with a clear message.
4. **Given** a holder with only the contributor role, **When** they attempt to moderate (e.g., delete a reported comment), **Then** they are denied with a clear message.
5. **Given** an anonymous visitor attempts self-registration as a contributor, **When** they look for that option, **Then** no such option exists — contributor access is only grantable by an admin.

---

### User Story 6 - Branded, readable experience on any device (Priority: P3)

A visitor experiences a clean, modern, flat/no-gloss (matte) presentation using the existing brand identity (blue, red, yellow, white with pink/gold accents and the existing logo assets) that is easy to navigate and fully usable on mobile devices.

**Why this priority**: Recognizable on-brand presentation matters for a soft launch to a small circle, but it refines rather than enables the publishing-and-comment loop.

**Independent Test**: Can be fully tested by opening the site on desktop and mobile-sized screens and verifying navigation, readability, brand colors/logo presence, and content access. Delivers a coherent branded publication.

**Acceptance Scenarios**:

1. **Given** a visitor on a mobile device, **When** they navigate the site and read an article, **Then** all text is legible, navigation works, and no horizontal scrolling or broken layout blocks reading.
2. **Given** any public page, **When** it renders, **Then** the brand logo and flat matte color presentation are consistently applied.

---

### Edge Cases

- What happens when a contributor tries to publish an article with a missing title or empty body? The system rejects it with a clear message and preserves the draft.
- How does the system handle duplicate reports of the same comment by the same user? Only one report per user per comment counts toward the threshold.
- What happens when a comment is reported after it was already deleted? Further reports are ignored and reporters are not shown an error that leaks moderation state beyond what is necessary.
- How does the system handle sign-in with wrong credentials or a cancelled third-party sign-in? The user stays on the sign-in screen with a plain-language error and can retry.
- What happens when the admin disables comments while a reader is typing a comment? The submission is refused with a clear notice that commenting is turned off, and the reader's text is preserved so it is not lost.
- What happens when two moderators act on the same flagged comment at the same time? Only one deletion takes effect; the second actor sees that the comment is already handled.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present a publicly accessible list of published articles to anonymous visitors.
- **FR-002**: System MUST display the full content of a selected published article (title, body, associated imagery) to anonymous visitors.
- **FR-003**: System MUST support article content types including news, reviews, commentary/opinion pieces, and interviews.
- **FR-004**: Contributors MUST be able to create, edit, and publish articles through built-in in-app authoring without developer intervention.
- **FR-005**: System MUST restrict content creation and publishing to admin-provisioned contributor and admin accounts; open public contributor signup MUST NOT exist.
- **FR-006**: Readers MUST be able to register and sign in using both third-party Google sign-in and username/password credentials.
- **FR-007**: Signed-in regular users, contributors, moderators, and admins MUST be able to post comments on articles where comments are enabled.
- **FR-008**: System MUST automatically screen submitted comments against a static blocked-word list and MUST refuse or withhold from public view any comment containing a listed word, informing the author in plain language.
- **FR-009**: Signed-in users MUST be able to report any visible comment; reporting MUST flag the comment for review and MUST NOT auto-hide it from readers.
- **FR-010**: System MUST count one report per reporting user per comment toward a configurable report-count threshold.
- **FR-011**: System MUST surface flagged comments reaching the threshold for moderator/admin action.
- **FR-012**: Moderators MUST be able to delete reported comments and articles/content where authorized; moderators MUST NOT be able to create content.
- **FR-013**: Contributors MUST be able to create content and comment; contributors MUST NOT be able to moderate.
- **FR-014**: Admins MUST have full access including user/role management, content and comment management, threshold configuration, disabling comments entirely, and bypassing the report-count threshold to act on any flagged comment regardless of count.
- **FR-015**: System MUST support assigning multiple roles to a single account simultaneously (e.g., contributor + moderator) with combined permissions.
- **FR-016**: Admins MUST be able to create internal accounts with a default password that the holder can change later.
- **FR-017**: Admins MUST be able to disable the comment section entirely so no new comments can be posted.
- **FR-018**: System MUST present all content in English only.
- **FR-019**: System MUST present a clean, modern, responsive presentation usable on desktop and mobile devices using a flat/no-gloss (matte) palette consistent with the existing brand assets.
- **FR-020**: System MUST NOT include public user profiles, follows, feeds, direct messages, or other social features beyond commenting and reporting.
- **FR-021**: System MUST NOT include monetization features (ads, sponsorships, affiliate links), localization beyond English, or open contributor onboarding at launch.

### Key Entities

- **Article**: A published or draft piece of gaming content (news, review, commentary/opinion, interview); has title, body, author, publication state, and associated imagery.
- **User Account**: A registered identity used for commenting and/or team functions; has sign-in credentials (Google-linked or username/password), assigned roles, and account state.
- **Role**: A permission set — regular user (comment, report), contributor (create content, comment), moderator (moderate/delete comments and content, no content creation), admin (full access including bypasses); multiple roles can apply to one account.
- **Comment**: A reader-authored remark attached to a specific article; has author, text, visibility state, and enabled/disabled context of its article.
- **Report / Flag**: A record that a specific user reported a specific comment; aggregated per comment into a report count compared against the configured threshold; does not itself hide the comment.
- **Blocked-Word List**: The static list of prohibited words used for automatic comment screening.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Site is publicly reachable and at least one full article can be opened and read end-to-end by an anonymous visitor during the soft launch.
- **SC-002**: At least one invited contributor publishes an article from draft to publicly visible without developer assistance.
- **SC-003**: A test inappropriate comment is reported by readers, surfaced once the report threshold is reached, and removed by a moderator; and a separately flagged comment with a single report is removed by an admin bypass — both verified before or at launch.
- **SC-004**: Publishing cadence of 2 to 3 new articles per week is sustained over the first 4 weeks after launch.
- **SC-005**: 90% or more of first-time soft-launch readers who attempt to open an article succeed on their first attempt without assistance.
- **SC-006**: Site remains continuously reachable throughout the soft-launch period with no forced paid infrastructure upgrade required in the first month post-launch.

## Assumptions

- Initial content: Arohbi coordinates at least one publishable article so the soft launch does not open empty.
- Launch shape: First release is a soft launch shared with a small circle; immediate broad public promotion is not required.
- Authoring sufficiency: A basic built-in authoring experience is acceptable for invited contributors at launch even if less comfortable than a mature publishing product.
- Moderation sufficiency: The flag-plus-threshold-plus-admin-bypass model with a static blocked-word list is sufficient for early community volume.
- Brand assets: Existing logo files in `docs/` (neon comic-burst style) plus the stated blue/red/yellow/white with pink/gold accents are sufficient for a recognizably on-brand launch without additional brand-system work.
- Out of scope (per assessment decision): public profiles/social features, non-English localization, monetization, launch-time SEO/analytics instrumentation, competitive differentiation strategy, open contributor signup, advanced editorial workflow (approval chains, calendars, revision-heavy processes), rich media management beyond launch needs, and audience-growth targets as launch gates.
- Governance: All subsequent planning and implementation MUST satisfy the project constitution (code quality with review, automated unit + integration testing, consistent accessible UX, security including auth and dependency hygiene, and performance benchmarking) even though launch success metrics are framed narrowly.
