# Feature Specification: Go Force GOTY

**Feature Branch**: `N/A`

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Create the Go Force feature on the Ako Chronicles blog site to run a live, three-round Game of the Year selection. Players join through Discord and vote on games selected by the game master. Admins can manage page visibility and the eligible game list without redeployment. The event streams to the Game Ako channel, and results are published on a separate page after the event. Go Force must be ready before the owner-reported December 10, 2026 show date."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run the live GOTY selection (Priority: P1)

The game master starts a live session with a fixed roster of players. The game master operates the roulette while each player submits `go` or `no-go` votes from their own screen. The session progresses through three rounds, then players vote for the GOTY finalists.

**Why this priority**: The live selection is the core activity and produces the annual GOTY outcome.

**Independent Test**: Run a session with a prepared eligible game list and a fixed roster, complete the three rounds and final ballot, and verify that the system records the finalists and one or more GOTY winners according to the voting rules.

**Acceptance Scenarios**:

1. **Given** an eligible list and a confirmed player roster before the session starts, **When** the game master starts the session, **Then** the player group is fixed and no new player can join that session.
2. **Given** a round has eligible games remaining, **When** the game master operates the roulette, **Then** one game is selected and cannot be selected again in that round.
3. **Given** a selected game is awaiting votes, **When** each player submits one `go` or `no-go`, **Then** the session records each player's vote and enforces that player's remaining `go` allowance for the round.
4. **Given** voting for a selected game is closed, **When** the results are displayed, **Then** the game master's shared screen shows group results and each player's vote, and the game advances if at least one player voted `go`.
5. **Given** every game in a round has been selected, **When** the round ends, **Then** unused `go` allowances are forfeited and the next round uses only games advanced from the completed round.
6. **Given** Round 3 is in progress, **When** the round is completed, **Then** every player has used exactly one `go` vote and games with at least one `go` become GOTY finalists.
7. **Given** the final ballot is open, **When** each player casts one vote for a finalist and may enter a remark, **Then** the game or games with the highest vote count are recorded as GOTY winner(s), including co-winners in a tie.
8. **Given** a player has not voted when the game master closes a selection or final ballot, **When** the vote closes, **Then** that missing vote is recorded as an abstention and does not count as `no-go`.
9. **Given** no games advance from Round 1 or Round 2, **When** the round ends, **Then** the session stops without a GOTY result and the game master can start a fresh session.

---

### User Story 2 - Maintain page visibility and eligible games (Priority: P1)

The admin manages whether the Go Force page is visible and maintains the annual eligible game list through the site's admin experience. These content changes take effect without requiring a redeployment.

**Why this priority**: The event depends on current-year content, and the admin needs to manage it as editorial data rather than as a code release.

**Independent Test**: As an admin, change page visibility and update the annual list; verify the changes are reflected on the site without a redeployment.

**Acceptance Scenarios**:

1. **Given** an admin is managing the page, **When** they change its visibility, **Then** the page follows the selected visible or hidden state.
2. **Given** an admin is maintaining an annual eligible game list, **When** they add, edit, or remove a game, **Then** the current list reflects that change without redeployment.
3. **Given** a session has started, **When** the admin changes the eligible list, **Then** the active session continues with the list and player roster captured when it started.

---

### User Story 3 - Review and publish GOTY results (Priority: P2)

After the live show and voting process are complete, the admin makes a separate results page available so players and the Game Ako audience can review how the GOTY outcome was reached.

**Why this priority**: A public record supports the content purpose of the event and preserves its result beyond the livestream.

**Independent Test**: Complete a session, publish its results page after the event, and verify that the page shows the vote history, round results, finalist list, final outcome, and submitted remarks.

**Acceptance Scenarios**:

1. **Given** the session has not completed its final ballot, **When** a viewer visits the results page, **Then** the session's final results are not presented as complete.
2. **Given** the live process and final ballot are complete, **When** the results page is made visible, **Then** it shows the vote history, round results, final shortlist, GOTY winner or co-winners, and submitted remarks.
3. **Given** the admin hides the results page, **When** a viewer visits its public address, **Then** the results are not publicly visible.

### Edge Cases

