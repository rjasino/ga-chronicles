# Quickstart: Wheel of Names Voting

## Prerequisites

- Node.js 24.x and npm.
- Local Supabase configuration for the repository.
- A Wheel of Names API v3 key for a real provider-backed spin. The user will supply this value; do not commit it.

## Local Setup

1. Copy `apps/web/.env.example` to `apps/web/.env.local`.
2. Configure the existing Supabase values.
3. Set `WHEEL_OF_NAMES_API_KEY` in `.env.local` to the supplied development key. Keep the key server-side; never add it to a `NEXT_PUBLIC_` variable or browser configuration.
4. Start the local database and web application:

   ```sh
   npm --prefix apps/web run supabase:start
   npm --prefix apps/web run supabase:reset
   npm --prefix apps/web run dev
   ```

5. Sign in as an admin, create a Go Force session with multiple eligible games and a player roster, then start the session.

## Validation Scenarios

### Automated tests (provider mocked)

```sh
npm --prefix apps/web run test:unit
npm --prefix apps/web run test:database
npm --prefix apps/web run typecheck
npm --prefix apps/web run test:e2e
```

Verify that tests cover:

- Only the game master/admin can request a provider spin.
- Each request contains only games in the current round's remaining pool, with stable session-game IDs and automatic winner removal enabled.
- A provider winner must match both an ID and title in the current pool.
- The database does not create a selection for a failed, malformed, stale, or out-of-pool result.
- A successful selection is persisted exactly once; a title cannot be selected twice in one round.
- Voting remains unavailable before commit and opens for the same title on all player screens after commit.
- API credentials are not returned to browser clients or included in client bundles.

### Provider-backed facilitator rehearsal

1. Configure the supplied API key in the local server environment and open the facilitator screen.
2. Confirm the generated wheel includes only games eligible for the active round.
3. Start a spin. Confirm the spin animation is shown and players cannot vote before the result is committed.
4. Confirm that after a valid result is committed, facilitator and player screens show the same game and the ballot becomes available.
5. Submit and close votes using the existing Go Force flow.
6. Confirm the next spin request excludes the selected game, while the annual eligible-game list remains unchanged.
7. Simulate a provider timeout or invalid result. Confirm no selection is committed, no player ballot opens, and the facilitator can retry.

Record provider response/spin completion and player update timings during rehearsal. The expected roster, rather than an invented universal concurrency target, is the performance baseline.
