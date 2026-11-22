# Bug Assessment: Previous Selection Result Remains Visible During Roulette Spin

- **Slug**: go-force-spin-display
- **Created**: 2026-11-22
- **Source**: pasted text and supplied screenshot
- **Verdict**: valid
- **Severity**: low

## Report (verbatim or summarized)

The screenshot shows a Wheel of Names spin in progress while the previous “Selection result” card, game, and individual vote breakdown remain visible. The user expects the previous result to be hidden during a new spin. The report also says the selected tab text is not visible and should contrast with the theme.

## Symptom

While the facilitator is spinning the roulette for the next game, the last closed selection result remains on screen and can be mistaken for the current spin’s result. The selected admin tab currently uses the shared toolbar active style (`bg-blue text-white`); the `white` theme token changes to a dark foreground in the dark theme and contrasts with the cyan active background, so the supplied screenshot/code do not confirm that secondary issue.

## Reproduction

1. Open the game-master session screen after a selection has been closed so its `Selection result` card is visible.
2. Start the next roulette spin.
3. Observe that the spin animation/status and the previous closed selection result render together until the new selection is committed.

The supplied screenshot shows this state. The selected-tab text issue is not visible in the screenshot and could not be reproduced from the current theme-token assignments.

## Suspected Code Paths

- `apps/web/src/components/go-force/facilitator-session.tsx:51-111` — `DrawForm` renders the pending/spinning roulette while the next result is prepared.
- `apps/web/src/components/go-force/facilitator-session.tsx:268-317` — the active-round screen renders `VoteBreakdown` independently of the spinner state, so `closingSelection` stays visible during a new draw.
- `apps/web/src/components/go-force/facilitator-session.tsx:151-188` — `VoteBreakdown` renders the prior game, outcome, totals, and individual votes.
- `apps/web/src/components/ui/button.tsx:20` — selected toolbar tabs use `bg-blue text-white`; `text-white` resolves through the theme token defined in `apps/web/src/app/globals.css` and is already theme-sensitive.
- `apps/web/tests/unit/go-force/facilitator-selection-result.test.tsx` — verifies result details display but does not cover hiding that result while a spin is active.
- `apps/web/tests/e2e/go-force-session.spec.ts` — exercises spin and vote flow but does not assert the prior result is hidden during a subsequent spin.

## Root Cause Hypothesis

The facilitator component renders `closingSelection` whenever one exists and does not account for the transient draw state held inside `DrawForm`. As a result, a previous closed selection remains visible underneath the roulette’s pending/spinning presentation. Confidence: high; this follows directly from the render branches and matches the supplied screenshot.

## Proposed Remediation

**Preferred**: Track the draw/spin presentation state at the facilitator screen boundary (or report it from `DrawForm`) and suppress `VoteBreakdown` while the roulette is pending or spinning. Restore the previous result after the spin presentation completes unless a new selection/result has replaced it. Keep the selected tab text token unchanged unless a screenshot of the affected tab state shows a contrast failure; current token mapping is designed for both themes.

**Files likely to change**:
- `apps/web/src/components/go-force/facilitator-session.tsx`
- `apps/web/tests/unit/go-force/facilitator-selection-result.test.tsx` or `apps/web/tests/e2e/go-force-session.spec.ts`

**Tests to add or update**:
- Verify the previous selection result is hidden while the roulette is pending/spinning and is visible again after the spin presentation completes.
- Preserve the current check that a closed selection result displays game art and metadata.

## Risks & Considerations

- Keep the previous result hidden only during the active draw/reveal, not for the rest of voting or the round.
- The selected-tab concern is unconfirmed; changing its existing theme-aware foreground without evidence could reduce contrast in one theme.
- No database, API, or migration changes are expected.

## Open Questions

- [NEEDS CLARIFICATION: If selected-tab text is still unreadable on a particular screen, provide a screenshot of that tab state and theme so its computed foreground/background can be checked.]
