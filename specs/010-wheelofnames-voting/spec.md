# Feature Specification: Wheel of Names Voting

**Feature Branch**: `N/A`

**Created**: 2026-11-21

**Status**: Draft

**Input**: User description: "Instead of creating our own roulette let's use `wheelofnames` api. Refer to this docs: https://wheelofnames.stoplight.io/ The idea is that after spinning the roulette that's the time the name will be shown and players can start voting. Use the functionality of removing the game on the list."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Draw and vote on a game (Priority: P1)

During a live Go Force round, the game master spins the Wheel of Names roulette. Players see which game was selected only after the spin completes; voting for that game then becomes available.

**Why this priority**: This is the core transition from selecting a game to collecting player votes.

**Independent Test**: Start a round with multiple eligible games, complete a spin, and verify that the result is revealed to all players and the ballot for that same game becomes available only after the spin finishes.

**Acceptance Scenarios**:

1. **Given** an active round with games remaining, **When** the game master starts a spin, **Then** no game is treated as selected and no player can vote until the spin completes.
2. **Given** the spin completes with a valid game, **When** the result is revealed, **Then** the game master and all players see the same selected game and players can submit their existing `go` or `no-go` votes for it.
3. **Given** voting is open for the selected game, **When** the game master attempts another spin, **Then** the current ballot must be closed before another game can be selected.

---

### User Story 2 - Remove drawn games from the active round (Priority: P1)

The game master uses the roulette's removal behavior so a game that has been drawn is no longer in that round's available list, while the annual eligible-game list remains intact.

**Why this priority**: Removing a drawn game prevents repeat selections without changing the source list used for administration or other rounds.

**Independent Test**: Draw a game from an active round, confirm it is removed from that round's remaining list, and verify it is still present in the annual eligible-game list.

**Acceptance Scenarios**:

1. **Given** a valid game is drawn, **When** the result is committed, **Then** that game is removed from the active round's remaining roulette entries and cannot be drawn again in that round.
2. **Given** a game has been removed from the active round after a draw, **When** an admin views the annual eligible-game list, **Then** the game remains there unless an admin separately removes it.
3. **Given** a spin fails or returns no valid game, **When** the game master retries, **Then** no game has been removed and no ballot has opened for the failed attempt.

### Edge Cases

- The active round has no remaining games. The roulette cannot start another spin, and the existing Go Force round-ending rules apply.
- The active round has one remaining game. A valid spin reveals it, removes it from the current round list, and opens its ballot normally.
- The roulette does not complete, returns no result, or returns a game that is not in the active round's remaining list. No result is revealed, no ballot opens, and the remaining list is unchanged; the game master can retry or recover the session.
- Players reconnect during a spin or an open ballot. They see the same current round state and selected game as the game master; they cannot vote before the result is revealed.
- A later round includes a game that was selected in an earlier round, if that game advanced under the existing Go Force rules. Removal applies to the current round only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST use Wheel of Names as the roulette provider, as requested, rather than create a separate custom roulette.
- **FR-002**: The roulette MUST contain only games eligible for the active round and not yet selected in that round.
- **FR-003**: The system MUST keep the current game result undisclosed and player voting unavailable until the spin completes successfully.
- **FR-004**: After a successful spin, the system MUST reveal the selected game consistently to the game master and all players in the active session and make voting available for that game.
- **FR-005**: After a successful draw, the system MUST remove the selected game from the active round's remaining roulette entries and MUST NOT offer it for selection again in that round.
- **FR-006**: Removing a game from the active round's roulette MUST NOT remove it from the annual eligible-game list or change the session's original eligibility snapshot.
- **FR-007**: The system MUST preserve the existing Go Force vote rules for each selected game, including one `go` or `no-go` vote per player and the established voting-close behavior.
- **FR-008**: The system MUST prevent another game from being drawn while the current game's ballot remains open.
- **FR-009**: If a spin fails, produces no result, or produces a game outside the active round's remaining list, the system MUST leave the active list and voting state unchanged and allow the game master to retry or recover without recording a selection.
- **FR-010**: The system MUST retain each successful draw and its associated votes in the session's history, even after the title is removed from the active round list.

### Key Entities *(include if feature involves data)*

- **Active Round Roulette**: The remaining eligible games available for selection in one Go Force round.
- **Game Draw**: A successfully completed spin that identifies one game for the active round and its ballot.
- **Game Vote**: A player's existing `go` or `no-go` response associated with the revealed game and active round.
- **Annual Eligible-Game List**: The administrator-maintained source list, which is distinct from the active round's remaining roulette entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of observed draws, the selected game is not revealed as the current selection and voting remains unavailable until the spin completes successfully.
- **SC-002**: In 100% of successful draws, all active players and the game master see the same selected game and the ballot is for that game.
- **SC-003**: No successfully drawn game appears again in the same round's remaining roulette entries, while the annual eligible-game list remains unchanged by the draw.
- **SC-004**: In 100% of failed or invalid spin attempts, no game is removed, no ballot opens, and the game master can retry without creating a duplicate selection.
- **SC-005**: At least 90% of players in a live rehearsal can identify the revealed game and submit their vote without facilitator correction.

## Assumptions

- Wheel of Names API v3 is the required roulette provider. Its documented spin operation and response are described in the feature plan; the user will supply the API key before a live provider-backed rehearsal.
- The API key is a server-only secret. `apps/web/.env.example` will document a blank `WHEEL_OF_NAMES_API_KEY` placeholder and will not contain a live key.
- “Remove the game on the list” means removing a successfully drawn game from the active round's remaining roulette entries, not deleting it from the admin-managed annual eligible-game list.
- Existing Go Force rules remain unchanged, including the fixed game-list snapshot, round advancement, voting allowances, final ballot, and results publication.
- A spin that does not produce a valid result must fail safely: players cannot vote and the active round list remains unchanged until a valid draw is confirmed.
- The game master initiates each spin and controls when the corresponding ballot is closed, consistent with the existing live-session flow.
