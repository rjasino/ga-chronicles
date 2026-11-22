# Go Force UI Contract

## Roles

- **Admin**: maintains the annual eligible game list and controls public page visibility.
- **Game master / facilitator**: selects the session roster, starts the session, operates the roulette, closes each selection and ballot, and sees facilitator results.
- **Player**: joins with an existing Game Ako account on the pre-start roster and submits votes from their own screen.
- **Viewer**: watches the stream or Discord share and can read published results after the event.

## Admin Content Controls

- The admin can show or hide the Go Force page.
- The admin can add, edit, or remove eligible games for a GOTY year.
- Changes are saved as site content and do not require a redeployment.
- Starting a session snapshots its eligible games and roster. Later admin edits do not alter that session.
- The admin may control result-page visibility separately from active-session access. Hiding the public page does not block the game master from an active session.

## Live Session Contract

1. Before the session starts, the game master confirms the player roster and GOTY year.
2. Starting the session locks the roster and eligible-game snapshot. No late participants can join.
3. The game master operates the roulette for the current round. Each title can be selected once per round.
4. Each player submits one `go` or `no-go` per selected game. Player screens do not reveal another player's current vote.
5. The game master closes voting for a selected game. Any missing vote becomes an abstention, not a `no-go`.
6. After voting closes, the facilitator's shared screen displays group results and each player's vote. The next state follows the persisted session outcome.
7. A title advances if at least one player votes `go`.

## Round Rules

| Round | Maximum `go` per player | Additional rule |
|---|---:|---|
| 1 | 3 | Unused `go` allowances are forfeited when the round ends. |
| 2 | 2 | Uses only Round 1 titles that advanced; unused `go` allowances are forfeited. |
| 3 | 1 | Each player must use their one `go`; games with at least one `go` become finalists. |

- A round ends after every title in that round's roulette has been selected once.
- If no titles advance from Round 1 or Round 2, the session stops without a GOTY result; the game master must start a fresh session.

## Final Ballot and Publication

- The final ballot includes every Round 3 finalist.
- Each player may submit one finalist vote and an optional remark. A missing ballot at close is an abstention.
- Every title tied for the highest vote count is a GOTY co-winner; no runoff is held.
- The session is complete only if at least 80% of expected game-vote and final-ballot opportunities were submitted and every player used the Round 3 `go`.
- Only completed sessions have a results page. After the event, the admin controls whether that page is publicly visible.
- The results page contains the vote history, round results, finalists, GOTY winner(s), and submitted remarks.

## Error and Recovery Behavior

- A player's missing vote is counted as an abstention when the game master closes that selection or ballot.
- A session below the 80% threshold is incomplete and has no published GOTY result.
- A session that stops with no Round 2 or Round 3 pool is not silently resumed or converted to a GOTY result; the game master starts a fresh session.
- Reconnecting players resume at the current session state; a closed vote cannot be changed.