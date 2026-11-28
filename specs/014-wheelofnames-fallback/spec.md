# Feature Specification: Wheel of Names Fallback Draw

**Feature Branch**: `014-wheelofnames-fallback`

**Created**: 2026-11-28

**Status**: Draft

**Input**: User description: "Create a fallback feature when wheelofnames if unreachable. this is to prevent the game for not proceeding as wheelofnames is cannot be use. The way to do it is to pre randomize the remaining list, and then pop each element from the randomize list or array. This feature can be toggle in the settings during the game or even before the start so we can facilitate the game even without relying on wheelofnames."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toggle fallback draw mode in settings before or during a game (Priority: P1)

An authorized facilitator (admin or game master) enables or disables the fallback draw mode in session settings either before a Go Force session begins or while a round is already in progress, allowing the session to be facilitated without relying on Wheel of Names.

**Why this priority**: Giving the facilitator explicit control in settings ensures the event can be run smoothly even when Wheel of Names is known to be unavailable or unreliable beforehand or mid-session.

**Independent Test**: Toggle the fallback setting on before starting a session and run draws; also start a session with Wheel of Names active, draw at least one game, toggle fallback mode on mid-round, and verify subsequent draws come from the remaining games without restarting the session or duplicating already-drawn games.

**Acceptance Scenarios**:

1. **Given** a session has not yet started, **When** an authorized facilitator enables fallback mode in settings and starts the session, **Then** draws for the round proceed using the pre-randomized draw queue without contacting Wheel of Names.
2. **Given** an active round where one or more games have already been drawn, **When** an authorized facilitator enables fallback mode in settings mid-game, **Then** the session continues without restarting, and only the remaining un-drawn games for that round are included in the fallback draw queue.
3. **Given** fallback mode is enabled mid-game while a game's ballot is open, **When** the setting is changed, **Then** the open ballot and its existing votes remain intact and the next draw uses fallback mode only after the current ballot closes.
4. **Given** fallback mode is enabled, **When** an authorized facilitator disables it in settings, **Then** subsequent draws return to using Wheel of Names for the remaining un-drawn games in the round.

---

### User Story 2 - Automatic fallback when Wheel of Names is unreachable (Priority: P1)

When Wheel of Names is the active draw provider and becomes unreachable during a draw attempt, the system falls back to drawing from a pre-randomized queue of the round's remaining games so the game is not blocked from proceeding.

**Why this priority**: Preventing a live event from stalling when an external service fails is the primary business need for this feature.

**Independent Test**: Start a round with Wheel of Names active, simulate Wheel of Names being unreachable during a draw, and verify that a valid remaining game is drawn from the pre-randomized queue, revealed to all participants, removed from the remaining list, and opened for voting.

**Acceptance Scenarios**:

1. **Given** an active round with fallback mode turned off and remaining games available, **When** the game master initiates a draw and Wheel of Names is unreachable, **Then** the system draws the next game from a pre-randomized queue of the round's remaining games, reveals it to the game master and players, and opens voting for that game.
2. **Given** a draw succeeds via automatic fallback, **When** the game master views the draw result, **Then** the interface clearly indicates that the fallback draw was used because Wheel of Names was unreachable.
3. **Given** a draw occurs via automatic fallback, **When** the selected game is revealed, **Then** it is removed from the active round's remaining games and cannot be drawn again in that round.

---

### User Story 3 - Draw games sequentially from a pre-randomized remaining list (Priority: P2)

Whenever fallback drawing is active, the system pre-randomizes the active round's remaining games into an ordered queue and pops one game at a time per draw, preserving fairness and all existing Go Force voting and round rules.

**Why this priority**: Pre-randomizing the remaining list and popping elements one by one guarantees uniform, non-repeating selection without spoilers and matches existing round behavior.

**Independent Test**: Enable fallback mode for a round with multiple games, execute consecutive draws until the round list is exhausted, and verify that each game is drawn at most once, no upcoming order is exposed before its draw, and round-ending rules apply when the queue is empty.

**Acceptance Scenarios**:

1. **Given** fallback drawing is initialized for a set of remaining games, **When** consecutive draws are triggered, **Then** each draw pops and removes the next game from the pre-randomized queue until no games remain.
2. **Given** a pre-randomized queue exists for the active round, **When** players or the game master view the active session before a draw is triggered, **Then** the upcoming order of games in the queue is not disclosed.
3. **Given** a game is drawn from the fallback queue and its ballot is open, **When** the game master attempts to draw again, **Then** the system prevents the next draw until the current ballot is closed.
4. **Given** the last game in the pre-randomized queue has been drawn and closed, **When** no remaining games exist in the round, **Then** no further draws can be initiated and existing Go Force round-ending rules apply.

