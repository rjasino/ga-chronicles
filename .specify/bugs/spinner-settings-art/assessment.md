# Bug Assessment: Wheel animation timing and Go Force admin UX

- **Slug**: spinner-settings-art
- **Created**: 2026-11-22
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> bug issue
> - remove the placeholder spinner used prior and just show the wheelofnames spinner instead.
> - don't show the results when wheelofnames spinner is spinning, show it after it stops.
> - show games cover art in the details and selection results.
> - the timer will only start after the animation of spin stops.
> - make the settings more clean, make use of tab to seperate content. page visibility and timer on one tab, annual eligible games, and sessions.
> - on annual eligible tab, make use of table and keep the form for adding. show title, developer, publisher, year and action on the table. action are edit, and delete

**Follow-up clarifications from the reporter**:
- The two attached screenshots identify the facilitator’s active “Voting open” details screen and the closed “Selection result” screen as the places where cover art should appear.
- The spinner behavior is shared across sessions; the reporter tested GOTY 2000, 2001, and 2075.
- “Stop” means reduced motion.
- If the animation fails or is interrupted before completion, continue the process, reveal the result, and start the timer.
- Cover art should also appear on the public results page.
- The annual-games table should include ineligible games, and editing should remain inline.

## Symptom

While a facilitator spins, the UI shows a local placeholder and the selected game is committed before the returned Wheel of Names animation plays in the browser; the selection and its voting deadline can therefore become active during the animation. In the attached active-vote screenshot, the details card shows its no-art fallback; the closed-selection result screen has no cover-art card at all. Go Force administration currently presents visibility, timers, games, and sessions as stacked sections rather than tabs and a table with inline editing.

## Reproduction

The reporter confirms testing sessions for GOTY 2000, 2001, and 2075, but does not provide exact environment or click-by-click steps. Code-grounded checks (not independently reproduced here):

1. Open an active facilitator session with games remaining (the reporter tested GOTY 2000, 2001, and 2075) and start a spin.
2. Observe the local pending placeholder; after the server action returns, the committed selection and provider animation appear. The database deadline is created on selection insertion, before browser playback.
3. Inspect the active-vote details screen and then close a selection. The first screen can show the no-art fallback when no cover URL is available; the closed-selection result summary has no cover-art card.
4. Open `/admin/go-force`: settings are stacked, and annual games are inline-edit list items rather than a table with separate Edit/Delete actions.

[NEEDS CLARIFICATION: confirm whether cover art is also expected on the public results page; the reporter’s screenshots identify the facilitator active-vote and closed-selection screens.]

## Suspected Code Paths

- `apps/web/src/components/go-force/facilitator-session.tsx:50-72` — `DrawForm` renders the pending `RouletteReveal` while the spin action is pending.
- `apps/web/src/components/go-force/roulette-reveal.tsx:16-27` — pending state is a locally drawn wheel placeholder; the provider animation is rendered only in the success state.
- `apps/web/src/features/go-force/game-actions.ts:56-100` — `drawGoForceSelection` waits for the provider response, commits the winner, publishes the update, then returns the animation to the browser.
- `supabase/migrations/0012_go-force-voting-details.sql:78-100` — the selection-insert trigger sets the round-voting deadline immediately, so the deadline precedes browser playback of the returned animation.
- `apps/web/src/components/go-force/facilitator-session.tsx:254-260` and `apps/web/src/components/go-force/game-details-card.tsx:24-46` — the active-vote screen passes the cover-art snapshot to a card, which shows a fallback when no URL is present; the screenshot shows that fallback.
- `apps/web/src/components/go-force/facilitator-session.tsx:115-153` — `VoteBreakdown` for the attached closed-selection screen shows title and votes but no `GameDetailsCard` or cover art.
- `apps/web/src/components/go-force/results-page.tsx:45-78` — the separate public round-selection results also show titles and votes without cover art; whether this surface is in scope is unconfirmed.
- `apps/web/src/components/go-force/admin-controls.tsx:97-188` — annual games are edited in inline list rows; title, year, eligibility, order, developer, and publisher are form fields, not the requested table display with Edit/Delete actions.
- `apps/web/src/components/go-force/admin-controls.tsx:339-433` — page visibility, voting timers, annual games, and sessions are separate stacked sections with no tabs.
- Existing relevant tests: `apps/web/tests/unit/go-force/roulette-reveal.test.tsx`, `apps/web/tests/unit/go-force/game-actions.test.ts`, `apps/web/tests/e2e/go-force-session.spec.ts`, and `supabase/tests/database/go-force-voting-timers.test.sql`.

## Root Cause Hypothesis

