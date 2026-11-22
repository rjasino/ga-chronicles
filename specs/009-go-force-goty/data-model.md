# Data Model: Go Force GOTY

## Scope

This is a conceptual data model for the feature; it defines information and relationships, not database implementation.

## Entities

### Annual Game Entry

Represents a title the admin includes for a GOTY year.

- **Identity**: one game entry.
- **Fields**: game title, GOTY year, administrative visibility/eligibility state, display order, timestamps.
- **Validation**: title is required; an entry belongs to one year; only eligible entries can be included in a new session.
- **Relationships**: referenced by one or more session game snapshots and selections.

### Go Force Page Settings

Controls whether the public Go Force page is visible.

- **Fields**: page visibility, last editor, last updated time.
- **Validation**: only an authorized admin may change visibility.
- **Relationships**: applies to the public Go Force experience; does not prevent the game master from accessing an active session.

### Session

Represents one live GOTY event.

- **Fields**: GOTY year, game master account, lifecycle status, start and completion times, vote completion percentage, visibility/publication status.
- **Status values**: `ready`, `live`, `final_ballot`, `complete`, `stopped_no_finalists`, `incomplete_vote_threshold`.
- **Relationships**: has a fixed roster, a snapshot of its eligible games, three rounds, game selections, ballots, and zero or more final winners.
- **Validation**: roster and eligible-game snapshot cannot change after start; at most one active session per GOTY year is assumed for v1.

### Session Participant

Represents one authenticated player in a session roster.

- **Fields**: session, account identity, display-name snapshot, roster order, active status.
- **Validation**: account appears at most once in a session; roster is closed when the session starts.
- **Relationships**: contributes game votes and one final-ballot vote or abstention.

### Session Game Snapshot

Preserves the eligible titles used by a session even if the admin later edits the annual list.

- **Fields**: session, source annual-game entry, title snapshot, source year.
- **Validation**: created from eligible entries when the session starts; remains unchanged for that session.
- **Relationships**: games appear in Round 1 and may reappear in later rounds if advanced.

### Round

Represents one of the three stages.

- **Fields**: session, round number (1–3), status, `go` limit per participant (3, 2, or 1), start and end times.
- **Relationships**: contains the round's game pool, selections, and votes.
- **Validation**: rounds begin in order; unused `go` allowances are forfeited when a round ends.

### Game Selection

Represents one game drawn from a round's roulette.

- **Fields**: round, session game snapshot, selection order, selection time, voting-close time, advancement outcome.
- **Validation**: a game can be selected no more than once in the same round; it advances when at least one participant votes `go`.
- **Relationships**: has one expected game vote opportunity per participant.

### Game Vote

Represents one participant's vote for one selected game.

- **Fields**: selection, participant, choice (`go`, `no-go`, or `abstain`), submitted/closed time.
- **Validation**: at most one submitted choice per participant per selection; `go` is limited to three in Round 1, two in Round 2, and exactly one per participant in Round 3; `no-go` is not quota-limited. Missing votes become abstentions when the game master closes voting.
- **Visibility**: individual votes are hidden on player screens until selection close; the facilitator screen then shows individual and group results.

### Final Ballot Vote

Represents one participant's choice among the Round 3 finalists.

- **Fields**: session, participant, selected finalist (or abstention), optional remark, submitted/closed time.
- **Validation**: no more than one submitted vote per participant; a missing vote at ballot close is an abstention.
- **Relationships**: tallies determine one or more GOTY winners; all top-vote ties are co-winners.

### GOTY Result

Represents the final outcome for a session.

- **Fields**: session, winner game or games, final vote totals, result-page visibility and publication time.
- **Validation**: a completed session has at least one Round 3 finalist, meets the 80% session-wide submitted-vote threshold, and each participant has spent their Round 3 `go`.
- **Relationships**: one session may produce multiple winners in a tie.

## Session State Transitions

```text
ready -> live -> final_ballot -> complete
             |                    |
             |                    +-> incomplete_vote_threshold
             +-> stopped_no_finalists
```

- `ready -> live`: game master starts the session; roster and eligible list are frozen.
- `live -> stopped_no_finalists`: Round 1 or Round 2 ends with no advancing games; the session has no GOTY result and a fresh session is required.
- `live -> final_ballot`: all three rounds finish with at least one finalist and each player has used the Round 3 `go`.
- `final_ballot -> complete`: final vote closes and at least 80% of expected vote opportunities were submitted.
- `final_ballot -> incomplete_vote_threshold`: final vote closes below the 80% minimum; no result page is published.
- `complete`: result page may be shown or hidden by the admin independently of the session record.

## Relationships Summary

- One **Annual Game Entry** may appear in multiple **Session Game Snapshots** over time.
- One **Session** has many **Session Participants**, one game snapshot set, three ordered **Rounds**, and one final ballot.
- One **Round** has many unique **Game Selections**; each selection has one **Game Vote** opportunity per participant.
- One **Session** has one or more **GOTY Results** only when completed; a tie permits multiple winning games.