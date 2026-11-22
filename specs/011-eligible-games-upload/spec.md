# Feature Specification: Eligible Games JSON Upload

**Feature Branch**: `011-eligible-games-upload`

**Created**: 2026-11-22

**Completed**: 2026-11-22

**Status**: Done

**Input**: User description: "add a feature to upload a json file to seed my annual eligible games. This is to speed up the process of propagating the list and the form is a manual fallback if you want to add manually."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Seed an annual list from JSON (Priority: P1)

An authorized admin uploads a JSON file containing the games for one GOTY year, reviews the entries, and adds the valid games to the annual list in one operation. This reduces repetitive manual entry while keeping the current form available for individual additions.

**Why this priority**: Bulk setup of the annual list is the primary reason for the feature.

**Independent Test**: Upload a valid file with multiple entries for one year, confirm the review matches the file, then import and verify every entry appears in the annual list with its supplied details.

**Acceptance Scenarios**:

1. **Given** an authorized admin has a valid JSON file for one GOTY year, **When** they select and review the file, **Then** the system shows the parsed game entries and a summary before any entries are saved.
2. **Given** the review shows the intended entries, **When** the admin confirms the import, **Then** the entries are added to that year's annual list and the admin sees a success summary.
3. **Given** the admin needs to add one game after an import, **When** they use the existing manual form, **Then** they can still add an individual entry.

---

### User Story 2 - Resolve invalid or duplicate entries safely (Priority: P2)

An admin gets clear feedback when a file cannot be used as submitted, and can correct the file without accidentally changing existing annual entries.

**Why this priority**: Reliable feedback and safe handling protect the annual list while making bulk entry practical.

**Independent Test**: Try malformed JSON, invalid entries, entries for more than one year, and entries matching existing games; confirm the admin receives actionable feedback and no unintended changes occur.

**Acceptance Scenarios**:

1. **Given** a selected file is not valid JSON or does not follow the accepted format, **When** the system reviews it, **Then** it explains the problem and does not save any entries.
2. **Given** one or more entries have missing or invalid required values, **When** the system reviews the file, **Then** it identifies the affected entries and prevents confirmation until the file is corrected.
3. **Given** the upload contains a game already present for the same GOTY year, **When** the system reviews the file, **Then** it identifies the duplicate and does not create a second copy.
4. **Given** the import is rejected or cancelled, **When** the admin returns to the annual list, **Then** the existing entries remain unchanged.

### Edge Cases

- The file is empty, contains no games, or is too large to process; the admin receives a clear explanation and nothing is saved.
- A game title is repeated within the file or already exists for that year; duplicates are reported and are not added twice.
- Optional game details are absent; the entry remains importable and the missing details stay blank.
- An entry specifies an unsupported year, eligibility state, display order, or malformed optional value; the entry is identified as invalid before import.
- The admin closes or leaves the review before confirming; no entries are saved.
- An import is attempted after a session has started; the session keeps its original snapshot while the annual list reflects any confirmed additions.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST allow an authorized admin to choose a JSON file from the annual eligible-games administration experience.
- **FR-002**: The system MUST accept a JSON array of game records for a single GOTY year. Each record MUST include a title and GOTY year; it MAY include eligibility state, display order, developer, publisher, genre, and cover-art URL, matching the information available for manual entry.
- **FR-003**: The system MUST default an omitted eligibility state to eligible and an omitted display order to the record's one-based position in the file. Omitted optional descriptive values MUST remain blank.
- **FR-004**: The system MUST validate the file structure and every record, including required values, supported value ranges, and the single-year constraint, before allowing the import to be confirmed.
- **FR-005**: Before saving, the system MUST show a review of the parsed records and any validation or duplicate findings, including a count of records to be added.
- **FR-006**: The system MUST prevent duplicate annual entries by title within the same GOTY year, including duplicates already in the file or already on the annual list, without overwriting existing entries.
- **FR-007**: The system MUST add all accepted entries only after the admin confirms the reviewed import; invalid files or cancelled imports MUST leave the annual list unchanged.
- **FR-008**: The system MUST report the result of a confirmed import, including how many entries were added and any duplicate entries skipped.
- **FR-009**: The system MUST retain the existing manual form so an authorized admin can continue to add individual annual game entries.
- **FR-010**: Confirmed changes to an annual list MUST NOT alter the game list already snapshotted by a started session.

### Key Entities _(include if feature involves data)_

- **Annual Game Entry**: A game title associated with a GOTY year, eligibility state, display order, and optional descriptive details; the import creates entries of this same kind as manual entry.
- **Game Import File**: A user-provided JSON array of annual game entries, constrained to one GOTY year per import.
- **Import Review**: A pre-save presentation of parsed entries, validation findings, duplicate findings, and the expected additions for admin confirmation.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An admin can add 50 valid games for one GOTY year in under 2 minutes, excluding time spent preparing the file.
- **SC-002**: 100% of confirmed valid records appear in the selected year's annual list with their supplied values or documented defaults.
- **SC-003**: 100% of malformed files and files containing invalid required values are prevented from changing the annual list, with the cause shown to the admin.
- **SC-004**: 100% of duplicate titles for the same GOTY year are reported and do not create duplicate annual entries.
- **SC-005**: Admins can still add an individual game through the existing manual form after bulk import is available.

## Assumptions

- The import is available only to admins already authorized to maintain annual games.
- One file contains entries for one GOTY year, which makes the target annual list clear before confirmation.
- Bulk import adds entries to the annual list; it does not replace, edit, or remove existing entries.
- A duplicate is determined by title within the same GOTY year, ignoring leading/trailing whitespace and letter case; the existing entry is preserved.
- The accepted field names and value limits follow the existing manual annual-game form. An omitted eligibility state defaults to eligible, and display order defaults to the record's one-based position in the file.
- An already-started session retains the existing eligible-game snapshot when the annual list is later changed.
