# Bug Assessment: Go Force round voting feedback and controls

- **Slug**: go-force-round-voting
- **Created**: 2026-11-24
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

The report lists these issues in Go Force:

- No summary at the end of each round.
- Show players the Go-vote quota and usage for every round, including future rounds.
- Allow timed voting or manual vote closing, while retaining configurable durations.
- The configured timer may not be used in the tested stage; defer this report until the relevant timer behavior has been tested.
- Replace the requirement that every rostered player cast a Round 3 Go with a configurable minimum number of Round 3 Go voters (default 2).
- The final-ballot 80% expected-vote behavior has not been tested because the session has not reached the final ballot; defer changes to that behavior until it can be reproduced.

## Symptom

Facilitators and players do not have all requested round-by-round results and vote-quota feedback, and there is no setting to choose manual versus timed closing. The observed Round 3 behavior requires every rostered player to cast a Go, so players who abandon before the round ends can prevent progress even when the configured minimum of players remains. The user clarified that a reason belongs to the final ballot, not Round 3; the final ballot already has an optional remark field, so this is not a Round 3 bug. Both final-ballot completion behavior and the timer report are deferred until tested in the relevant stage.

## Reproduction

1. Run a live Go Force session and inspect the facilitator and player views as rounds complete. Confirm whether summaries are expected on both views and whether they should include every completed round.
2. Inspect player quota and usage displays during a live session, including rounds that have not started. The current player view reports the current round's remaining count only.
3. During Round 3, have fewer than all rostered players cast a Go while at least two do. The current logic can mark the session `incomplete_vote_threshold` instead of advancing.
4. After reaching the relevant timed-voting stage, configure the duration to 60 seconds and verify the stored deadline and close behavior. [DEFERRED: this has not yet been tested in the user's run.]

These steps are inferred from the report and code paths; this assessment did not execute a live database session.

## Suspected Code Paths

- `apps/web/src/features/go-force/round-advancement-summary.ts:7` — builds a summary for the latest completed round and active round, rather than retaining summaries for every completed round.
- `apps/web/src/components/go-force/facilitator-session.tsx:334` — renders the advancement summary on the facilitator view only.
- `apps/web/src/components/go-force/player-session.tsx:21` and `:182` — shows remaining Go votes while voting in the active round; it does not show remaining counts for each round.
- `apps/web/src/features/go-force/session-queries.ts:343` — calculates Go votes used for the current round only.
- `apps/web/src/features/go-force/types.ts:34` and `apps/web/src/features/go-force/admin-schemas.ts:48` — represent configurable durations but no timed/manual mode setting.
- `supabase/migrations/0012_go-force-voting-details.sql:78` — assigns each selection a deadline from `round_voting_seconds`; this code applies to selections across rounds, so the reported Round 3 timer failure needs reproduction against the deployed schema and settings.
- `supabase/migrations/0015_go-force-live-player-voting.sql:303` — the Round 3 `missing_go` check requires every eligible participant with an opportunity to have a submitted Go vote; an abstention therefore does not satisfy it.
- `apps/web/src/features/go-force/rules.ts:70` and `supabase/migrations/0015_go-force-live-player-voting.sql` — the 80% expected-vote threshold is part of final-ballot completion, but the user has not reached that stage; this behavior is unverified and deferred.
- `apps/web/tests/unit/go-force/round-advancement-summary.test.ts` and `supabase/tests/database/go-force-voting-timers.test.sql` — existing tests cover summary-building and timer behavior but should be extended for the reported view and Round 3 cases.

## Root Cause Hypothesis

Confidence: **medium**. The current implementation provides partial facilitator-side summaries and active-round remaining-vote feedback, but does not meet the broader round-by-round/player-view requests. Timed voting is currently unconditional: selection deadlines are set using the shared round duration, and the current settings model has no manual-mode toggle; the reported timer failure is deferred because it has not been tested in the relevant stage. The reported Round 3 failure is grounded in the strict every-player Go requirement. The agreed fix for this stage is a configurable minimum Round 3 Go-voter quorum, default 2, replacing that all-roster requirement. Whether the final-ballot 80% expected-vote check causes a separate publication bug is unknown because the session has not reached that stage; defer changing it until tested. The Round 3 reason request is withdrawn; reasons/remarks belong to the final ballot.

## Proposed Remediation

**Preferred**: Preserve a summary for every completed round and render the appropriate summary on both facilitator and player views. Extend player session data to expose Go-vote quota and usage for every round, including future rounds, while retaining the current active-round vote feedback. Add a validated timed/manual setting; in manual mode, do not rely on an automatic deadline to close voting, while keeping facilitator-authorized manual close available. Add a configurable minimum number of Round 3 Go voters, defaulting to 2, and use it instead of requiring every rostered player to cast a Go. Leave timer behavior and the final-ballot 80% expected-vote rule unchanged until those stages have been tested. No Round 3 reason field is needed; the existing optional final-ballot remark is the relevant input.

Investigate the 60-second timer against a database with the latest migrations and a confirmed `round_voting_seconds = 60` setting before changing timer logic. If it reproduces there, add a Round 3-specific regression test and correct the deadline assignment or expiration flow.

**Files likely to change**:

- `apps/web/src/features/go-force/round-advancement-summary.ts`
- `apps/web/src/features/go-force/session-queries.ts`
- `apps/web/src/features/go-force/types.ts`
- `apps/web/src/components/go-force/facilitator-session.tsx`
- `apps/web/src/components/go-force/player-session.tsx`
- `apps/web/src/features/go-force/admin-schemas.ts`
- `apps/web/src/features/go-force/admin-actions.ts`
- `apps/web/src/components/go-force/admin-controls.tsx`
- `apps/web/src/features/go-force/game-actions.ts`
- `apps/web/src/features/go-force/rules.ts`
- `supabase/migrations/` — add the Round 3 Go quorum setting and update round completion logic; timer mode may require additional schema/RPC changes
- `apps/web/tests/unit/go-force/`
- `supabase/tests/database/`

**Tests to add or update**:

- Verify completed-round summaries remain available and are shown on the intended facilitator/player views.
- Verify each player sees the correct remaining Go-vote count for every round after votes are recorded.
- Verify quota/usage for current and future rounds is displayed correctly in the player view.
- After testing the relevant stage, verify timed mode enforces the configured duration and manual mode does not close automatically while still permitting authorized facilitator closure.
- Verify the minimum Round 3 Go-voter setting defaults to 2 and is configurable.
- Verify Round 3 is blocked below the configured number of distinct Go voters and advances when the quorum is reached, even if other rostered players abstain or are absent.
- After reaching the final ballot, test the 80% expected-vote calculation with continuing and absent players before deciding whether to change it.

## Risks & Considerations

- The Round 3 quorum changes when a session can advance. Preserve explicit abstain data rather than rewriting votes as no-go. Keep final-ballot completion behavior out of scope until it is reproduced.
- Timed/manual mode must be enforced in database functions as well as the UI so client-side settings cannot bypass vote deadlines or close authorization.
- Keep the final-ballot 80% and timer reports deferred until those stages are tested; current code inspection alone does not reproduce either symptom.

## Open Questions

- [DEFERRED: Verify the final-ballot 80% expected-vote rule after reaching that stage; do not change it based only on the current Round 3 report.]
- [DEFERRED: Test the configured timer in the relevant stage before treating the timer report as a confirmed bug.]
