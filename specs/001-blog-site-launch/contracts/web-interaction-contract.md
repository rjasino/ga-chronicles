# Web Interaction Contract

This application exposes user-facing web journeys rather than a separately promised public API. The contract describes observable behavior for anonymous readers, signed-in accounts, internal contributors, moderators, admins, and the Google identity provider.

## Public publication

- Anonymous visitors can browse a list of published articles and open a published article containing its title, body, and associated imagery.
- Draft articles and internal management information are not visible to anonymous visitors.
- Public pages remain readable and navigable on desktop and mobile layouts. When comments are disabled, the article page displays a clear notice and accepts no new comments.
- Only English content/interface is included at launch.

## Account access

- Readers can register/sign in using Google OAuth or username/password credentials.
- Password registration captures the email identity required by the authentication provider and a unique username; username/password sign-in does not disclose whether a username exists when credentials fail.
- A signed-in account can comment and report comments. Contributor, moderator, and admin permissions are independently enforced for each privileged action.
- Contributors cannot self-enroll into internal roles. Only an admin can provision internal accounts and grant/revoke roles.
- OAuth cancellation or failed credentials return the user to a recoverable sign-in state with plain-language feedback; account state is not disclosed to another user.

## Publishing

- A contributor or admin can create and edit a draft, preview it, and publish valid content without developer intervention.
- Article title and body are required. Invalid publish attempts explain the correction required and preserve the draft.
- Publishing makes the article publicly visible; editing and republishing updates the public article.
- A moderator can remove reported/inappropriate content but cannot create or publish articles. A contributor-only account cannot use moderation actions.
- Removed content is no longer available to public readers.

## Comments and reports

- Only signed-in active accounts can submit comments or reports.
- New comments are checked on the trusted server against the blocked-word list. A rejected comment is not made public and the author receives a plain-language reason.
- A reader can report a visible comment once. A report flags the comment for review but does not hide it.
- A moderator can delete a flagged comment only after the unique-report threshold is reached. An admin can delete any flagged comment regardless of count.
- If comments are disabled between composing and submitting, the submission is rejected with a clear notice and the entered text remains available to the reader.
- Concurrent moderator actions result in at most one effective deletion; a later moderator sees that the comment was already handled.

## Role and settings administration

- A single account can hold multiple roles and receives the combined permitted actions.
- Admins can provision internal accounts with a default password, change role grants, configure the report threshold, manage content/comments, and toggle comments globally.
- A new internal account holder can change the default password.
- Unauthorized actions are refused on the trusted server boundary and do not reveal protected drafts, account data, or moderation information.

## External identity boundary

- Google OAuth is initiated through the configured Supabase Auth provider and returns through the registered callback URL.
- Provider secrets remain server-side. The application accepts a session only after server-side verification; browser-provided role/profile data is not sufficient authorization.
- When Google sign-in is unavailable or canceled, the user can retry or choose username/password access.
