# Bug Assessment: Go Force admin settings and game saves

- **Slug**: go-force-admin-save
- **Created**: 2026-11-21
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> Fix the following issue: public page visibility does not keep the state of the checkbox, keep the state so we know if the page is visible or not. check the saveGoForceVotingSettings function it seems like there is not payload to it hence saving timer duration settings is failing. When saving a new game is not working, can you check the cover art image size limit or any payload mismatch.

## Evidence

- Screenshot 1 shows the visibility checkbox unchecked while the success message says **The Go Force page is visible.**
- Screenshot 2 shows both timer values at 10 seconds and the error **The Go Force voting timers could not be saved.**
- Screenshot 3 shows the game form reporting **The game cover art could not be uploaded. Try again.**
- The attempted migration push fails at statement 37 with `ERROR: column "final_ballot_seconds" does not exist (SQLSTATE 42703)` in the `UPDATE public.go_force_sessions` that backfills final-ballot deadlines.

## Symptom

The visibility form reports a successful save but displays an unchecked box, and the admin receives save errors for timer settings and cover upload. The schema migration also fails before completing, so the timer and game fields/bucket may not exist in the running database; game creation still fails even without a cover. The checkbox should reflect the saved visibility, timer settings should persist, and valid game data and cover art should save.

## Reproduction

1. As an admin, save the public-page visibility setting and observe that the success message says the page is visible while the checkbox is unchecked.
2. Save the timer settings and observe **The Go Force voting timers could not be saved.**
3. Add a game with cover art and observe **The game cover art could not be uploaded. Try again.** The screenshot does not establish whether game creation succeeds without cover art.
4. Run `supabase db push` and observe the migration fail at statement 37 because `final_ballot_seconds` is referenced as though it were a column on `go_force_sessions`.

## Suspected Code Paths

- `apps/web/src/components/go-force/admin-controls.tsx:25-35` — the visibility control uses `defaultChecked`, so it is uncontrolled after its initial mount; a save/revalidation may not reliably synchronize the displayed checkbox with the persisted server value.
- `apps/web/src/features/go-force/admin-actions.ts:19-35` — saves page visibility and revalidates the layout and Go Force routes.
- `apps/web/src/components/go-force/admin-controls.tsx:38-73` and `apps/web/src/features/go-force/admin-actions.ts:37-59` — timer form field names and parsing correspond, and the action includes an explicit update payload for both durations; this contradicts the report’s suspicion that no payload is sent.
- `apps/web/src/components/go-force/admin-controls.tsx:76-153` and `apps/web/src/features/go-force/admin-actions.ts:61-122` — game form uses multipart encoding, matching field names, a metadata payload, and optional cover upload. The screenshot’s upload error is returned when Supabase Storage rejects the upload.
- `apps/web/src/features/go-force/admin-schemas.ts:4-40` — validates optional metadata, HTTP(S) cover URLs, and 5–600 second timer values.
- `supabase/migrations/0012_go-force-voting-details.sql:4-58` — adds the timer columns, game metadata columns, and `go-force-covers` bucket/policies needed by the failing actions.
- `supabase/migrations/0012_go-force-voting-details.sql:554-556` — backfill references unqualified `final_ballot_seconds` in an update of `go_force_sessions`, where that column does not exist; it belongs to `go_force_page_settings`.
- `apps/web/src/features/go-force/game-covers.ts:1-2`, `supabase/migrations/0012_go-force-voting-details.sql:31-58`, and `apps/web/next.config.ts:7-9` — configure a 10 MiB cover bucket/upload limit and an 11 MiB Server Action body limit. These limits appear aligned.
- `apps/web/tests/e2e/go-force-admin.spec.ts:13-65` — covers visibility changes, metadata, URL art, and upload, but does not verify checkbox state after save/reload or timer-setting persistence.

## Root Cause Hypothesis

The migration failure is a confirmed root cause for the timer and game-save failures: the backfill at line 555 reads `final_ballot_seconds` from the target `go_force_sessions` row instead of `go_force_page_settings`, preventing migration `0012` from completing. Consequently, the new timer/game columns and cover bucket may not be installed; this explains the timer update error, cover upload rejection, and game inserts failing even with no cover because the action includes the new metadata columns. Separately, the visibility checkbox is uncontrolled (`defaultChecked`) and can retain/reset to its initial value when the server action refreshes the form, matching the contradictory screenshot. The timer action already has a payload, and the upload size limits align. Confidence: high for the save failures; medium for the checkbox state behavior.

## Proposed Remediation

**Preferred**: Fix the migration backfill to read `final_ballot_seconds` from `go_force_page_settings` (for example, using that table in the `UPDATE ... FROM`), then successfully apply migration `0012_go-force-voting-details.sql`. This should create the columns required by timer/game writes and the bucket/policies required by cover uploads. Make the visibility checkbox controlled by persisted state (or remount it from the refreshed server value), so it agrees with the success message and remains correct after reload. The timer action already sends both values; do not add a duplicate payload. If errors remain after migration, log the underlying Supabase error server-side and correct the remaining schema or storage-policy issue.

Add admin E2E coverage for visibility state after save/reload, timer persistence after save/reload, and game saves both with and without cover art. Keep the current upload limits unless a valid file within the advertised limit still fails after verifying bucket configuration.

**Files likely to change**:
- `apps/web/src/components/go-force/admin-controls.tsx`
- `apps/web/src/features/go-force/admin-actions.ts`
- `apps/web/src/features/go-force/admin-schemas.ts`
- `apps/web/src/features/go-force/admin-queries.ts`
- `apps/web/tests/e2e/go-force-admin.spec.ts`
- `apps/web/tests/unit/go-force/admin-schemas.test.ts`
- `supabase/migrations/0012_go-force-voting-details.sql`

**Tests to add or update**:
- Save visibility on and off, check the checkbox against the success message, reload, and confirm it matches the persisted setting.
- Save different round and final-ballot timer values, reload, and confirm both values persist in the database.
- Save a game without cover art and with a valid HTTPS URL; verify the row and optional metadata persist.
- Upload a valid JPEG/PNG/WebP at or below 10 MiB and verify the cover is stored and the game row saves.
- Cover invalid file type, invalid image content, and a file over 10 MiB with a useful validation message.
- Push migration `0012`, then verify timer settings save and games can be added both without a cover and with a valid cover upload.

## Risks & Considerations

- The existing action responses hide the underlying Supabase error for timer and game writes, so the migration/schema-cache state and storage policy should be verified before changing payload fields.
- Re-run the migration in a safe environment before deployment; the current push failure leaves the new Go Force schema and storage bucket unavailable.
- Raising upload limits affects both Supabase Storage and the Next Server Action request limit; keep the limits coordinated.
- Error details should be logged server-side without exposing database internals or credentials to the admin UI.

## Open Questions

None. The provided migration error identifies the blocker; verify game creation after the migration is corrected and applied.
