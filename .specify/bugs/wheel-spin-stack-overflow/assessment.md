# Bug Assessment: Wheel of Names Spin Shows Stack Overflow

- **Slug**: wheel-spin-stack-overflow
- **Created**: 2026-11-21
- **Source**: pasted text + screenshot
- **Verdict**: likely valid, needs reproduction
- **Severity**: medium

## Report (verbatim or summarized)

> “Can you check if wheelofnames is working properly, I provided my api key and it seems the endpoint is reaching as it show 200 but the response is what you see in the screenshot.”

The screenshot shows an active Round 1 with four games remaining. After attempting to spin, the facilitator UI displays “Maximum call stack size exceeded” and still offers “Spin the roulette.”

## Symptom

The local Next.js server-action POST returns HTTP 200 with a Flight error payload, but the facilitator sees a stack-overflow error instead of the animation and selected game. The round remains at four games, suggesting the draw was not committed; whether a separate Wheel of Names request was made and the database state are unverified.

## Reproduction

1. Open a live Go Force session with four games remaining in Round 1 and configure the provider key server-side.
2. Click **Spin the roulette**.
3. The local server-action response is HTTP 200 with `Maximum call stack size exceeded`; the UI shows four games still remaining.
## Suspected Code Paths

- `apps/web/src/components/go-force/facilitator-session.tsx:30-49` — the draw form renders an error returned in action state.
- `apps/web/src/features/go-force/game-actions.ts:26-63` — `drawGoForceSelection` validates the facilitator/session and returns caught spin errors to the UI.
- `apps/web/src/features/go-force/wheel-of-names-client.ts:51-98` — sends the provider request and parses/validates its animation and winner response.
- `apps/web/src/features/go-force/game-actions.ts:65-84` — commits the winner and then broadcasts/revalidates; confirm whether execution reached this stage.
- `apps/web/src/components/go-force/admin-controls.tsx:87,131` — separate React console warning: these annual-game Server Action forms specify `encType` even though React manages it.

## Root Cause Hypothesis

The most likely source is the whole-string base64 regular expression in `wheel-of-names-client.ts:22`, applied by the Zod response schema at line 25 to the provider's animation. I reproduced `Maximum call stack size exceeded` in Node 22.16 by testing that exact regex—and the exact Zod schema—against a 5 MB animation string. `drawGoForceSelection` catches that exception and returns its message as action state; the database RPC is later in the flow, which explains why no selection row was found. The user's actual animation length is not yet known, so the code path is reproduced but the specific provider payload is not. **Confidence: high for the code-level cause; medium for this occurrence.**

## Proposed Remediation

**Preferred**: Replace whole-string regex validation of the multi-megabyte animation with stack-safe, bounded validation (for example, iterative/chunked character and padding checks plus an explicit size limit). Keep the winner's ID/title validation unchanged. Normalize unexpected validation errors into a recoverable user message and record a server-side stage/correlation ID without logging the API key or animation. Confirm the provider's animation length using a length-only diagnostic, not by sharing the base64 body.

**Alternatives** (optional):
- If the provider response shape is the trigger, adapt the parser to the actual documented response while continuing to require both a valid animation and a winner matching the current pool.
- If the error occurs after commit during broadcast/revalidation, make the UI refresh committed state rather than inviting a potentially confusing retry.
- Separately, remove explicit `encType` from the annual-game forms that use Server Action functions; React supplies the encoding. This should clear the console warning, but the facilitator `DrawForm` does not set `encType`, so it is not a likely cause of this spin failure.

**Files likely to change**:
- `apps/web/src/features/go-force/wheel-of-names-client.ts`
- `apps/web/src/features/go-force/game-actions.ts`
- `apps/web/src/components/go-force/facilitator-session.tsx`
- `apps/web/src/components/go-force/admin-controls.tsx` (for the separate form warning)
- `apps/web/tests/unit/go-force/wheel-of-names-client.test.ts`
- `apps/web/tests/e2e/go-force-session.spec.ts`

**Tests to add or update**:
- Mock a 200 provider response and verify valid animation/winner data reaches commit and reveal.
- Validate multi-megabyte valid and malformed base64 strings without throwing a stack overflow; verify malformed responses produce a recoverable error and no selection.
- Verify failed commit/provider paths leave the remaining-game count unchanged, while a committed winner is not retried as an unselected game.
- Verify annual-game file uploads still work after removing explicit `encType` from Server Action forms, and check those forms no longer emit the React warning.

## Risks & Considerations

- Do not log or return the API key, provider authorization headers, or the potentially large base64 animation.
- Verify whether a selection was committed before recommending a retry; otherwise the displayed count may be stale.
- No database migration is indicated by the current evidence; first determine whether the failure is in provider parsing, the database transition, or post-commit refresh.

## Follow-up Evidence

- **Supplied URL**: `http://localhost:3000/admin/go-force/sessions/1fa6b7dd-12f5-4b2f-b44b-144987482192`
- **Host**: `localhost`
- **URL policy**: `auto-refused: loopback host`; the endpoint was not fetched.
- The request payload contains Next.js Server Action metadata and a Go Force `sessionId`. The response shown is `1:{"error":"Maximum call stack size exceeded"}` in a Flight stream. This is an application-action response, not evidence of a successful Wheel of Names API response.
- The screenshot also contains an action-key field; its value is intentionally not recorded here.
- The user checked the database and found no selection record for the session, confirming that no `go_force_selections` row was committed.
- The React warning points to annual-game forms in `admin-controls.tsx`; the facilitator draw form in `facilitator-session.tsx:44` has no `encType`. Treat the warning as a separate frontend cleanup, not the established cause of the stack overflow.
- In the local Node 22.16 environment, the exact `BASE64_PATTERN` from `wheel-of-names-client.ts` and the response Zod schema both throw `Maximum call stack size exceeded` on a synthetic 5 MB animation string. This is a code-level reproduction; the user's actual animation length and bytes were not inspected.
- On 2026-11-22, the user supplied Next dev logs showing the local action `POST` returned HTTP 200 in 7.0s and `drawGoForceSelection` took 6942ms, with about 7.0s attributed to application code. This duration is consistent with a server-side provider call followed by validation, but does not establish provider status or animation length.

## Open Questions

- [NEEDS CLARIFICATION: What was the server-side Wheel of Names response status, animation character length, and whether `winner.id`/`winner.text` were present? The local Flight response's HTTP 200 does not answer this. Share only these metadata, not the animation or API key.]
