# Data Model: Game Ako Chronicles Blog Site

This model captures the domain entities and integrity rules required by [spec.md](spec.md). Supabase Auth remains the source of authentication identities; application-owned tables hold editorial and authorization data.

## Entities

### User Account

Represents a registered reader or internal team member linked to an authentication identity.

| Field | Meaning / validation |
|---|---|
| `id` | Stable identifier matching the authentication identity; required and unique. |
| `username` | Required, normalized, unique login handle; never treated as a password or authorization claim. |
| `display_name` | Optional name shown beside authored comments. |
| `status` | Active or disabled; disabled accounts cannot sign in to protected features or create comments/reports. |
| `created_at` | Account creation timestamp. |

Email and provider credentials are managed by the authentication provider, not copied into a public profile. Signup collects an email address to satisfy password-based provider authentication; username/password login resolves the username to the account identity server-side and uses a generic failure response.

The implementation keeps the email-to-account lookup in a separate server-only table with row-level security enabled and no grants to browser roles. It is used only by trusted signup, provisioning, and sign-in actions; it is not exposed through public account/profile queries.

### Role and Account Role

`Role` identifies a permission set: `reader`, `contributor`, `moderator`, or `admin`. `AccountRole` associates an account with a role.

- An account may have zero or more elevated roles and may hold contributor and moderator together.
- Every signed-in account has reader capabilities; `reader` may be represented as the default rather than a persisted grant.
- Only admins may grant or revoke internal roles.
- Moderator grants content/comment moderation but not content creation.
- Contributor grants content creation/editing/publishing and commenting but not moderation.
- Admin grants all capabilities and the report-threshold bypass.
- Effective permissions are additive, except no grant may exceed the explicitly defined admin-only user/role/configuration operations.

### Article

Represents a news article, review, commentary/opinion piece, or interview.

| Field | Meaning / validation |
|---|---|
| `id` | Stable unique identifier. |
| `title` | Required and non-empty after trimming. |
| `slug` | Required, normalized, unique public route identifier. |
| `body` | Required and non-empty after trimming; rendered safely as readable article content. |
| `type` | One of news, review, commentary/opinion, or interview. |
| `status` | Draft, published, or removed; only published articles appear publicly. |
| `author_id` | Required reference to the account that authored the article. |
| `cover_image` | Optional reference to an associated stored image. |
| `published_at` | Absent for drafts; set when published and refreshed on republish according to editorial behavior. |
| `created_at`, `updated_at` | Required timestamps. |

### Comment

Represents a reader-authored remark on a published article.

| Field | Meaning / validation |
|---|---|
| `id` | Stable unique identifier. |
| `article_id` | Required reference to a published article. |
| `author_id` | Required reference to an active signed-in account. |
| `body` | Required, non-empty after trimming, and rejected/withheld if it contains a blocked term. |
| `status` | Visible or deleted; a report alone does not change visibility. |
| `created_at`, `updated_at` | Required timestamps. |

New comments are allowed only while the global comments setting is enabled. Deleted comments remain unavailable to readers and cannot receive new effective reports.

### Report

Represents one account's report of one comment.

| Field | Meaning / validation |
|---|---|
| `id` | Stable unique identifier. |
| `comment_id` | Required reference to a non-deleted comment. |
| `reporter_id` | Required reference to an active signed-in account. |
| `reason` | Optional short category/text if collected by the interface. |
| `created_at` | Required timestamp. |

The pair (`comment_id`, `reporter_id`) is unique, so repeat reports by the same account do not increase the threshold count. Reports flag a comment but never auto-hide it.

### Blocked Word

An entry in the static launch wordlist used for server-side comment screening.

| Field | Meaning / validation |
|---|---|
| `id` | Stable unique identifier. |
| `term` | Required normalized matching term; unique under the matching normalization rules. |
| `enabled` | Allows a term to be disabled without deleting history/configuration. |

The list is not editable by readers. Matching behavior (case normalization and word-boundary policy) must be deterministic and covered by tests.

### Site Settings

Singleton configuration for global comment behavior and moderation thresholds.

| Field | Meaning / validation |
|---|---|
| `comments_enabled` | Required boolean; when false, new comment submissions are rejected and the public article page explains that comments are off. |
| `moderation_report_threshold` | Required positive integer; a comment is actionable by a moderator at or above this number of unique reports. |
| `updated_by` | Admin account that last changed the settings. |
| `updated_at` | Timestamp of the latest change. |

Only admins may change site settings. Admins may act on any flagged comment regardless of the threshold; moderators may act only when the threshold is met.

## Relationships

- One account has many role assignments, comments, articles, and reports.
- One article has many comments; one comment belongs to one article.
- One comment has many reports; each report is made by one account, with at most one report per account/comment pair.
- The site settings record is global and singleton.
- Article imagery is stored separately and referenced by the article; the database retains metadata/paths rather than binary image content.

## Key state transitions

- **Article**: `draft → published → draft` (unpublish, admin/contributor-authorized) and `published → published` (edit/republish). Drafts are private; only published content is reader-visible.
- **Article moderation**: a moderator or admin can remove content; removed content is no longer reader-visible. Removal is distinct from the ability to create or publish.
- **Comment**: `visible → deleted` by an authorized moderator when the threshold is met or an admin at any report count. Reports do not transition comment visibility.
- **Comments setting**: `enabled ↔ disabled` by admin. Disabled prevents new submissions but does not implicitly delete existing comments.
- **Account roles**: admins grant/revoke roles; multiple grants may coexist and each permission is checked independently.

## Integrity and authorization rules

- Enforce unique article slugs and usernames, and unique (`comment_id`, `reporter_id`) reports.
- Validate required article/comment content on the trusted server boundary; preserve drafts when invalid publishing input is rejected.
- Restrict public article reads to published records. Restrict drafts and authoring actions to contributors/admins.
- Restrict reports to signed-in active accounts and visible comments.
- Enforce moderation threshold and admin bypass in the trusted action boundary; enforce table access with RLS.
- Do not store privileged role grants in user-editable metadata or expose server-only service credentials to browsers.
