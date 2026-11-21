# Data Model: Wheel of Names Voting

## Scope

This is a conceptual model for replacing the source of a Go Force game draw. Supabase remains authoritative for the eligible pool, committed selections, and ballots. The Wheel of Names API request and response are transient and are not stored as a second game-state system.

## Entities

### Annual Eligible-Game Entry

Represents an administrator-maintained game entry for a GOTY year.

- **Fields**: `id`, `goty_year`, `title`, `eligibility_state`, display order, and optional game details.
- **Validation**: `eligibility_state` is `eligible` or `ineligible`; only `eligible` entries are copied into a newly started session. Drawing a game does not alter or delete the annual entry.
- **Relationships**: may be referenced by a Session Game Snapshot; session snapshots can remain available when an annual entry is later edited or removed.

### Session Game Snapshot

Represents a title copied into a Go Force session when it starts.

- **Fields**: `id`, `session_id`, source annual game (when available), `title_snapshot`, descriptive-field snapshots, source year, display order.
- **Validation**: the snapshot is fixed for the session; `title_snapshot` is unique within a session.
- **Relationships**: belongs to one session; may be selected once in each round for which it is eligible.

### Round

Represents one of the three Go Force game-selection stages.

- **Fields**: `id`, `session_id`, `round_number`, status, `go` allowance, start and end times.
- **Derived `candidate_pool`**: Round 1 uses all session game snapshots; later rounds use games advanced from the immediately prior round.
- **Derived `remaining_pool`**: the round candidate pool minus games with a committed selection in that round.
- **Validation**: rounds start in order and advance using the existing Go Force rules.

### Wheel of Names Spin Request/Response

Represents one transient request to the provider's animation endpoint.

- **`request.wheelConfig.entries[].id`**: the session-game UUID for one game in the current `remaining_pool`.
- **`request.wheelConfig.entries[].text`**: the exact `Session Game Snapshot.title_snapshot` for that UUID.
- **`request.wheelConfig.autoRemoveWinner`**: `true`, so the generated provider animation removes the winner after the spin.
- **`response.animation`**: required base64-encoded animation returned by the provider's default JSON response.
- **`response.winner.id`**: required entry ID that maps to one session-game UUID in the current `remaining_pool`.
- **`response.winner.text`**: required display title; it must match the corresponding `Session Game Snapshot.title_snapshot`.
- **Validation**:
  - `request.wheelConfig.entries` contains only the active round's current `remaining_pool`.
  - `response.winner.id` must match one game in the active round's remaining pool.
  - `response.winner.text` must match the snapshot for that ID.
  - Invalid or incomplete responses do not create a Game Selection.
- **Lifecycle**: discarded after the result is validated and committed or the request fails. The next request is rebuilt from current Go Force state.
- **Credential**: the API key is read from server environment configuration and is never included in this entity or response sent to the browser.

### Game Selection

Represents a successfully completed provider draw, persisted by Go Force.

- **Fields**: `id`, `round_id`, `session_game_id`, `selection_order`, `selected_at`, `voting_deadline_at`, `voting_closed_at`, `advancement_outcome`.
- **Validation**:
  - `round_id` must identify the active round; the database transition verifies facilitator authorization, session status, and no currently open selection.
  - `session_game_id` must identify a game in the round's current `candidate_pool` that is not already selected in that round.
  - `selection_order` is positive and unique within its round.
  - `voting_closed_at` remains null while a selection ballot is open; another selection cannot be committed during that interval.
  - A game can be selected no more than once in the same round.
- **Relationships**: has one expected game-vote opportunity per rostered player.

### Game Vote

Represents an existing player's `go`, `no-go`, or abstention for one persisted selection.

- **Fields and rules**: unchanged from `specs/009-go-force-goty/data-model.md`.
- **Relationship**: references the committed Game Selection; no vote exists for an invalid or uncommitted provider result.

## State Transitions

```text
round ready
   -> provider spin requested
      -> provider error / invalid winner -> round unchanged; retry permitted
      -> valid winner -> database selection committed
                         -> title revealed and ballot open
                         -> ballot closed (existing Go Force transitions)
```

- A provider result is not a Go Force selection until the database accepts it.
- The next WheelConfig is built from the active round's remaining pool, so committed titles are excluded from later draws.
- A later round may include a previously selected title if it advanced under the existing rules; removal is round-scoped.

## Relationships Summary

- One **Go Force Session** has ordered **Rounds** and a fixed set of **Session Game Snapshots**.
- One **Round** has zero or more **Game Selections** and a derived candidate/remaining pool.
- One **Wheel of Names Spin Request/Response** refers to the current remaining pool and may produce one candidate **Game Selection**.
- One **Game Selection** references one **Session Game Snapshot** and has one **Game Vote** opportunity per participant.
- The Wheel of Names API key is configuration, not persisted game/session data.
