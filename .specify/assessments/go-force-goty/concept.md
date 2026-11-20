# Concept: Go Force GOTY selection

- **Slug**: go-force-goty
- **Created**: 2026-11-20
- **Recommended option**: Guided live-session module

## Options

### Option A — Community-tool pilot
- **Sketch**: Run the first selection event with existing community tools and a manually maintained results page. The game master coordinates the roulette and round transitions, while players use the agreed voting channel. This can test whether the format works before committing to a site module.
- **Appetite**: small (days of preparation; no custom software build)
- **Trade-offs**: Fast and inexpensive to try, but voting, vote limits, round transitions, and result records rely on manual coordination. It may be harder to reach the 80% vote-completion target and reproduce the process consistently.
- **Rabbit holes**: Manual vote counting, duplicate or missed votes, and reconciling the live event with the published results afterward.

### Option B — Facilitator-assisted site page
- **Sketch**: Add a focused Go Force page for a live event. Players cast votes through their own screens, while the game master manually advances the selection and round. The page provides a shared view of the outcome and a post-event results page, with more of the session coordination still handled by the facilitator.
- **Appetite**: small (days), assuming the existing site can support a shared live session without substantial new work
- **Trade-offs**: Keeps the experience in the site and reduces manual vote collection, while limiting the amount of process automation. The game master remains responsible for keeping the roulette, round state, and vote limits aligned.
- **Rabbit holes**: Facilitator mistakes, player reconnection during a live event, and disagreements about whether a round or vote allowance is complete.

### Option C — Guided live-session module
- **Sketch**: Provide a guided Go Force session for a fixed group of players. The game master runs the roulette; the session follows the three rounds and their decreasing `go` allowances, presents the final ballot, and makes the voting history, round results, and GOTY outcome available on a separate page after the show.
- **Appetite**: medium (weeks); confidence is limited because the site's existing support for shared live sessions is unknown
- **Trade-offs**: Best fit for a repeatable annual event, the 80% required-vote completion target, and a clear record of how the GOTY result was reached. It requires more work and careful handling of incomplete votes, empty shortlists, and the visibility of player-level results.
- **Rabbit holes**: Defining the denominator for 80% completion, handling a round with no games advancing, resolving disconnects or abandoned votes, and deciding when individual votes appear on the shared screen.

## Recommendation

Recommend **Option C — Guided live-session module**. It supports the owner-directed goal of establishing a repeatable GOTY event and results portfolio, accommodates a group whose size is fixed at session start, and provides the clearest path to the 80% required-vote completion target. The user wants it ready before the user-reported December 10, 2026 event date; the medium appetite and new live-update integration make the schedule tight, so keep the first release focused.

## Out of Scope (for the recommended option)

- Building a video game or automating the admin's annual game curation.
- Asynchronous participation or admitting players after the session starts.
- Requiring a single winner when the final ballot is tied.
- Publishing the separate results page before the live selection process ends.
- Supporting general streaming or Discord features beyond the Go Force session context.

## Assumptions to Validate

- Empty Round 1 or Round 2 shortlists stop that session without a result; the game master starts a fresh session.
- The 80% completion target is calculated across expected session votes; missing votes count as abstentions, and every player must use the Round 3 `go`.
- Players use existing Game Ako accounts; individual votes are shown on the shared facilitator screen after a selection closes.
- The existing site supports database-backed admin content changes without redeployment; live session updates remain a new integration that needs a rehearsal.
- Current audience demand is not a prerequisite for the owner's content investment; the goal is to create demand.
- Go Force is expected to be ready before the user-reported December 10, 2026 event date; this deadline is tight relative to the medium appetite.