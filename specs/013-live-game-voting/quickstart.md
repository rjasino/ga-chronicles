# Quickstart: Live Game Voting

This guide validates late-player addition, live updates, vote presentation/privacy, and the facilitator advancement card. It complements [the data model](./data-model.md) and [the interaction contract](./contracts/live-game-voting.md).

## Prerequisites

- Node.js 24 and the dependencies installed for `apps/web`.
- The repository's supported Supabase CLI and a running local Supabase stack.
- Local development environment values configured using the existing `apps/web/.env.example` conventions. Do not use or commit production credentials.
- Seeded local accounts for an admin/game master and at least two active player accounts.
- For browser tests, Chromium installed for Playwright. Its configuration starts the web application and Wheel of Names mock server.

## Run automated validation

From `apps/web`:

```powershell
npm run supabase:start
npm run supabase:reset
npm run test:database
npm run test:unit -- tests/unit/go-force
npm run typecheck
npm run lint
```

Run the focused browser and accessibility flows:

```powershell
npm run test:e2e -- tests/e2e/go-force-live-player.spec.ts
npm run test:e2e -- tests/e2e/go-force-realtime.spec.ts
npm run test:e2e -- tests/e2e/go-force-advancement-summary.spec.ts
npm run test:e2e -- tests/e2e/go-force-session.spec.ts
npm run test:e2e -- tests/e2e/go-force-accessibility.spec.ts
```

The browser configuration starts the local Next.js development server and the Wheel of Names mock automatically when `PLAYWRIGHT_BASE_URL` is not set. If tests use an already-running environment, set `PLAYWRIGHT_BASE_URL` according to the existing test setup.

## End-to-end scenarios

1. **Late addition during an open game ballot**: Start a session with an existing player, open a selection, and add a second active account before the voting deadline. Verify the roster refreshes without a page reload and the new player can vote once using the existing round quota.
2. **No retroactive participation**: Close one selection, add another player before a later selection, and verify the earlier result is unchanged. In the facilitator history, the late player is marked as not yet joined—not abstained—for the earlier selection. Their vote opportunities begin with eligible ballots after joining.
3. **Late addition during the final ballot**: Add a participant before the final-ballot deadline and verify they can submit one finalist choice. Closing the ballot does not require that participant to have a Round 3 “go” when they had no Round 3 ballot opportunity.
4. **Validation and authorization**: Verify duplicate additions, inactive accounts, a full roster, terminal sessions, and unauthorized actors are rejected without changing the roster. Verify concurrent duplicate requests produce one membership.
5. **Realtime updates and privacy**: Use separate player and facilitator browser contexts. Submit a vote or add a participant and verify connected views update automatically. Before close, each player can see only their own choice, the facilitator sees progress counts without individual choices, and no Realtime payload contains vote data. After close, verify the facilitator breakdown and any player-facing group aggregate.
6. **Advancement summary**: Close ballots with zero, one, and multiple “go” votes. Verify the current open ballot is excluded; qualifying games show exact counts as “Advancing so far”; after round completion the confirmed games remain visible through the next round transition; a round with no qualifiers shows its empty state.
7. **Accessible vote styling**: Verify “Go” and “No-go” are labeled, use consistent distinct colors, and remain distinguishable in grayscale and light/dark themes. Run the existing axe scan and keyboard/mobile checks on the active ballot and facilitator card.

## Realtime latency rehearsal

For a representative roster (up to 64 participants), record the time from a committed player vote or roster change to the refreshed state on connected player and facilitator screens. The acceptance target is at least 95% of observations within 2 seconds without manual refresh. Include a reconnect/focus cycle to verify that a view catches up after a missed broadcast.

## Expected outcomes

- Database tests confirm the add-player authorization/state guard, unique roster and order, ballot eligibility cutoffs, no historical abstention backfill, vote privacy, and join-aware completion totals.
- Unit tests confirm view summaries, vote labels, eligible-voter progress counts, and provisional/confirmed advancement state.
- Browser tests confirm the same user journeys from independent player and facilitator sessions.
- Accessibility checks pass with visible text labels and no color-only meaning.
