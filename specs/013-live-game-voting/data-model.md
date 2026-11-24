# Data Model: Live Game Voting

## Existing entities extended by this feature

### Go Force Session

The existing live GOTY session remains the authority for roster, rounds, ballots, and results.

| Field | Meaning |
|---|---|
| `id` | Session identifier used by authorized session reads and private update signals. |
| `game_master_id` | Account allowed to manage this session, in addition to admins. |
| `status` | Existing lifecycle: `ready`, `live`, `final_ballot`, `complete`, `stopped_no_finalists`, or `incomplete_vote_threshold`. Late additions are accepted only in `live` or `final_ballot`. |

Session status transitions remain unchanged. Closing the final ballot moves the session to its existing terminal state, after which roster additions are rejected.

### Go Force Round

| Field | Meaning |
|---|---|
| `round_number` | Round number from 1 through 3. |
| `status` | `pending`, `active`, or `complete`. |
| `go_limit` | Existing per-participant “go” limit; must equal `4 - round_number` (3, 2, then 1). |

The advancement card uses the round status to distinguish provisional results in an active round from confirmed results in a completed round.

### Session Participant

An existing participant row represents one account's membership in one session.

| Field | Meaning |
|---|---|
| `session_id` | Session joined. |
| `account_id` | Active account identity; unique within the session. |
| `display_name_snapshot` | Non-empty, trimmed name (1–80 characters) displayed in this session's roster and closed vote history. |
| `roster_order` | Unique, positive order within the session. |
| `active` | Existing eligibility state used by session access and vote rules. |
| `created_at` | Database-recorded join time. Existing initial roster rows are created before start; a late entrant's row is created when added. |

**Validation and state rules**

- Only an authenticated admin or the session's game master may add a participant.
- A player may be added only to a `live` or `final_ballot` session and must have an active account.
- The account must not already be in the session; the existing `(session_id, account_id)` primary key remains the final duplicate guard.
- The existing roster limit is 64. Additions preserve the participant's display-name snapshot and next available roster order.
- The session row is locked while validating and assigning the order. Record the join time after acquiring the lock so it orders correctly against ballot closure.
- A participant added during an open final ballot may submit that ballot. They do not acquire a retroactive Round 3 vote opportunity.

### Game Selection and Game Vote

A selection and its participant vote rows define both the result and the vote opportunities that existed.

| Entity / field | Meaning |
|---|---|
| `GameSelection.selected_at` | Time the selection opened for voting. |
| `GameSelection.voting_deadline_at` | Existing time limit for accepting a game vote. |
| `GameSelection.voting_closed_at` | Existing time at which voting was closed. |
| `GameSelection.advancement_outcome` | Existing outcome: `pending`, `advanced`, or `eliminated`. |
| `GameVote.selection_id` | Selection receiving this vote. |
| `GameVote.participant_account_id` | Participant with a vote opportunity for this selection. |
| `GameVote.choice` | `go`, `no-go`, or `abstain`. |
| `GameVote.submitted_at` | Non-null for an explicit player choice; null for a generated abstention. |
| `GameVote.closed_at` | Existing ballot closure timestamp. |

**Eligibility and history rules**

- A player can vote on the current game only if they are added before the ballot's existing deadline and before it is closed. The existing vote action continues to enforce the deadline.
- At close, add an abstention for each active participant who was on the roster when the selection opened, or who joined before the effective cutoff (the earlier of the deadline and ballot closure; use the close time if no deadline exists).
- A closed selection with no row for a participant means the participant was not eligible for it. It is not an abstention.
- The existing `(selection_id, participant_account_id)` uniqueness rule continues to enforce at most one vote row per participant and selection.
- Each participant still has at most one vote per selection, and “go” quotas remain per participant and round.
- Round 3's required “go” applies to participants with at least one eligible Round 3 selection row. A participant added during the final ballot has no such opportunity and is not failed for lacking a Round 3 “go.”

### Final Ballot Vote

The existing one-row-per-session-participant final ballot remains in place.

| Field | Meaning |
|---|---|
| `session_id` | Session whose final ballot is being answered. |
| `participant_account_id` | Participant submitting the one final choice. |
| `finalist_game_id` | Selected finalist; null for a missing ballot/abstention. |
| `remark` | Optional participant remark, limited to 500 characters. |
| `submitted_at` | Non-null when the participant submitted a finalist choice; null for a missing ballot. |
| `closed_at` | Time the final ballot was closed. |

- A participant added while the session is in `final_ballot` and before its existing deadline is eligible to submit one vote before the ballot closes.
- The existing `(session_id, participant_account_id)` uniqueness rule remains in force; a submitted choice requires a valid finalist and a non-null `submitted_at`.
- At final ballot closure, create a missing abstention only for a participant who was on the roster at closure.
- Preserve the existing optional remark and finalist validation.
- The existing 80% completion metric uses the count of eligible game-vote rows plus eligible final-ballot rows as its denominator. Its numerator remains rows with a non-null `submitted_at`. This prevents earlier closed selections from being charged to a late entrant.

### Round Advancement Summary

This is a derived facilitator view, not a new persisted entity.

- Derive entries from closed selections in a round whose outcome is `advanced`.
- Display each game's exact submitted “go” vote count; exclude open ballots and games with zero “go” votes.
- While the current round is active, label its entries “Advancing so far.”
- Retain the most recently completed round's confirmed list after the session advances, and show the current active round's provisional list separately when it has closed ballots.
- If no game qualifies in a completed round, show a clear empty state. Do not change the existing stop/no-finalist behavior.

## Read boundaries and realtime updates

- Individual open game-vote choices and final-ballot choices/remarks must not be sent to a participant browser. A participant can read their own current choice.
- An authorized facilitator may receive a submitted/eligible count while a ballot is open, without receiving individual choices. After the game ballot closes, the facilitator may see its individual breakdown.
- A closed game aggregate may be shown to players without exposing voter identities or peer vote rows.
- The existing private `session-updated` broadcast remains an invalidation signal containing the session ID only. Each client refreshes its view through its normal authorization and RLS rules.
- Aggregate progress and closed-result counts are derived from persisted vote rows; the broadcast does not carry counts, choices, names, or remarks.