---

### Edge Cases

- What happens when fallback mode is toggled on and off multiple times within the same round? Each time fallback drawing is needed, the pre-randomized queue reflects only the games still remaining in the active round, never re-adding games already drawn earlier in that round.
- What happens when a new round begins (with advancing games) while fallback mode is enabled? A fresh pre-randomized queue is generated from the new round's eligible games.
- What happens when only one game remains in the round and Wheel of Names is unreachable or fallback mode is enabled? That single remaining game is drawn, removed from the round's remaining list, and opened for voting normally.
- What happens when no games remain in the round and a draw is attempted in fallback mode? The system prevents the draw and applies the existing round-ending behavior.
- What happens when two facilitators or repeated draw actions trigger simultaneously while in fallback mode? Only one game is popped and opened for voting; duplicate draws are prevented while a ballot is open.
- What happens to the annual eligible-game list when games are popped from the fallback queue? Only the active round's remaining list is reduced; the annual eligible-game list remains unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a setting that allows an authorized facilitator (admin or game master) to toggle Wheel of Names fallback mode on or off before a session starts and during an active session.
- **FR-002**: When fallback mode is toggled on, the system MUST perform game draws using the fallback mechanism without requiring Wheel of Names to be reachable.
- **FR-003**: When fallback mode is toggled off and Wheel of Names is unreachable during a draw attempt, the system MUST automatically fall back to the fallback draw mechanism so the round can continue without stalling.
- **FR-004**: When fallback drawing is used, the system MUST pre-randomize the active round's remaining un-drawn games into an ordered draw queue and pop (select and remove) the next single game from that queue on each draw.
- **FR-005**: The system MUST keep the order of un-drawn games in the pre-randomized queue undisclosed to players and facilitators until each game is drawn.
- **FR-006**: Each game popped from the pre-randomized queue MUST be removed from the active round's remaining games so it cannot be selected again in that round, while leaving the annual eligible-game list unchanged.
- **FR-007**: Toggling fallback mode mid-game MUST NOT restart the session, alter already-recorded draws or votes, or disrupt an open ballot; any active remaining-games set MUST carry over accurately.
- **FR-008**: When a draw is completed via fallback (whether toggled manually or triggered automatically due to Wheel of Names being unreachable), the system MUST reveal the selected game to the game master and all active players and open voting under existing Go Force rules.
- **FR-009**: The system MUST prevent a new fallback draw from occurring while a game's ballot is still open or when no remaining games exist in the active round.
- **FR-010**: The system MUST clearly indicate to the facilitator when fallback mode is active or when an automatic fallback draw occurred due to Wheel of Names being unreachable.
- **FR-011**: Each fallback draw and its resulting votes MUST be recorded in the session history identically to a Wheel of Names draw.

### Key Entities *(include if feature involves data)*

- **Fallback Draw Setting**: A session-level configuration toggle indicating whether draws should bypass Wheel of Names and use the local pre-randomized queue directly.
- **Randomized Draw Queue**: An ordered, pre-shuffled sequence of the active round's remaining un-drawn games from which one game is popped per draw.
- **Active Round Remaining Games**: The set of games eligible for the current Go Force round that have not yet been drawn in that round.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of simulated Wheel of Names outages during a draw, the session proceeds without stalling by drawing a valid remaining game and opening its ballot.
- **SC-002**: In 100% of rounds facilitated with fallback mode enabled, every remaining game is drawn at most once per round and the round completes without relying on Wheel of Names.
- **SC-003**: Facilitators can toggle fallback mode on or off in settings both before a session starts and mid-round in under 5 seconds without losing any existing round state, draws, or votes.
- **SC-004**: 100% of participants see the same drawn game and can submit their `go` or `no-go` votes regardless of whether the game was drawn via Wheel of Names or the fallback queue.

## Assumptions

- "Wheel of Names is unreachable" includes network timeouts, connection failures, service unavailability, or provider errors that prevent a draw from completing.
- Automatic fallback occurs when Wheel of Names fails during a draw attempt even if the manual fallback toggle is off, and the facilitator is notified that fallback was used; toggling the setting on proactively bypasses Wheel of Names altogether.
- Only authorized facilitators (admins or game masters) can view or change the fallback draw setting; players cannot toggle it.
- Existing Go Force rules—including round advancement, one `go`/`no-go` vote per player, ballot open/close lifecycle, and session history—remain unchanged.
