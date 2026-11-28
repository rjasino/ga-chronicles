# Quickstart Validation Guide: Wheel of Names Fallback Draw

**Feature**: `014-wheelofnames-fallback`  
**Date**: 2026-11-28

## Prerequisites

1. Local Supabase stack running (`npm run supabase:start` / `npm run supabase:reset` in `apps/web`) with the new migration applied.
2. Web app dependencies installed (`npm install` in `apps/web`).
3. An admin account and a Go Force session with at least 3 eligible games and 2 participants.

## Validation Scenarios

### 1. Pre-Game & Mid-Game Settings Toggle
1. Sign in as an admin and open `/admin/go-force`.
2. Toggle **"Use pre-randomized fallback instead of Wheel of Names"** on and save; verify it persists after page reload.
3. Create a new Go Force session and open `/go-force/session/[sessionId]`.
4. Verify the session's fallback toggle starts enabled in the `ready` state, then toggle it off before starting.
5. Start the session (`live`), draw 1 game via Wheel of Names, close its ballot, then toggle fallback mode **on** mid-round.
6. Verify the session does not restart and the remaining un-drawn games are intact.

### 2. Sequential Pop Without Repeats
1. With fallback mode enabled in a `live` round, click **Draw next game (Fallback)** repeatedly (closing each ballot in between) until all remaining games are exhausted.
2. Verify:
   - Each remaining game is drawn exactly once (no duplicates, no already-drawn games from earlier in the round).
   - No upcoming queue order is visible in the UI or network payload before a game is drawn.
   - Players see each drawn game and can submit `go` / `no-go` votes normally.
   - After the final game's ballot closes, round-ending / advancement rules trigger as expected.

### 3. Automatic Fallback When Wheel of Names Is Unreachable
1. Disable fallback mode in session settings (`wheel_fallback_enabled = false`).
2. Configure `WHEEL_OF_NAMES_API_URL` to an unreachable address (or simulate network failure in tests).
3. Click **Spin the roulette**.
4. Verify:
   - The draw succeeds via the pre-randomized fallback queue instead of failing/blocking the round.
   - The facilitator sees a clear notice that Wheel of Names was unreachable and fallback was used.
   - Voting opens immediately for the drawn game and all connected players see it.

## Automated Checks

Run from `apps/web`:
```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:database
npm run test:e2e
```
