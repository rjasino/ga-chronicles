# Research: Eligible Games JSON Upload

## Existing Annual-Game Rules

- **Decision**: Use the same field set and constraints as the current annual-game form and `annualGameInputSchema`.
- **Rationale**: The current schema defines the supported values and limits: title 1–200 characters; GOTY year 2000–2100; eligibility `eligible` or `ineligible`; display order 0–10,000; developer and publisher up to 160 characters; genre up to 120 characters; and an optional HTTP(S) cover-art URL up to 2,048 characters. Reusing these rules keeps manual and bulk entry consistent.
- **Alternatives considered**: A reduced format containing only titles was rejected because it would prevent the upload from seeding metadata already supported by the annual list and form.

## Authorization and Persistence

- **Decision**: Use the existing admin screen and an authenticated server action. Validate the complete submitted batch on the server, check the verified session and `canManageGoForce`, filter known duplicates, then insert remaining rows in one database statement.
- **Rationale**: `saveAnnualGame` already uses the verified session, Go Force admin check, server Supabase client, friendly action-state errors, and admin/public route revalidation. A single multi-row insert is atomic in Postgres, so a write failure cannot leave earlier rows from that batch persisted.
- **Alternatives considered**: A public endpoint or client-side database write was rejected because the import changes protected admin content. Sequential per-row inserts were rejected because a mid-batch failure could produce a partial list.

## Duplicate Handling

- **Decision**: Keep title matching case-insensitive and trim-insensitive within the same GOTY year, matching the existing unique index. Report and skip duplicate rows already in the file or present in the annual list; never update an existing row. The database unique index remains the final guard if another admin adds the same game after the review.
- **Rationale**: This is already the manual-entry and database behavior, and preserves existing metadata. If a concurrent insertion causes the final batch write to violate uniqueness, the single statement fails atomically; report a conflict and ask the admin to refresh and review again.
- **Alternatives considered**: Upserting was rejected because it could silently replace existing annual metadata. Replacing the year list was rejected because the requested operation seeds the list and the spec defines it as additive.

## File Review Flow

- **Decision**: Read and parse the selected file for a pre-save review in the admin interface, then submit the original JSON text to the server action only after explicit confirmation. The server action repeats file-size, structural, and field validation and recalculates duplicates before writing.
- **Rationale**: A review makes the effects visible before a bulk operation, while submitting the original text lets the server enforce the byte limit and prevents browser-parsed values from being trusted. No equivalent file-import flow exists in the repository.
- **Alternatives considered**: Saving immediately on selection was rejected because the spec requires review and confirmation. Trusting the browser's parsed data was rejected because all request data is untrusted.

## Input Bounds

- **Decision**: Bound the JSON file to 512 KiB and 500 records, and show these limits before selection and when exceeded. Keep the count high enough for the specified 50-entry success target while bounding preview and server-action payload work.
- **Rationale**: The upload is an annual list, not a general bulk-data pipeline. Explicit caps reduce accidental oversized submissions and keep the import within a predictable request and UI workload.
- **Alternatives considered**: An unbounded upload was rejected because no streaming or background-import service is part of this feature's scope.

## Session Isolation

- **Decision**: Write only annual-game rows and keep existing session-start snapshot behavior unchanged.
- **Rationale**: Starting a session copies eligible annual entries into session-game snapshots. Later annual-list edits do not rewrite those rows, so no session changes are needed.
- **Alternatives considered**: Rebuilding or modifying active-session snapshots was rejected because the established product behavior keeps a started session fixed.
