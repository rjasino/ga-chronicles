# Bug Fix: Go Force navigation, voting timer, and game details

- **Slug**: go-force-voting
- **Fixed**: 2026-11-21
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Added role- and visibility-aware Go Force navigation, animated server-selected roulette presentation, configurable round and final-ballot timers (10-second defaults), and optional game metadata with uploaded or URL-based cover art. Database deadlines enforce late-vote rejection and allow a rostered participant to trigger timeout closure; game details are snapshotted for active sessions.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `supabase/migrations/0012_go-force-voting-details.sql` | added | Adds metadata and timer columns, a public cover-art bucket with admin-only upload, detail/deadline triggers, late-vote enforcement, and timeout RPCs. |
| `apps/web/src/components/site-header.tsx` | modified | Adds the Go Force navigation link. |
| `apps/web/src/features/go-force/navigation.ts` | added | Shows the link to admins always and to rostered users only when a session is active and page visibility is on. |
| `apps/web/src/features/go-force/access.ts` | modified | Adds the navigation visibility rule. |
| `apps/web/src/components/go-force/admin-controls.tsx` | modified | Adds separate timer settings and optional metadata, URL, and upload fields to game entry forms. |
| `apps/web/src/features/go-force/admin-actions.ts` | modified | Validates and saves timer and game metadata; validates and uploads JPEG/PNG/WebP cover art. |
| `apps/web/src/features/go-force/admin-schemas.ts` | modified | Adds timer, optional metadata, and HTTP(S) cover URL validation. |
| `apps/web/src/features/go-force/admin-queries.ts` | modified | Loads timer settings and defaults. |
| `apps/web/src/features/go-force/game-covers.ts` | added | Defines the Go Force cover bucket and upload size limit. |
| `apps/web/src/features/go-force/types.ts` | modified | Adds metadata snapshots and deadline/settings fields. |
| `apps/web/src/features/go-force/session-queries.ts` | modified | Includes snapshot metadata in finalist data. |
| `apps/web/src/features/go-force/game-actions.ts` | modified | Adds the round-vote timeout action. |
| `apps/web/src/features/go-force/ballot-actions.ts` | modified | Adds the final-ballot timeout action. |
| `apps/web/src/components/go-force/game-details-card.tsx` | added | Displays game details and cover art with missing-data fallbacks. |
| `apps/web/src/components/go-force/roulette-reveal.tsx` | added | Provides a CSS roulette animation around the persisted server choice; honors reduced-motion styling. |
| `apps/web/src/components/go-force/voting-countdown.tsx` | added | Displays countdowns and invokes server-side expiry actions, retrying on clock skew. |
| `apps/web/src/components/go-force/facilitator-session.tsx` | modified | Adds roulette, details cards, and round/final countdowns to the facilitator view. |
| `apps/web/src/components/go-force/player-session.tsx` | modified | Adds details cards and round/final countdowns to the player view. |
| `apps/web/src/app/globals.css` | modified | Adds the branded wheel animation and styling. |
| `apps/web/src/features/go-force/rules.ts` | modified | Preserves metadata when adding finalist vote totals. |
| `apps/web/tests/unit/go-force/access.test.ts` | modified | Covers admin, participant, visibility, and active-session navigation rules. |
| `apps/web/tests/unit/go-force/admin-schemas.test.ts` | modified | Covers optional metadata, URL validation, and configurable timer bounds. |
| `apps/web/tests/unit/go-force/game-details-card.test.tsx` | added | Covers metadata rendering and missing-art/details fallbacks. |
| `apps/web/tests/unit/go-force/voting-countdown.test.tsx` | added | Covers separate expiry actions for round and final-ballot timers. |
| `apps/web/tests/e2e/go-force-admin.spec.ts` | modified | Covers admin navigation while hidden, player navigation access, game metadata, URL art, and upload. |
| `apps/web/tests/e2e/go-force-session.spec.ts` | modified | Checks the roulette reveal and player metadata fallback during the session journey. |
| `supabase/tests/database/go-force-voting-timers.test.sql` | added | Covers defaults, configured deadlines, metadata snapshots, late-vote rejection, and timeout closure. |

## Diff Highlights

- Both timer settings default to 10 seconds; admin configuration accepts 5–600 seconds.
- A timer deadline is written by Postgres when a game is drawn or the final ballot opens. The database rejects submissions at or after that deadline.
- Admins always see Go Force in navigation. Non-admin participants need an active roster/session and visible page settings.
- Uploaded game covers use a separate public-read bucket; uploads are admin-only and limited to validated JPEG, PNG, or WebP files up to 10 MiB.

## Tests Added or Updated

- `apps/web/tests/unit/go-force/access.test.ts` — pins down navigation visibility.
- `apps/web/tests/unit/go-force/admin-schemas.test.ts` — validates optional fields, cover URLs, and timer settings.
- `apps/web/tests/unit/go-force/game-details-card.test.tsx` — verifies metadata and fallback rendering.
- `apps/web/tests/unit/go-force/voting-countdown.test.tsx` — verifies the round and final-ballot expiry actions remain separate.
- `apps/web/tests/e2e/go-force-admin.spec.ts` — adds navigation, visibility, metadata, and cover-art journeys.
- `apps/web/tests/e2e/go-force-session.spec.ts` — checks roulette presentation and the player’s no-metadata fallback.
- `supabase/tests/database/go-force-voting-timers.test.sql` — covers database defaults, configurable deadlines, snapshot immutability, and expiry rules.

## Local Verification

- Commands run: `npm run typecheck` → pass.
- Commands run: `npm run test:unit` → pass, 193 tests across 29 files.
- Commands run: `npm run lint` → pass.
- Commands run: `npm run build` → pass on retry. Next.js 16.4.3 emitted a known-security-vulnerability upgrade reminder.
- Commands run: `git diff --check` → pass.
- Manual checks: `npm run supabase:status` → local Supabase services are stopped. Database and Playwright E2E suites were not run because they require those services.

## Deviations from Assessment

None. The roulette uses CSS rather than a third-party package; it only reveals the game already selected by the server.

## Follow-ups

- Run `/speckit.bug.test slug=go-force-voting` with local Supabase running to apply the migration and execute the database and Playwright suites.
- Successfully uploaded cover objects are retained when a game is replaced or removed, so existing session snapshots cannot lose their art. Add reference-aware cleanup later if storage growth warrants it.
- Upgrade Next.js to a version without the security advisory. No dependency upgrade was applied as part of this Go Force fix.
