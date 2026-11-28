# Interface Contracts: Wheel of Names Fallback Draw

**Feature**: `014-wheelofnames-fallback`  
**Date**: 2026-11-28

## 1. Database RPCs (Supabase Postgres)

### `public.go_force_set_wheel_fallback(target_session uuid, fallback_enabled boolean)`

- **Authorization**: Authenticated user passing `public.go_force_is_facilitator(target_session)`. Raises `NOT_AUTHORIZED` otherwise.
- **Preconditions**: Session exists (`SESSION_NOT_FOUND`) and `status in ('ready', 'live')` (`SESSION_NOT_LIVE`).
- **Behavior**: Updates `go_force_sessions.wheel_fallback_enabled = fallback_enabled` and `updated_at = now()`.
- **Returns**: `boolean` (the persisted `wheel_fallback_enabled` value).

### `public.go_force_draw_fallback_selection(target_session uuid)`

- **Authorization**: Authenticated user passing `public.go_force_is_facilitator(target_session)`. Raises `NOT_AUTHORIZED` otherwise.
- **Preconditions**:
  - Session exists and `status = 'live'`.
  - Active round exists (`NO_ACTIVE_ROUND`).
  - No open ballot exists (`OPEN_BALLOT`).
  - At least one eligible game remains un-selected in the active round (`NO_REMAINING_GAMES`).
- **Behavior**:
  1. Locks the session and active round (`FOR UPDATE`).
  2. Computes eligible un-drawn `session_game_id`s for the active round (Round 1: all `go_force_session_games` not yet in `go_force_selections` for this round; Round > 1: games with `advancement_outcome = 'advanced'` in `round_number - 1` not yet in `go_force_selections` for this round).
  3. Filters `active_round.fallback_queue` to keep only IDs present in the remaining eligible set, preserving order.
  4. If the filtered queue is empty, shuffles the remaining eligible IDs (`ORDER BY random()`).
  5. Pops `queue[1]` as `chosen_game_id` and persists `queue[2:]` back to `go_force_rounds.fallback_queue`.
  6. Inserts a new row into `go_force_selections` with `selection_order = coalesce(max(selection_order), 0) + 1`.
- **Returns** (`jsonb`):
  ```json
  {
    "selectionId": "uuid",
    "gameId": "uuid",
    "title": "string",
    "selectionOrder": 1,
    "round": 1
  }
  ```

---

## 2. Server Actions (`apps/web/src/features/go-force/`)

### `saveGoForceVotingSettings` / `saveGoForceWheelFallbackSetting` (`admin-actions.ts`)

- Accepts `wheelFallbackEnabled` (`"on"` -> `true`, otherwise `false`) in `/admin/go-force` settings.
- Persists `wheel_fallback_enabled` to `go_force_page_settings`.

### `setGoForceWheelFallback` (`session-actions.ts`)

- **Input (`FormData`)**: `sessionId` (UUID), `wheelFallbackEnabled` (`"true"` | `"false"` | `"on"`).
- **Behavior**: Verifies session & facilitator role, calls `go_force_set_wheel_fallback`, broadcasts `publishGoForceSessionUpdate(sessionId)`.
- **Output (`SessionActionState`)**: `{ success, error?, wheelFallbackEnabled? }`.

### `drawGoForceSelection` (`game-actions.ts`)

- **Behavior**:
  - Checks `view.session.wheel_fallback_enabled`:
    - If `true`: Skips `spinWheelOfNames`, calls `go_force_draw_fallback_selection`, broadcasts `publishGoForceSessionUpdate(sessionId)`, returns `{ selectionId, gameId, title, fallbackUsed: true, fallbackReason: "manual" }`.
    - If `false`: Calls `spinWheelOfNames`.
      - On success: returns `{ gameId, title, animation, animationFormat, animationDurationMs }` (existing Wheel of Names reveal flow).
      - On `WheelOfNamesError` (unreachable/timeout/HTTP/network error, excluding empty-entries error): logs failure via `reportFailure`, calls `go_force_draw_fallback_selection`, broadcasts `publishGoForceSessionUpdate(sessionId)`, returns `{ selectionId, gameId, title, fallbackUsed: true, fallbackReason: "unreachable" }`.
- **Extended `GameActionState` fields**:
  - `fallbackUsed?: boolean`
  - `fallbackReason?: "manual" | "unreachable"`

---

## 3. UI Contracts

- **Admin Settings (`AdminControls`)**: Checkbox `"Use pre-randomized fallback instead of Wheel of Names"` in Go Force settings.
- **Facilitator Session (`FacilitatorSession`)**:
  - Toggle control visible in `ready` and `live` states: `"Wheel of Names fallback mode"` with clear status text indicating whether draws will use Wheel of Names or the pre-randomized local queue.
  - When `drawGoForceSelection` returns `fallbackUsed: true`, display an informational `Message` banner explaining whether fallback mode was active or Wheel of Names was unreachable, and that voting is now open for the drawn game.
  - `DrawForm` button label reflects active mode (e.g., `"Draw next game (Fallback)"` when `wheel_fallback_enabled` is `true`, `"Spin the roulette"` when `false`).