- No games advance from Round 1 or Round 2. The session stops without a GOTY result, and the game master must start a fresh session.
- One or more players do not submit a vote before the game master closes a selection or final ballot; missing votes count as abstentions. A session is complete only if at least 80% of expected vote opportunities were submitted and every player used their Round 3 `go`.
- The admin changes the eligible list after the live session starts; the active session continues using its original list.
- A final ballot tie produces multiple co-winners rather than triggering a runoff.
- The admin hides the page while an event is underway; active participants still need access to the session.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow an authorized admin to set the Go Force page as visible or hidden.
- **FR-002**: The system MUST allow an authorized admin to add, edit, and remove eligible game entries for a year without requiring redeployment.
- **FR-003**: The system MUST keep a started session's eligible game list and player roster fixed for the duration of that session.
- **FR-004**: The system MUST allow the game master to start a live session with a defined player roster; the roster MUST be closed to new participants after the session starts.
- **FR-005**: The system MUST let the game master operate the roulette to select an eligible game from the active round.
- **FR-006**: The system MUST prevent a game from being selected more than once within the same round.
- **FR-007**: For each selected game, the system MUST allow each player to submit one `go` or `no-go` vote. If the game master closes voting before a player submits, the system MUST record an abstention for that player.
- **FR-008**: The system MUST limit each player's `go` votes to three in Round 1 and two in Round 2; `no-go` votes are not limited by these allowances.
- **FR-009**: In Round 3, the system MUST require every player to use exactly one `go` vote; `no-go` votes remain available for other selections.
- **FR-010**: The system MUST advance a game to the next round when at least one player votes `go` for it.
- **FR-011**: A round MUST end after every game in that round's roulette has been selected once. Any unused `go` allowance for that round MUST be forfeited.
- **FR-012**: The system MUST use only games advanced from the prior round as the next round's roulette entries.
- **FR-013**: The facilitator's shared screen MUST display both group results and each player's vote after voting for the selected game is closed. Player screens MUST not reveal other players' votes while votes are being submitted.
- **FR-014**: The system MUST provide a final ballot containing all Round 3 finalists, allow each player one vote, and allow a player to submit an optional remark with that vote. If the game master closes the final ballot before a player submits, the system MUST record an abstention for that player.
- **FR-015**: The system MUST declare all games tied for the highest final-ballot vote count as GOTY co-winners; it MUST NOT require a runoff.
- **FR-016**: The system MUST provide a separate results page that is made available after the live event is complete and that displays vote history, round results, finalists, GOTY winner(s), and submitted remarks.
- **FR-017**: The admin MUST be able to control the visibility of the results page independently of the active session.
- **FR-018**: The system MUST calculate vote completion across all expected game votes and final-ballot votes in a session. Missing votes count as abstentions. A session meets the minimum completion threshold only when at least 80% of expected vote opportunities have been submitted and every player has used their Round 3 `go`.
- **FR-019**: The system MUST preserve completed session results when the admin later edits the annual eligible game list.
- **FR-020**: If no games advance from Round 1 or Round 2, the system MUST stop the session without a GOTY result and allow the game master to start a fresh session.

### Key Entities *(include if feature involves data)*

- **Eligible Game**: A game the admin has included for consideration in a particular GOTY year.
- **Player**: A participant included in a session roster before the session begins.
- **Go Force Session**: One live GOTY selection event with a fixed roster, an eligible game list, and a completion state.
- **Round**: One stage of a session, with its own game pool and per-player `go` allowance.
- **Game Vote**: A player's `go` or `no-go` decision for a selected game, with its session, round, and player context.
- **Final Ballot**: Each player's single selection from the Round 3 finalists, with an optional remark.
- **GOTY Result**: The game or tied games declared winners by the final ballot.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of completed sessions produce at least one named GOTY winner; ties may produce multiple winners.
- **SC-002**: At least 80% of expected game-vote and final-ballot opportunities are submitted in every session marked complete; every player also uses their required Round 3 `go`.
- **SC-003**: 100% of completed sessions have a separate results page available after the event, containing vote history, round results, finalists, and winner(s).
- **SC-004**: Admin changes to page visibility and eligible game content are reflected on the site without a redeployment.
- **SC-005**: In post-event feedback, players and viewers can describe how the finalists and winner(s) were determined; baseline and satisfaction target are not yet established.
- **SC-006**: Go Force is ready for the planned live session before December 10, 2026, the event date supplied by the owner.

## Assumptions

- The admin's existing site role is sufficient to manage page visibility, annual game entries, and results publication.
- A player is represented by one unique participant identity in the session roster; the join and identity method follows existing site conventions.
- Individual votes are hidden on player screens while a selected game's voting is open. After it closes, the facilitator's shared screen displays both the aggregate outcome and each player's vote.
- The 80% minimum is calculated across all expected game-vote and final-ballot opportunities. Missing votes count as abstentions; a session below 80% remains incomplete.
- The game master can access the active session even when the public page is hidden.
- If no games advance from Round 1 or Round 2, that session is incomplete and has no published GOTY result.
- Submitted final-ballot remarks appear on the post-session results page.
- An active session remains tied to the annual game list and player roster that were in effect when it started.
- The December 10, 2026 readiness target comes from the owner's event context; the official schedule could not be independently verified.