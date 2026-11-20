# Go Force Quickstart and Validation

## Prerequisites

- Node.js 24.x.
- Docker and the Supabase CLI for the local database and Realtime service.
- Local environment values from Supabase CLI for the variables in `apps/web/.env.example`.
- Test admin and player accounts following the repository's existing account fixtures.

## Local Setup

From the repository root:

```powershell
npx supabase start
npx supabase status
Copy-Item apps/web/.env.example apps/web/.env.local
```

Fill `apps/web/.env.local` with the local Supabase URL, public key, server-only service role key, and site URL shown by the local setup. Keep the service role key server-side and out of source control.

Apply local migrations and seed data, then install and run the web app:

```powershell
npx supabase db reset
npm --prefix apps/web install
npm --prefix apps/web run dev
```

## Automated Validation

Run from the repository root:

```powershell
npm --prefix apps/web run test:unit
npm --prefix apps/web run test:database
npm --prefix apps/web run test:e2e
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
```

Expected outcome: rule tests cover round limits, advancement, abstentions, 80% completion, empty shortlists, and tied winners; database tests verify admin and player access boundaries; end-to-end tests complete the admin, live-session, and results flows.

## End-to-End Scenarios

1. **Admin content changes**: sign in as admin; hide/show the Go Force page; add/edit/remove an annual game; verify each change is visible without a redeployment. Start a session, then edit the list and confirm the active session still uses its original snapshot.
2. **Three-round session**: prepare a roster and eligible list; start the session; draw each title once per round; verify per-player `go` quotas of 3, 2, and 1, unlimited `no-go`, and advancement on at least one `go`.
3. **Vote privacy and abstentions**: keep player selections hidden while a ballot is open; close a ballot with one player missing; verify that vote is an abstention and the facilitator screen shows group results and each player's vote.
4. **Empty shortlist**: arrange for no game to advance from Round 1 or Round 2; verify the session stops without a result and a fresh session is required.
5. **Final ballot and results**: have every player use their Round 3 `go`; submit one final vote per player and optional remarks; verify a tie yields co-winners and a completed session publishes a separate results page only when the admin makes it visible.
6. **Completion threshold**: verify completed sessions have at least 80% of expected game and final-ballot votes submitted, and that sessions below the threshold remain incomplete.
7. **Live rehearsal**: repeat the session with the invited roster; record join time, update latency, and reconnection recovery as the performance baseline before the public livestream.