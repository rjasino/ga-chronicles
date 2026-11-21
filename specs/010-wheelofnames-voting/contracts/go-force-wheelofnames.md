# Go Force–Wheel of Names Integration Contract

## Roles and Trust Boundaries

- **Game master / facilitator**: initiates a roulette spin for the active Go Force round.
- **Player**: sees the selected title and may vote only after Go Force commits that selection.
- **Go Force server**: holds the provider API key, calls the spin endpoint, validates the winner, and requests the authorized database transition.
- **Wheel of Names API**: supplies the roulette selection and animation; it does not own Go Force sessions, player identity, ballots, or results.

## Configuration and Credential Handling

- Add `WHEEL_OF_NAMES_API_KEY=` to `apps/web/.env.example` as a blank placeholder.
- The real credential is supplied separately in a local ignored environment file or deployment secret store.
- Use the key only in server-side requests with the documented `x-api-key` header. Do not prefix it with `NEXT_PUBLIC_`, serialize it into page props, include it in browser bundles, or log its value.
- Use API v3 at `https://wheelofnames.com/api/v3`.

## Spin Request

- **Operation**: `POST /wheels/animate`.
- **Authorization**: server-side `x-api-key`.
- **Request**: `WheelConfig` with one entry per current-round remaining game. Give each entry its session-game UUID as `id` and its snapshotted title as `text`. Set `autoRemoveWinner` to `true`.
- **Source of entries**: query/reconstruct the current candidate pool from Go Force session and selection records for every spin; do not trust a cached provider list as authoritative.
- **No fallback**: do not choose a winner locally if the provider is unavailable.

## Spin Response and Commit

1. Parse the provider response using the documented response format. Prefer the JSON/base64 animation response so animation and winner metadata are handled together.
2. Require a completed animation and winner entry with a recognized ID.
3. Map the winner ID to the active round's remaining session-game snapshot and confirm its text matches the snapshot.
4. Call the authorized Go Force database transition with that session-game ID. The database rechecks that the caller is the facilitator, the session/round are active, no ballot is currently open, and the game remains eligible and unselected.
5. Only after the database commit succeeds, reveal the selected title to players, enable the existing ballot, and publish the session update. The facilitator view shows the provider-generated animation and selected title.
6. The next request is built from the new remaining pool. The provider's `autoRemoveWinner` behavior is enabled for the result animation; no persistent provider wheel mutation is assumed.

## Player Contract

- Before a successful provider response is validated and committed, the player screen shows no current selected game and offers no ballot for that draw.
- After commit, every active player sees the same selected game and the existing `go` / `no-go` ballot.
- Existing vote privacy, vote limits, timeout/abstention, advancement, final-ballot, and results rules remain unchanged.

## Error and Recovery Behavior

- Missing API key, provider timeout/error, malformed response, missing winner, unknown ID, title mismatch, or database rejection creates no Go Force selection and opens no player ballot.
- Show a recoverable error to the facilitator. Keep the current pool unchanged and allow a retry.
- Reject a provider result that is not in the database-derived active-round candidate set.
- Prevent another spin while a ballot is open. The interface disables the action while a request is pending; the database remains the authoritative concurrency guard.
- If a provider result is valid but persistence fails, do not reveal it to players or treat it as selected. A retry reconstructs the request from the unchanged database state.

## External Documentation

- [Wheel of Names v3 OpenAPI spec](https://stoplight.io/api/v1/projects/wheelofnames/wheelofnames/nodes/wheelofnames-v3.yaml)
- [Create a spin animation from a WheelConfig](https://wheelofnames.stoplight.io/docs/wheelofnames/8ouudl3snoyu7-create-a-spin-animation-from-a-wheel-config)
- [Wheel of Names FAQ: API](https://wheelofnames.com/faq#api)

The v3 operation documents an `animation` and `winner` response; the FAQ describes the separate embed `postMessage` interface, which this server-side flow does not require.
