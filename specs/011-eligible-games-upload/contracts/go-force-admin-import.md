# Go Force Annual-Game Import Contract

## Roles and Location

- Only a signed-in account authorized to manage Go Force may import annual games.
- The import controls appear in the existing Go Force admin experience beside the annual eligible-game list and manual add form.
- The manual add form remains available for individual entries.

## JSON Format

The file root is a non-empty array containing records for exactly one GOTY year:

```json
[
  {
    "title": "Example Game",
    "gotyYear": 2026,
    "eligibilityState": "eligible",
    "displayOrder": 1,
    "developer": "Example Studio",
    "publisher": "Example Publisher",
    "genre": "Adventure",
    "coverArtUrl": "https://example.com/cover.jpg"
  }
]
```

`title` and `gotyYear` are required. `eligibilityState` defaults to `eligible`; `displayOrder` defaults to the record's one-based position. The remaining descriptive fields are optional. Valid values follow the existing annual-game form: title 1–200 characters, year 2000–2100, eligibility `eligible` or `ineligible`, display order 0–10,000, developer/publisher up to 160 characters, genre up to 120 characters, and an HTTP(S) cover-art URL up to 2,048 characters. Files are limited to 512 KiB and 500 records.

## Interaction

1. The admin selects a JSON file. The interface checks its size and parses its structure.
2. The admin reviews the year, entries, normalized/default values, number to add, and duplicate findings before saving.
3. If any record is invalid, confirmation is disabled and the affected record positions and reasons are shown.
4. Duplicate titles within the file and titles already present for that year are identified and excluded from additions. Matching trims surrounding whitespace and ignores letter case.
5. The admin explicitly confirms the additions. The interface submits the original JSON text; the server independently checks admin authorization, file size, structure, every record, and the single-year rule, then adds all non-duplicate records as one atomic batch.
6. Success feedback reports added and skipped counts; the annual list refreshes. A save conflict or other persistence error reports that nothing from the batch was saved and asks the admin to refresh and review again.
7. Cancelling, leaving the review, or selecting invalid input does not change the annual list.

## Security and Consistency

- Browser-provided file contents and parsed values are untrusted; the server receives and validates the original JSON text before writing.
- The write uses the existing authenticated admin boundary and annual-game uniqueness rule.
- The import never updates or removes an existing annual entry.
- Started sessions keep their existing annual-game snapshot after an import.
- No public API, external service, or permanent import-history record is introduced.