The spin flow treats provider animation generation and animation playback as the same phase: the server commits and publishes the winning selection before returning the animation payload, while the browser only starts playing that payload afterward. The database trigger starts the voting deadline on selection insertion, and the UI exposes the committed selection to participants at that point. The active-vote card already supports a cover URL but falls back when none is available; the closed-selection summary has no artwork component. The admin page has not been composed to the requested tabbed/table presentation. **Confidence: high** for these code paths; the cause of the fallback in the reporter’s active-vote screenshot depends on that session’s cover metadata.

## Proposed Remediation

**Preferred**: Separate choosing/presenting a spin from opening voting. Keep the Wheel of Names result authoritative on the server, but return the result animation to the facilitator first and do not publish a live selection or start its deadline until the animation is finished. Then have an authenticated server action commit/revalidate the still-eligible winner and start the deadline atomically, so participants cannot vote during the presentation. Define a reliable completion signal for the provider’s animated image formats; do not rely on an arbitrary client-side delay. Hide the result title and voting UI until that completion/commit transition.

Use the provider animation in place of the local pending wheel, preserving an accessible status announcement and reduced-motion behavior. When reduced motion is requested, skip the animation and treat presentation as complete immediately before revealing the result/opening the timer. If animation loading/playback fails or is interrupted before completion, proceed without it: reveal the result and start the timer. Add the game’s snapshot cover art to the facilitator’s closed-selection result card and the public results page. Verify the active-vote card receives valid snapshot URLs for games that have cover art; retain its fallback when art is absent. Restructure Go Force admin into accessible tabs for page visibility/timers, annual games, and sessions; retain the add form and render all annual games, including ineligible ones, in a table with title, developer, publisher, year, and actions. Keep editing inline, entered through an Edit action, and provide Delete separately. Preserve eligibility and ordering controls in the inline edit form.

**Alternatives**:
- Keep committing immediately but add a server-managed “presentation pending” phase and defer the database deadline until a separate presentation-complete action. This preserves a durable pending spin if the facilitator refreshes, but adds persisted state and recovery/timeout handling.
- Extend the deadline by a known provider animation duration while keeping the current commit flow. This is simpler, but does not by itself prevent the result or voting controls from appearing during playback and depends on trustworthy animation-duration metadata.

**Files likely to change**:
- `apps/web/src/components/go-force/facilitator-session.tsx`
- `apps/web/src/components/go-force/roulette-reveal.tsx`
- `apps/web/src/features/go-force/game-actions.ts`
- `apps/web/src/components/go-force/results-page.tsx`
- `apps/web/src/components/go-force/admin-controls.tsx`
- Related Go Force unit, end-to-end, and database tests

The current selection snapshot already includes cover-art metadata, and the existing database trigger starts the deadline on selection insertion; a separate commit after animation playback may therefore avoid a schema change. A migration is only likely if a persisted pending-spin state is chosen.

**Tests to add or update**:
- Verify the provider animation is shown instead of the placeholder and no title/result, participant voting controls, or countdown is exposed until playback completes; verify reduced-motion mode skips playback and proceeds immediately, and animation failure/interruption reveals the result and starts the timer.
- Verify the database deadline is initialized only after animation completion/selection activation and participants receive the full configured voting duration; retain database-side deadline enforcement.
- Verify a stale or concurrently invalidated winner cannot be committed after the presentation phase.
- Verify the active-vote details card renders supplied cover art and a safe fallback when absent, and the closed-selection result card renders its game’s cover art.
- Verify admin tabs are keyboard accessible; the annual-games table includes eligible and ineligible rows with title, developer, publisher, year, and Edit/Delete actions; adding and inline editing preserve eligibility/order fields and existing server validation.

## Risks & Considerations

- Animated WebP/GIF playback does not necessarily provide a dependable browser “finished” event; reduced-motion should bypass animation, and failed/interrupted playback should use the agreed reveal-and-start-timer fallback.
- Splitting spin preparation from commit introduces a window where the game pool or session can change. The final commit must re-check authorization, active round, and winner eligibility transactionally.
- If a database migration or persisted pending state is chosen, account for abandoned spins and existing sessions; no data migration is otherwise indicated by the report.
- Tabs and a table must retain accessible labels, keyboard navigation, responsive behavior, validation feedback, and the existing add/edit/delete authorization boundaries.
- Cover art URLs are optional and may be unavailable; keep a fallback and avoid making results depend on image loading.

## Open Questions

- None. The reporter clarified the target screens, year coverage, table contents/editing behavior, reduced-motion behavior, public-results artwork, and animation failure/interruption behavior.
