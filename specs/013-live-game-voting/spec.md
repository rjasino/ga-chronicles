# Feature Specification: Live Game Voting

**Feature Branch**: `N/A`

**Created**: 2026-11-24

**Completed**: 2026-11-24

**Status**: Done

**Input**: User description: "Create the following features: - can add new player mid game

- add realtime update with user action
- make color coding on no-go and go vote
- on admin side, add a card for the list of games that will move to next round and how many vote for it"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Add a player during a live session (Priority: P1)

An authorized admin or game master adds a player after a Go Force session has started, so the player can participate without restarting the session.

**Why this priority**: A live event needs to recover gracefully when a participant arrives late or was accidentally omitted from the initial roster.

**Independent Test**: Start a session, add a unique player while it is active, and verify that the player can join the live session and vote on eligible open and future ballots without changing earlier results.

**Acceptance Scenarios**:

1. **Given** an active session and an authorized admin or game master, **When** they add a player not already in the session, **Then** the player is added without restarting the session and can see its current state.
2. **Given** a player is added while a game ballot is open, **When** the player joins before its voting deadline and closure, **Then** they can submit one vote on that ballot and participate in later eligible ballots under the existing round rules.
3. **Given** a player is added after a ballot or game has closed, **When** the session history is viewed, **Then** the player has no retroactive vote and is not recorded as having abstained on ballots before joining.
4. **Given** the session is not active, or the player is already on its roster, **When** an admin attempts to add that player, **Then** the change is rejected without creating a duplicate or changing the session.

---

### User Story 2 - See live session changes (Priority: P1)

Players, the game master, and admins see relevant session changes after a user action without manually refreshing, while individual votes remain private until the ballot closes.

**Why this priority**: Timely, consistent session state helps participants act on the same game, ballot, and roster during a live event.

**Independent Test**: Open the same active session on participant and admin screens, submit a vote and make a session or roster change, then verify the affected views update and private vote choices remain hidden until close.

**Acceptance Scenarios**:

1. **Given** connected users are viewing an active session, **When** a participant submits a vote or an authorized user changes the roster or session state, **Then** all relevant views reflect the committed change without a manual refresh.
2. **Given** a ballot is open, **When** a player submits a vote, **Then** that player sees their own submitted choice while other players' choices remain hidden.
3. **Given** a ballot is closed, **When** participants and the game master view its result, **Then** the committed group result is shown consistently to them.
4. **Given** a participant reconnects after losing their connection, **When** they return to the active session, **Then** they see the latest committed session state and cannot submit a duplicate vote for a ballot they already voted on.

---

### User Story 3 - Distinguish vote choices at a glance (Priority: P2)

Players and administrators can quickly distinguish “go” and “no-go” choices in voting controls and vote results.

**Why this priority**: Clear and consistent vote presentation reduces selection mistakes during a fast-moving live event.

**Independent Test**: Review the vote controls and results on player and admin screens in color and grayscale; verify each choice is identifiable from its label and visual treatment.

**Acceptance Scenarios**:

1. **Given** a player is choosing a vote, **When** the “go” and “no-go” choices are displayed, **Then** each has a distinct, consistent color and a visible text label.
2. **Given** a vote choice is shown in a result or session summary, **When** a user views it, **Then** the choice remains identifiable without relying on color alone.

---

### User Story 4 - Review games advancing to the next round (Priority: P2)

An admin reviews a session card listing games that have qualified to advance and the number of “go” votes each received.

**Why this priority**: The admin needs a clear, current summary of round outcomes to monitor progression and confirm which games qualify for the next round.

**Independent Test**: Close ballots with different “go” vote totals, then verify the admin card lists only qualifying games with accurate counts and reflects the round's completion status.

**Acceptance Scenarios**:

1. **Given** one or more game ballots have closed in the active round, **When** an admin views the session card, **Then** it lists each game with at least one “go” vote and shows that game's exact “go” vote count.
2. **Given** the active round is not complete, **When** the card lists qualifying games, **Then** it identifies them as advancing so far, not as a final round result.
3. **Given** the round is complete, **When** the admin views the card, **Then** it shows the confirmed games advancing to the next round, or a clear empty state if none qualify.
4. **Given** a game's ballot is still open, **When** the admin views the card, **Then** that game's vote count is not presented as a finalized advancement result.

### Edge Cases

