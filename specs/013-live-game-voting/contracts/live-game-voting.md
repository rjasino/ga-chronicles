# Live Game Voting Contract

## 1. Add a player to an active session

**Actor**: An authenticated admin or the session's game master.

**Request**:

- Active Go Force session identifier
- Existing active account identifier to add

**Preconditions**:

- The session status is `live` or `final_ballot`.
- The actor is an admin or the session's game master.
- The account is active, is not already on the roster, and the roster has fewer than 64 participants.

**Success**:

- Exactly one active participant row is appended with the account's session display-name snapshot and the next roster order.
- The database records the join time after serializing against session ballot/roster transitions.
- The participant can access the current session. They may vote on an open game ballot only before its existing deadline and closure; they may vote on the final ballot only before its existing deadline and closure.
- Earlier closed game ballots remain unchanged and do not count as this player's vote opportunities.
- The session's private update signal is published after the change commits, and the local session view is revalidated.

**Failure**:

- Unauthorized actor, non-active session, inactive account, duplicate participant, or full roster: reject without changing the roster.
- A concurrent duplicate request cannot create a second participant or duplicate roster order.

## 2. Game and final-ballot voting

- Each game ballot accepts at most one explicit `go` or `no-go` vote per participant while the session/round is active and the existing voting deadline has not elapsed.
- Existing round-specific “go” limits remain authoritative.
- An open ballot may show a participant their own choice. It must not return other participants' choices or final-ballot remarks to any participant browser.
- While a ballot is open, a facilitator may see submitted/eligible progress counts, but not individual choices. After a game ballot closes, the facilitator may see its individual breakdown.
- A player may see the closed game's aggregate outcome without receiving peer identities or individual vote rows.
- An absent vote row for a closed game means the participant was not eligible; it must not be displayed as an abstention.
- A participant added during the final ballot may submit one finalist choice before its deadline. They are not retroactively required to have cast a Round 3 “go.”

## 3. Realtime session update signal

**Channel**: Existing private per-session topic `go-force:session:{sessionId}`.

**Event**: Existing `session-updated` event.

**Payload**: Session identifier only. Do not include vote choices, voter identities, vote counts, display names, or remarks.

**Delivery rules**:

- Publish only after the corresponding database change commits.
- A publish failure does not roll back the committed action; report it through existing error logging.
- Connected player and facilitator views refresh their authorized persisted session view on receipt and after successful reconnection, so missed events can be reconciled.
- Private-channel access remains restricted to authorized session members and facilitators.

## 4. Facilitator advancement card

- Display closed selections with an `advanced` outcome and their submitted `go` vote counts.
- Exclude an open ballot from the finalized list.
- Show “Advancing so far” for the current active round. When that round completes, show the confirmed list and retain it after the session transitions.
- If a completed round has no qualifying game, show an explicit empty state consistent with the existing no-finalists outcome.
- The card is visible to the admin/game master; it does not reveal per-player open votes.

## 5. Vote-choice presentation

- “Go” and “No-go” must have distinct, consistent semantic colors on choice controls and vote/result summaries.
- Keep the visible words “Go” and “No-go” in all color-coded treatments; color alone is insufficient.
- Abstention uses a neutral treatment and label.
- Validate the existing light and dark themes, grayscale recognition, keyboard use, responsive layout, and automated accessibility scan.
