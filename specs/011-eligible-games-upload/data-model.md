# Data Model: Eligible Games JSON Upload

## Scope

The import adds records to the existing annual-game collection. The selected file and review are temporary workflow data; this feature does not persist an import job or batch record.

## Entities

### Annual Game Entry (existing)

Represents one game associated with a GOTY year.

- **Fields**: `gotyYear`, `title`, `eligibilityState`, `displayOrder`, optional `developer`, `publisher`, `genre`, and `coverArtUrl`; the stored record also has its existing identity and timestamps. These are the import/form names for the corresponding annual-game values.
- **Validation**: title is trimmed, required, and at most 200 characters; GOTY year is an integer from 2000 through 2100; eligibility is `eligible` or `ineligible`; display order is an integer from 0 through 10,000; developer/publisher are at most 160 characters; genre is at most 120 characters; cover-art URL is optional, at most 2,048 characters, and uses HTTP or HTTPS.
- **Uniqueness**: title is unique within a GOTY year after trimming and case folding. An import preserves the existing record and does not overwrite it.
- **Relationships**: a started session may reference the annual entry and stores a separate title/year snapshot. Later annual-list changes do not change that session snapshot.

### Game Import File (transient)

Represents one selected JSON document before import.

- **Fields**: `fileBytes` (file size in bytes), `records` (the parsed record array), and `gotyYear` (the single year identified across the records).
- **Shape**: `records` is a non-empty JSON array of game-entry objects. Each record includes `title` and `gotyYear`; it may include `eligibilityState`, `displayOrder`, `developer`, `publisher`, `genre`, and `coverArtUrl`.
- **Defaults**: omitted `eligibilityState` is `eligible`; omitted `displayOrder` is the record's one-based position in the file; omitted optional descriptive fields are blank/null.
- **Validation**: `fileBytes` is at most 524,288; `records` contains 1–500 entries; all entries identify the same `gotyYear`; all record values satisfy Annual Game Entry validation.
- **Lifecycle**: selected → parsed and validated → reviewed → confirmed or cancelled. No annual data changes before confirmation.

### Import Review (transient)

Represents the information presented before confirmation.

- **Fields**: `records` (parsed entries), `invalidRecords` (record positions and validation findings), `duplicateRecords` (duplicate positions and titles), `addCount`, and `skipCount`.
- **Validation**: confirmation is unavailable when `invalidRecords` is non-empty. Rows in `duplicateRecords` are reported and skipped; valid non-duplicate records remain eligible to add. `addCount` and `skipCount` reflect the review outcome.
- **Lifecycle**: created after client-side parsing, then submitted for server-side revalidation when the admin confirms; discarded after confirmation or cancellation.

## Import Rules

1. The import is restricted to an authorized Go Force admin.
2. One file may only describe one GOTY year.
3. Invalid input prevents the entire import; the user corrects the file and starts review again.
4. Duplicate titles in the file and titles already in the annual list are reported and skipped.
5. Confirmed new records are inserted together. A database write conflict fails the batch atomically and is reported for a fresh review; it never overwrites an existing record.
6. Annual-game writes do not update any existing session-game snapshot.
