# Research: Wheel of Names Fallback Draw

**Feature**: `014-wheelofnames-fallback`  
**Date**: 2026-11-28

## Research Summary

No unresolved `[NEEDS CLARIFICATION]` markers remain from the specification. The codebase inspection of `apps/web/src/features/go-force/` and `supabase/migrations/0011`–`0016` resolved all architectural integration questions.

---

## Decision 1: Where to Store the Fallback Mode Setting

**Decision**: Store `wheel_fallback_enabled` (boolean, default `false`) on **both** `go_force_page_settings` (global default configurable in `/admin/go-force`) and `go_force_sessions` (per-session setting initialized from `go_force_page_settings` at session creation and toggleable in both `ready` and `live` states by the session's game master or an admin).

**Rationale**:
- Admins manage global Go Force settings in `/admin/go-force` (`go_force_page_settings`), while game masters (who may not hold the `admin` role) facilitate live sessions at `/go-force/session/[sessionId]`.
- Having `wheel_fallback_enabled` on `go_force_sessions` allows a game master or admin to toggle fallback mode directly on the session screen before starting (`ready`) or mid-game (`live`) without leaving the live session or affecting future unrelated sessions.
- Having `wheel_fallback_enabled` on `go_force_page_settings` allows admins to set the default ahead of time in Settings, and optionally apply it when configuring the system before a session is created.

**Alternatives Considered**:
- *Global-only setting in `go_force_page_settings`*: Would prevent non-admin game masters from toggling fallback mode mid-game during a live session. Rejected.
- *Client-side localStorage / React state only*: Would desynchronize across page reloads, multiple facilitators, and server actions. Rejected.

---

## Decision 2: Where and How to Persist the Pre-Randomized Remaining List

**Decision**: Persist `fallback_queue uuid[]` on `go_force_rounds` (default `'{}'`, `not null`) and manage initialization, synchronization, and popping inside a `SECURITY DEFINER` Postgres RPC (`go_force_draw_fallback_selection`).

**Rationale**:
- Next.js Server Actions are stateless across requests; persisting the pre-randomized queue on `go_force_rounds` guarantees consistency across page refreshes, server restarts, and multiple facilitators.
- Performing the queue check, lazy shuffle (when empty), pop (`queue[1]`), and selection commit inside a single Postgres transaction with `FOR UPDATE` row locking prevents race conditions, duplicate pops, or out-of-sync state if Wheel of Names was used for earlier draws in the same round.
- Keeping `fallback_queue` server-only (never selected in player queries or exposed in facilitator UI props) ensures upcoming games remain undisclosed until drawn (FR-005).

**Alternatives Considered**:
- *In-memory array in Node.js*: Lost on serverless cold starts or restarts, and not shared across instances. Rejected.
- *Two-step pop then separate commit RPC*: Risks a game being popped from `fallback_queue` but never committed to `go_force_selections` if the browser closes mid-flight. Atomic pop-and-commit eliminates this failure mode.

---

## Decision 3: Queue Synchronization When Toggling Mid-Round or Mixing Providers

**Decision**: On each fallback draw, filter `go_force_rounds.fallback_queue` against the round's current eligible un-drawn `session_game_id`s. If the filtered queue is empty, pre-randomize all remaining eligible un-drawn `session_game_id`s (`ORDER BY random()`) and store them in `fallback_queue`, then pop the first element (`[1]`), persist the tail (`[2:]`), and insert the `go_force_selections` row.

**Rationale**:
- If a round starts with Wheel of Names, draws 3 games, and then switches to fallback mode (manually or automatically), `fallback_queue` is initialized with only the remaining un-drawn games.
- If fallback mode is toggled off, 1 game is drawn via Wheel of Names, and fallback mode is toggled back on, filtering `fallback_queue` against remaining un-drawn games ensures the Wheel-drawn game is skipped and never drawn twice.

**Alternatives Considered**:
- *Re-shuffling on every draw*: Does not match the requested pre-randomize-once-and-pop model and requires re-shuffling on every turn. Rejected.

---

## Decision 4: Detecting "Wheel of Names Is Unreachable" and Automatic Fallback

**Decision**: In `drawGoForceSelection` (`apps/web/src/features/go-force/game-actions.ts`), when `wheel_fallback_enabled` is `false`, call `spinWheelOfNames`. Catch `WheelOfNamesError` (and unexpected network/timeout errors—excluding configuration/empty-list validation errors that should still surface as errors) and automatically invoke `go_force_draw_fallback_selection`, returning `{ selectionId, gameId, title, fallbackUsed: true, fallbackReason: "unreachable" }` and broadcasting the session update.

**Rationale**:
- Directly satisfies FR-003 ("prevent the game from not proceeding as wheelofnames cannot be used") without requiring manual intervention during a live outage.
- Still logs the original `WheelOfNamesError` via `reportFailure` so developers/admins have observability into Wheel of Names outages.
- When `wheel_fallback_enabled` is `true`, `spinWheelOfNames` is skipped completely, avoiding any 30-second timeout delay.

**Alternatives Considered**:
- *Show an error and require a second click to "Use Fallback"*: Adds friction during a live event, though still possible if desired. Auto-fallback with a clear UI notice provides the smoothest live-event continuity.
