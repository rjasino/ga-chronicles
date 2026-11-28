# Data Model: Wheel of Names Fallback Draw

**Feature**: `014-wheelofnames-fallback`  
**Date**: 2026-11-28

## Schema Changes

### 1. `public.go_force_page_settings` (Modified)

Global Go Force configuration singleton (`id = true`).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `wheel_fallback_enabled` | `boolean` | `not null default false` | Global default for whether new sessions start with Wheel of Names fallback enabled. |

### 2. `public.go_force_sessions` (Modified)

Per-session Go Force state.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `wheel_fallback_enabled` | `boolean` | `not null default false` | Whether this session currently bypasses Wheel of Names and draws from the pre-randomized fallback queue. Initialized from `go_force_page_settings.wheel_fallback_enabled` on creation; toggleable in `ready` and `live` states. |

### 3. `public.go_force_rounds` (Modified)

Per-round state within a session.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `fallback_queue` | `uuid[]` | `not null default '{}'::uuid[]` | Pre-randomized ordered array of remaining `session_game_id`s for fallback draws in this round. Server-only; never exposed to players or facilitator UI before a game is popped. |

---

## Relationships & State Transitions

```text
go_force_page_settings (wheel_fallback_enabled)
        │
        │ copies default on go_force_create_session
        ▼
go_force_sessions (wheel_fallback_enabled)
        │
        │ toggled via go_force_set_wheel_fallback (allowed in 'ready' | 'live')
        ▼
go_force_rounds (fallback_queue uuid[])
        │
        │ lazily shuffled from remaining un-drawn games on first fallback draw,
        │ filtered against remaining un-drawn games, head [1] popped & committed
        ▼
go_force_selections (round_id, session_game_id, selection_order)
```

---

## Validation & Integrity Rules

1. **Authorization**:
   - Updating `go_force_page_settings.wheel_fallback_enabled` requires `admin` role.
   - Toggling `go_force_sessions.wheel_fallback_enabled` requires `go_force_is_facilitator(session_id)` (session `game_master_id` or `admin`).
   - Executing `go_force_draw_fallback_selection` requires `go_force_is_facilitator(session_id)`.
2. **Session & Round State**:
   - `go_force_sessions.wheel_fallback_enabled` can only be toggled when `status in ('ready', 'live')`.
   - `go_force_draw_fallback_selection` requires `status = 'live'`, an active `go_force_rounds` row, no open selection (`voting_closed_at is null`), and at least one remaining eligible game for that round.
3. **Queue Hygiene**:
   - Any game ID in `fallback_queue` that has already been selected in the active round (e.g., via Wheel of Names before toggling fallback on) is stripped before popping.
   - Popped game IDs are removed from `fallback_queue` and inserted into `go_force_selections` atomically in the same transaction.
   - `fallback_queue` is never returned in player-facing queries or facilitator props.