- An admin attempts to add a player to a session that has ended or has not started; the roster remains unchanged.
- The same player is added twice, including through repeated actions; only one roster entry is retained.
- A player joins while a ballot is open, after it closes, or between games; participation starts at the join time and closed results remain unchanged.
- A player's join occurs after an open game's voting deadline but before timeout closure; they cannot vote on that expired ballot, but may participate in later eligible ballots.
- A player reconnects after missing one or more live updates; the current committed state is restored without duplicating votes or roster entries.
- No games in a completed round receive a “go” vote; the admin card shows no games advancing and the existing round-ending behavior remains in effect.
- A player uses a display mode that does not distinguish colors; “go” and “no-go” remain distinguishable by text and other visual cues.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST allow an authorized admin or game master to add a unique player to an active Go Force session without restarting it.
- **FR-002**: The system MUST reject attempts to add a player to an inactive session or add a player who is already on that session's roster.
- **FR-003**: A newly added player MUST be eligible to vote on the current game ballot only if they join before its existing voting deadline and closure, and on subsequent eligible ballots; a player added during the final ballot may submit it only before its existing deadline and closure. Existing voting rules and allowances still apply.
- **FR-004**: The system MUST NOT create or change votes for games or ballots that closed before a player joined; those prior opportunities MUST be distinguishable from abstentions.
- **FR-005**: The system MUST propagate committed vote, roster, and session-state changes to relevant connected users without requiring a manual refresh.
- **FR-006**: While a ballot is open, the system MUST show each player their own submitted vote and MUST keep other players' vote choices hidden; after close, it MUST show the group result consistently with existing Go Force rules.
- **FR-007**: When a user reconnects to an active session, the system MUST show the latest committed state and prevent duplicate votes or roster entries.
- **FR-008**: The system MUST present “go” and “no-go” choices with distinct, consistent colors and visible text labels; color MUST NOT be the only way to distinguish the choices.
- **FR-009**: The admin session card MUST list each game with a closed ballot that has at least one “go” vote and show the exact number of “go” votes for that game.
- **FR-010**: Before the round is complete, the admin card MUST identify listed games as advancing so far; after completion, it MUST identify confirmed advancing games or show that none advanced.
- **FR-011**: The admin card MUST NOT present an open ballot's votes as a finalized advancement result.
- **FR-012**: Adding a player MUST preserve the existing Go Force vote, advancement, round, and results rules; expected vote opportunities for that player begin when they join and do not include earlier closed ballots.

### Key Entities _(include if feature involves data)_

- **Session Participant**: A player on a live session roster, including when they joined and which voting opportunities are available to them.
- **Game Vote**: A participant's “go” or “no-go” choice for a selected game, with the existing ballot status and round context.
- **Session Update**: A committed change to the roster, vote, ballot, or session progression that relevant users need to see.
- **Round Advancement Summary**: The games with closed ballots that qualify to advance, their “go” vote counts, and whether advancement is provisional or confirmed.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In 100% of acceptance tests, an authorized admin can add a unique player to an active session without restarting it, and the player can participate only from their join time forward.
- **SC-002**: At least 95% of committed live-session actions appear on relevant connected screens within 2 seconds, without a manual refresh.
- **SC-003**: In 100% of tested ballot cases, the admin card's game list and “go” vote counts match the closed ballots and the existing advancement rule.
- **SC-004**: In 100% of tested color and grayscale views, users can distinguish “go” from “no-go” by visible labels without relying on color alone.
- **SC-005**: At least 90% of admins in a usability check can identify which games are advancing and their “go” vote counts within 10 seconds of viewing the card.

## Assumptions

- “Admin side” includes the authorized admin or game master managing the active Go Force session; regular players cannot change the roster.
- A player is identified using the existing participant identity and join conventions.
- A player added during a game ballot may vote on it if they join before its deadline and closure; a player added after that cutoff begins with subsequent eligible ballots. A player added during the final ballot may submit it before its deadline and closure.
- New players follow the same round-specific vote allowances as other participants from their join time onward. Earlier closed ballots are not counted as votes or abstentions for that player.
- A game advances when it receives at least one “go” vote, consistent with the existing Go Force rules.
- The advancement card summarizes closed ballots only; open-ballot vote choices remain hidden until the ballot closes.
- Distinct, accessible color treatments may use green for “go” and red for “no-go,” alongside persistent text labels.
