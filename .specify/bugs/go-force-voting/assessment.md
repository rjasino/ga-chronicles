# Bug Assessment: Go Force navigation, voting timer, and game details missing

- **Slug**: go-force-voting
- **Created**: 2026-11-21
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> Add in the navigation the link to go-force, the view will be base on the access, admin will have the full access and player will have the view for voting. User not participating in go force should not see a link to it. Visibility option still applies and the above instruction will happen if the visibility is on. On open session, there should be a spinning roulette, use 3rd party tools if needed, to simulate the randomness. Add timer, which is configurable, to close the voting. For the game details card both on admin side and the player side, add some description about the game such as title, developer, publisher, genre and cover_art. During the seeding of games, the admin will provide these info.

## Clarifications

- Admins always see and can access Go Force, regardless of the public visibility setting.
- A participating user sees the Go Force link only while they are rostered in an active session; the visibility setting still applies to participants.
- Configure round game-voting and final-ballot timers separately.
- Both timers default to 10 seconds.
- Game metadata is optional. Cover art must support both an upload and a URL.

## Symptom

Go Force currently has no navigation entry, and its admin-managed games contain only title/year/eligibility/order rather than the requested descriptive metadata. A facilitator can draw a random title and manually close voting, but there is no visible roulette animation or configurable voting timer.

## Reproduction

1. Enable Go Force page visibility, create an active session with a player on its roster, and inspect the site header as that player and as an admin; neither gets a Go Force link. Then hide the page and confirm the admin still has no navigation entry.
2. Create and start a session, then use **Spin the roulette**. The server selects a random game, but the interface shows no spinning animation; voting remains open until the facilitator closes it manually.
3. Open **Manage Go Force** and inspect the annual-game form and live admin/player screens. They provide/display the game title but have no developer, publisher, genre, or cover-art fields.

## Suspected Code Paths

- `apps/web/src/components/site-header.tsx:10-12` — the main navigation renders no Go Force link and does not check Go Force visibility or session participation.
- `apps/web/src/app/go-force/page.tsx:15-17,34-56` — applies page visibility and chooses an active-session destination, but navigation and participant-specific link visibility are not handled here.
- `apps/web/src/components/go-force/facilitator-session.tsx:27-47,130-150` — exposes an immediate draw action and manual **Close voting** action; no roulette display or countdown is present.
- `apps/web/src/features/go-force/game-actions.ts:18-35,70-86` — calls the draw RPC and closes a selection on explicit facilitator action; there is no timer/expiry path.
- `supabase/migrations/0011_go-force-core.sql:15-23,62-69` — annual game and session snapshot tables store title and basic list fields only. The draw RPC at lines 395-415 already chooses randomly with `order by random()`.
- `apps/web/src/components/go-force/admin-controls.tsx:37-52,67-84` — annual-game edit/add forms contain title, year, eligibility, and order only.
- `apps/web/src/features/go-force/types.ts:20-28,58-66` — annual-game and session-snapshot types have no requested metadata fields.
- `apps/web/src/components/go-force/player-session.tsx:109-125` and `facilitator-session.tsx:141-146` — active selection cards display the title snapshot, not game details.
- `apps/web/tests/e2e/go-force-admin.spec.ts:3-50` — covers page visibility and title-only game maintenance; it does not cover the requested navigation, timer, or metadata.

## Root Cause Hypothesis

The requested behaviors were omitted from the implemented Go Force scope; this appears to be a feature gap rather than a regression in an existing path. The current feature already enforces server-side random selection, page visibility, and roster-based session access, but its header has no Go Force entry, voting closes only by facilitator action, and its annual-game/session-snapshot schema contains no descriptive metadata. Confidence: high.

## Proposed Remediation

**Preferred**: Add a Go Force navigation item that admins always see, even when the public page is hidden. A non-admin participant sees it only when rostered in an active session and the public page is visible. Keep the existing route- and database-level access checks authoritative. Add an animated roulette presentation around the existing server-side random draw—the animation should reveal the persisted server choice, not determine it client-side. Add separate admin-configurable durations for round game voting and the final ballot, with visible countdowns and server-enforced expiry/close behavior so expiry does not depend solely on a browser tab remaining open.

Extend annual game administration with optional developer, publisher, genre, and cover-art data, supporting either an uploaded image or a URL. Validate and persist supplied values, and snapshot them when a session starts so edits do not change live-session details. Render the resulting game details in the admin/facilitator and player selection cards, with a fallback when metadata or art is absent.

**Alternatives**:
- Keep manual close as the only behavior and add an optional countdown/reminder. This is simpler and avoids server-side auto-close scheduling, but does not satisfy automatic close on expiry.
- Use a roulette animation package. This may speed up presentation work, but adds a dependency; a small accessible in-house animation can display the server-selected result without one.

**Files likely to change**:
- `apps/web/src/components/site-header.tsx`
- Go Force navigation/access query or helper code under `apps/web/src/features/go-force/`
- `apps/web/src/components/go-force/admin-controls.tsx`
- `apps/web/src/components/go-force/facilitator-session.tsx`
- `apps/web/src/components/go-force/player-session.tsx`
- `apps/web/src/features/go-force/admin-schemas.ts`, `admin-actions.ts`, `admin-queries.ts`, `session-actions.ts`, `session-queries.ts`, and `types.ts`
- A new Supabase migration extending annual games, session snapshots, and session/voting settings as needed
- Go Force unit, database, and Playwright tests

**Tests to add or update**:
- Navigation visibility for hidden/visible page states, admins, rostered players, game masters, and nonparticipants; direct route and mutation access must remain protected.
- Admin validation and persistence for metadata, metadata snapshot preservation after annual-game edits, and rendering in facilitator/player cards including missing cover-art fallback.
- Roulette presentation reveals the server-selected title without changing selection uniqueness or server-side randomness.
- Both timers default to 10 seconds; configured countdowns and server-side rejection/closure after expiry work, including late vote attempts, reconnects, and simultaneous manual close/expiry.

## Risks & Considerations

- Reliable automatic expiry requires server-side enforcement and a dependable close/recovery path; a client-only timer is insufficient if the facilitator disconnects.
- A schema migration must preserve existing games and snapshots; snapshotting metadata is important to keep live sessions consistent after edits.
- Supporting both uploaded and URL-based cover art requires storage handling and URL/image-host validation; remote images also introduce availability and content-policy considerations.
- Any roulette animation should respect reduced-motion preferences and remain understandable to keyboard and screen-reader users.

## Open Questions

None. Both configurable timers default to 10 seconds; the implementation can choose sensible bounds for admin-configured values.
